//! HTTP Streaming Server for HubRemote
//!
//! Provides local HTTP streaming for media files, enabling Cast to TV functionality.
//! Supports Range requests for video seeking.

use axum::{
    body::Body,
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use parking_lot::RwLock;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use thiserror::Error;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncSeekExt, SeekFrom};
use tokio::sync::oneshot;
use tower_http::cors::{Any, CorsLayer};

#[derive(Error, Debug)]
pub enum StreamError {
    #[error("Server already running")]
    AlreadyRunning,
    #[error("Server not running")]
    NotRunning,
    #[error("Failed to start server: {0}")]
    StartError(String),
    #[error("File not found: {0}")]
    FileNotFound(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// Shared state for streaming server
#[derive(Clone)]
pub struct StreamingState {
    /// Map of stream IDs to file paths
    pub streams: Arc<RwLock<HashMap<String, PathBuf>>>,
}

impl StreamingState {
    pub fn new() -> Self {
        Self {
            streams: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register a file for streaming, returns stream ID
    pub fn register_stream(&self, path: PathBuf) -> String {
        let id = uuid_simple();
        self.streams.write().insert(id.clone(), path);
        id
    }

    /// Get file path for stream ID
    pub fn get_stream_path(&self, id: &str) -> Option<PathBuf> {
        self.streams.read().get(id).cloned()
    }

    /// Remove a stream
    pub fn remove_stream(&self, id: &str) {
        self.streams.write().remove(id);
    }

    /// Clear all streams
    pub fn clear_streams(&self) {
        self.streams.write().clear();
    }
}

impl Default for StreamingState {
    fn default() -> Self {
        Self::new()
    }
}

/// Simple UUID generator (no external dependency)
fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("{:x}", now)
}

/// Streaming server manager
pub struct StreamingServer {
    state: StreamingState,
    shutdown_tx: Option<oneshot::Sender<()>>,
    port: u16,
    local_ip: Option<String>,
}

impl StreamingServer {
    pub fn new() -> Self {
        Self {
            state: StreamingState::new(),
            shutdown_tx: None,
            port: 0,
            local_ip: None,
        }
    }

    /// Start the streaming server
    pub async fn start(&mut self, port: u16) -> Result<(String, u16), StreamError> {
        if self.shutdown_tx.is_some() {
            return Err(StreamError::AlreadyRunning);
        }

        // Get local IP address
        let local_ip = local_ip_address::local_ip()
            .map(|ip| ip.to_string())
            .unwrap_or_else(|_| "127.0.0.1".to_string());

        log::info!("Starting streaming server on {}:{}", local_ip, port);

        let state = self.state.clone();
        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

        // Build router
        let app = Router::new()
            .route("/stream/{id}", get(stream_handler))
            .route("/stream/{id}/{filename}", get(stream_handler_with_filename))
            .with_state(state)
            .layer(
                CorsLayer::new()
                    .allow_origin(Any)
                    .allow_methods(Any)
                    .allow_headers(Any),
            );

        // Bind to address
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        let listener = tokio::net::TcpListener::bind(addr)
            .await
            .map_err(|e| StreamError::StartError(e.to_string()))?;

        let actual_port = listener.local_addr()?.port();

        // Spawn server task
        tokio::spawn(async move {
            axum::serve(listener, app)
                .with_graceful_shutdown(async {
                    let _ = shutdown_rx.await;
                })
                .await
                .ok();
        });

        self.shutdown_tx = Some(shutdown_tx);
        self.port = actual_port;
        self.local_ip = Some(local_ip.clone());

        log::info!("Streaming server started on {}:{}", local_ip, actual_port);
        Ok((local_ip, actual_port))
    }

    /// Stop the streaming server
    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
            self.state.clear_streams();
            self.port = 0;
            self.local_ip = None;
            log::info!("Streaming server stopped");
        }
    }

    /// Check if server is running
    pub fn is_running(&self) -> bool {
        self.shutdown_tx.is_some()
    }

    /// Get server URL
    pub fn get_url(&self) -> Option<String> {
        if let (Some(ip), port) = (&self.local_ip, self.port) {
            if port > 0 {
                return Some(format!("http://{}:{}", ip, port));
            }
        }
        None
    }

    /// Register a file for streaming
    pub fn register_stream(&self, path: PathBuf) -> String {
        self.state.register_stream(path)
    }

    /// Get stream URL for a registered stream
    pub fn get_stream_url(&self, stream_id: &str, filename: Option<&str>) -> Option<String> {
        let base_url = self.get_url()?;
        if let Some(fname) = filename {
            Some(format!("{}/stream/{}/{}", base_url, stream_id, fname))
        } else {
            Some(format!("{}/stream/{}", base_url, stream_id))
        }
    }

    /// Remove a stream
    pub fn remove_stream(&self, id: &str) {
        self.state.remove_stream(id);
    }
}

impl Default for StreamingServer {
    fn default() -> Self {
        Self::new()
    }
}

/// Stream handler with Range request support
async fn stream_handler(
    State(state): State<StreamingState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Response {
    stream_file(state, &id, headers).await
}

/// Stream handler with filename (for better TV compatibility)
async fn stream_handler_with_filename(
    State(state): State<StreamingState>,
    Path((id, _filename)): Path<(String, String)>,
    headers: HeaderMap,
) -> Response {
    stream_file(state, &id, headers).await
}

/// Core streaming logic with Range support
async fn stream_file(state: StreamingState, id: &str, headers: HeaderMap) -> Response {
    // Get file path
    let path = match state.get_stream_path(id) {
        Some(p) => p,
        None => {
            return (StatusCode::NOT_FOUND, "Stream not found").into_response();
        }
    };

    // Open file
    let mut file = match File::open(&path).await {
        Ok(f) => f,
        Err(e) => {
            log::error!("Failed to open file {:?}: {}", path, e);
            return (StatusCode::NOT_FOUND, "File not found").into_response();
        }
    };

    // Get file size
    let metadata = match file.metadata().await {
        Ok(m) => m,
        Err(e) => {
            log::error!("Failed to get file metadata: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to read file").into_response();
        }
    };
    let file_size = metadata.len();

    // Determine content type from extension
    let content_type = get_content_type(&path);

    // Parse Range header
    let range = headers
        .get(header::RANGE)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| parse_range(s, file_size));

    match range {
        Some((start, end)) => {
            // Partial content response
            let length = end - start + 1;

            // Seek to start position
            if let Err(e) = file.seek(SeekFrom::Start(start)).await {
                log::error!("Failed to seek: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, "Seek failed").into_response();
            }

            // Create limited reader
            let stream = create_file_stream(file, length);

            Response::builder()
                .status(StatusCode::PARTIAL_CONTENT)
                .header(header::CONTENT_TYPE, content_type)
                .header(header::CONTENT_LENGTH, length)
                .header(header::ACCEPT_RANGES, "bytes")
                .header(
                    header::CONTENT_RANGE,
                    format!("bytes {}-{}/{}", start, end, file_size),
                )
                .body(Body::from_stream(stream))
                .unwrap()
        }
        None => {
            // Full file response
            let stream = create_file_stream(file, file_size);

            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, content_type)
                .header(header::CONTENT_LENGTH, file_size)
                .header(header::ACCEPT_RANGES, "bytes")
                .body(Body::from_stream(stream))
                .unwrap()
        }
    }
}

/// Create async stream from file
fn create_file_stream(
    file: File,
    length: u64,
) -> impl futures_core::Stream<Item = Result<bytes::Bytes, std::io::Error>> {
    async_stream::stream! {
        let mut file = file;
        let mut remaining = length;
        let mut buffer = vec![0u8; 64 * 1024]; // 64KB chunks

        while remaining > 0 {
            let to_read = std::cmp::min(remaining as usize, buffer.len());
            match file.read(&mut buffer[..to_read]).await {
                Ok(0) => break, // EOF
                Ok(n) => {
                    remaining -= n as u64;
                    yield Ok(bytes::Bytes::copy_from_slice(&buffer[..n]));
                }
                Err(e) => {
                    yield Err(e);
                    break;
                }
            }
        }
    }
}

/// Parse HTTP Range header
fn parse_range(range_header: &str, file_size: u64) -> Option<(u64, u64)> {
    // Format: "bytes=start-end" or "bytes=start-"
    let range = range_header.strip_prefix("bytes=")?;
    let parts: Vec<&str> = range.split('-').collect();

    if parts.len() != 2 {
        return None;
    }

    let start: u64 = if parts[0].is_empty() {
        // Suffix range: "-500" means last 500 bytes
        let suffix: u64 = parts[1].parse().ok()?;
        file_size.saturating_sub(suffix)
    } else {
        parts[0].parse().ok()?
    };

    let end: u64 = if parts[1].is_empty() {
        file_size - 1
    } else {
        parts[1].parse().ok()?
    };

    // Validate range
    if start > end || start >= file_size {
        return None;
    }

    let end = std::cmp::min(end, file_size - 1);
    Some((start, end))
}

/// Get content type from file extension
fn get_content_type(path: &PathBuf) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("mp4") => "video/mp4",
        Some("mkv") => "video/x-matroska",
        Some("mov") => "video/quicktime",
        Some("avi") => "video/x-msvideo",
        Some("webm") => "video/webm",
        Some("m4v") => "video/x-m4v",
        Some("ts") => "video/mp2t",
        Some("mp3") => "audio/mpeg",
        Some("m4a") => "audio/mp4",
        Some("flac") => "audio/flac",
        Some("wav") => "audio/wav",
        Some("ogg") => "audio/ogg",
        _ => "application/octet-stream",
    }
}
