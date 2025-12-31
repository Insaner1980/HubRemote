//! Tauri commands for MPV playback control and streaming
//!
//! These commands are exposed to the frontend for controlling video playback
//! and HTTP streaming for Cast to TV functionality.

use crate::mpv::MpvState;
use crate::mpv_ipc::PlaybackState;
use crate::streaming::StreamingServer;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::State;

/// Response for command results
#[derive(Debug, Serialize)]
pub struct CommandResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> CommandResult<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(msg: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}

impl CommandResult<()> {
    pub fn ok_empty() -> Self {
        Self {
            success: true,
            data: Some(()),
            error: None,
        }
    }
}

/// Options for playing a video
#[derive(Debug, Deserialize)]
pub struct PlayOptions {
    pub url: String,
    pub start_position: Option<f64>,
    pub auth_token: Option<String>,
}

/// Initialize the MPV player (fullscreen with OSC)
#[tauri::command]
pub fn init_player(state: State<MpvState>) -> CommandResult<()> {
    match state.init() {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Play a video from URL
#[tauri::command]
pub fn play_video(state: State<MpvState>, url: String) -> CommandResult<()> {
    // Initialize if needed
    if let Err(e) = state.init() {
        return CommandResult::err(format!("Failed to initialize player: {}", e));
    }

    match state.load_file(&url) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Play a video with options (start position, auth headers)
#[tauri::command]
pub fn play_video_with_options(state: State<MpvState>, options: PlayOptions) -> CommandResult<()> {
    // Initialize if needed
    if let Err(e) = state.init() {
        return CommandResult::err(format!("Failed to initialize player: {}", e));
    }

    let headers: Option<Vec<(&str, &str)>> = options.auth_token.as_ref().map(|token| {
        vec![("X-Emby-Token", token.as_str())]
    });

    match state.load_file_with_options(
        &options.url,
        options.start_position,
        headers.as_deref(),
    ) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Pause video playback
#[tauri::command]
pub fn pause_video(state: State<MpvState>) -> CommandResult<()> {
    match state.pause() {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Resume video playback
#[tauri::command]
pub fn resume_video(state: State<MpvState>) -> CommandResult<()> {
    match state.play() {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Toggle play/pause
#[tauri::command]
pub fn toggle_playback(state: State<MpvState>) -> CommandResult<bool> {
    match state.toggle_pause() {
        Ok(is_paused) => CommandResult::ok(is_paused),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Stop video playback
#[tauri::command]
pub fn stop_video(state: State<MpvState>) -> CommandResult<()> {
    match state.stop() {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Seek to a specific position in seconds
#[tauri::command]
pub fn seek_video(state: State<MpvState>, position: f64) -> CommandResult<()> {
    match state.seek(position) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Seek relative to current position
#[tauri::command]
pub fn seek_video_relative(state: State<MpvState>, offset: f64) -> CommandResult<()> {
    match state.seek_relative(offset) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Set volume (0-100)
#[tauri::command]
pub fn set_volume(state: State<MpvState>, volume: i64) -> CommandResult<()> {
    match state.set_volume(volume) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Get current volume
#[tauri::command]
pub fn get_volume(state: State<MpvState>) -> CommandResult<i64> {
    match state.get_volume() {
        Ok(volume) => CommandResult::ok(volume),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Toggle mute
#[tauri::command]
pub fn toggle_mute(state: State<MpvState>) -> CommandResult<bool> {
    match state.toggle_mute() {
        Ok(is_muted) => CommandResult::ok(is_muted),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Set mute state
#[tauri::command]
pub fn set_mute(state: State<MpvState>, muted: bool) -> CommandResult<()> {
    match state.set_mute(muted) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Get current playback state
#[tauri::command]
pub fn get_playback_state(state: State<MpvState>) -> CommandResult<PlaybackState> {
    match state.get_state() {
        Ok(playback_state) => CommandResult::ok(playback_state),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Get current playback position
#[tauri::command]
pub fn get_position(state: State<MpvState>) -> CommandResult<f64> {
    match state.get_position() {
        Ok(position) => CommandResult::ok(position),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Get total duration
#[tauri::command]
pub fn get_duration(state: State<MpvState>) -> CommandResult<f64> {
    match state.get_duration() {
        Ok(duration) => CommandResult::ok(duration),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Set audio track by index
#[tauri::command]
pub fn set_audio_track(state: State<MpvState>, index: i64) -> CommandResult<()> {
    match state.set_audio_track(index) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Set subtitle track by index (0 or negative to disable)
#[tauri::command]
pub fn set_subtitle_track(state: State<MpvState>, index: i64) -> CommandResult<()> {
    match state.set_subtitle_track(index) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Set playback speed
#[tauri::command]
pub fn set_playback_speed(state: State<MpvState>, speed: f64) -> CommandResult<()> {
    match state.set_speed(speed) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Destroy the player
#[tauri::command]
pub fn destroy_player(state: State<MpvState>) -> CommandResult<()> {
    state.destroy();
    CommandResult::ok_empty()
}

/// Toggle fullscreen mode
#[tauri::command]
pub fn toggle_fullscreen(state: State<MpvState>) -> CommandResult<()> {
    match state.toggle_fullscreen() {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Set fullscreen mode
#[tauri::command]
pub fn set_fullscreen(state: State<MpvState>, fullscreen: bool) -> CommandResult<()> {
    match state.set_fullscreen(fullscreen) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Check if player is fullscreen
#[tauri::command]
pub fn is_fullscreen(state: State<MpvState>) -> CommandResult<bool> {
    match state.is_fullscreen() {
        Ok(fs) => CommandResult::ok(fs),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

// ============================================
// Streaming Server Commands
// ============================================

/// Streaming server state wrapper
pub struct StreamingState(pub Mutex<StreamingServer>);

impl StreamingState {
    pub fn new() -> Self {
        Self(Mutex::new(StreamingServer::new()))
    }
}

impl Default for StreamingState {
    fn default() -> Self {
        Self::new()
    }
}

/// Response for stream creation
#[derive(Debug, Serialize)]
pub struct StreamInfo {
    pub stream_id: String,
    pub stream_url: String,
    pub server_url: String,
}

/// Start streaming server
#[tauri::command]
pub async fn start_stream_server(
    state: State<'_, StreamingState>,
    port: Option<u16>,
) -> Result<String, String> {
    let port = port.unwrap_or(8765);

    // Check if already running
    {
        let server = state.0.lock();
        if server.is_running() {
            if let Some(url) = server.get_url() {
                return Ok(url);
            }
        }
    }

    // Start server
    let result = {
        let mut server = state.0.lock();
        // We need to run the async start in the current runtime
        tokio::runtime::Handle::current().block_on(server.start(port))
    };

    match result {
        Ok((ip, port)) => Ok(format!("http://{}:{}", ip, port)),
        Err(e) => Err(e.to_string()),
    }
}

/// Stop the streaming server
#[tauri::command]
pub fn stop_stream_server(state: State<StreamingState>) -> CommandResult<()> {
    let mut server = state.0.lock();
    server.stop();
    CommandResult::ok_empty()
}

/// Check if streaming server is running
#[tauri::command]
pub fn is_stream_server_running(state: State<StreamingState>) -> CommandResult<bool> {
    let server = state.0.lock();
    CommandResult::ok(server.is_running())
}

/// Get streaming server URL
#[tauri::command]
pub fn get_stream_server_url(state: State<StreamingState>) -> CommandResult<Option<String>> {
    let server = state.0.lock();
    CommandResult::ok(server.get_url())
}

/// Register a file for streaming and get the stream URL
#[tauri::command]
pub fn create_stream(
    state: State<StreamingState>,
    file_path: String,
) -> Result<StreamInfo, String> {
    let server = state.0.lock();

    if !server.is_running() {
        return Err("Streaming server not running. Call start_stream_server first.".to_string());
    }

    let path = PathBuf::from(&file_path);

    // Check if file exists
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    // Get filename for URL (helps TV identify content type)
    let filename = path.file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "video.mp4".to_string());

    // Register stream
    let stream_id = server.register_stream(path);

    // Get URLs
    let stream_url = server.get_stream_url(&stream_id, Some(&filename))
        .ok_or("Failed to get stream URL")?;
    let server_url = server.get_url()
        .ok_or("Failed to get server URL")?;

    Ok(StreamInfo {
        stream_id,
        stream_url,
        server_url,
    })
}

/// Remove a stream
#[tauri::command]
pub fn remove_stream(state: State<StreamingState>, stream_id: String) -> CommandResult<()> {
    let server = state.0.lock();
    server.remove_stream(&stream_id);
    CommandResult::ok_empty()
}

/// Get local IP address
#[tauri::command]
pub fn get_local_ip() -> CommandResult<String> {
    match local_ip_address::local_ip() {
        Ok(ip) => CommandResult::ok(ip.to_string()),
        Err(e) => CommandResult::err(format!("Failed to get local IP: {}", e)),
    }
}
