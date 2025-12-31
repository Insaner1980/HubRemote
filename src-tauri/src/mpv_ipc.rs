//! MPV IPC Client
//!
//! Communicates with mpv player via JSON IPC protocol over named pipe (Windows)
//! or Unix socket (Linux/Mac). This approach works with any mpv version.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use thiserror::Error;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Generate unique pipe name with process ID
fn get_pipe_name() -> String {
    let pid = std::process::id();
    #[cfg(windows)]
    {
        format!(r"\\.\pipe\hubremote-mpv-{}", pid)
    }
    #[cfg(not(windows))]
    {
        format!("/tmp/hubremote-mpv-{}.sock", pid)
    }
}

/// Errors that can occur during MPV IPC operations
#[derive(Error, Debug)]
pub enum MpvIpcError {
    #[error("Failed to start mpv: {0}")]
    StartError(String),

    #[error("Failed to connect to mpv IPC: {0}")]
    ConnectionError(String),

    #[error("Failed to send command: {0}")]
    SendError(String),

    #[error("Failed to receive response: {0}")]
    ReceiveError(String),

    #[error("MPV error: {0}")]
    MpvError(String),

    #[error("MPV not running")]
    NotRunning,

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// Command request to mpv
#[derive(Debug, Serialize)]
struct IpcRequest {
    command: Vec<Value>,
    request_id: u64,
}

/// Response from mpv
#[derive(Debug, Deserialize)]
struct IpcResponse {
    #[serde(default)]
    error: String,
    #[serde(default)]
    data: Value,
    #[serde(default)]
    request_id: u64,
}

/// Playback state information
#[derive(Debug, Clone, Serialize, Default)]
pub struct PlaybackState {
    pub position: f64,
    pub duration: f64,
    pub is_playing: bool,
    pub is_paused: bool,
    pub volume: i64,
    pub is_muted: bool,
    pub filename: Option<String>,
    pub media_title: Option<String>,
}

/// MPV IPC Client
pub struct MpvIpc {
    process: Option<Child>,
    pipe: Option<Arc<Mutex<std::fs::File>>>,
    request_id: AtomicU64,
    pipe_name: String,
}

impl MpvIpc {
    /// Create a new MPV IPC client (not yet connected)
    pub fn new() -> Self {
        Self {
            process: None,
            pipe: None,
            request_id: AtomicU64::new(1),
            pipe_name: get_pipe_name(),
        }
    }

    /// Start mpv process in fullscreen with OSC (on-screen controls)
    pub fn start(&mut self) -> Result<(), MpvIpcError> {
        // Kill any existing process
        self.stop();

        log::info!("Starting mpv with IPC server at {}", self.pipe_name);

        // Build mpv command - fullscreen with OSC
        let mut cmd = Command::new("mpv");
        cmd.arg("--idle=yes")
            .arg(format!("--input-ipc-server={}", self.pipe_name))
            .arg("--vo=gpu")
            .arg("--hwdec=auto-safe")
            .arg("--keep-open=yes")
            .arg("--cache=yes")
            .arg("--demuxer-max-bytes=150MiB")
            .arg("--demuxer-max-back-bytes=75MiB")
            // Fullscreen with OSC
            .arg("--fullscreen=yes")
            .arg("--osc=yes")
            .arg("--title=HubRemote Player");

        cmd.stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());

        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let child = cmd
            .spawn()
            .map_err(|e| MpvIpcError::StartError(format!("Failed to spawn mpv: {}", e)))?;

        self.process = Some(child);
        self.connect_with_retry()?;

        log::info!("mpv started in fullscreen mode with OSC");
        Ok(())
    }

    /// Connect to the IPC socket with retries
    fn connect_with_retry(&mut self) -> Result<(), MpvIpcError> {
        let max_attempts = 50; // 5 seconds total
        let delay = Duration::from_millis(100);

        for i in 0..max_attempts {
            #[cfg(windows)]
            {
                // Try to connect to the named pipe
                match std::fs::OpenOptions::new()
                    .read(true)
                    .write(true)
                    .open(&self.pipe_name)
                {
                    Ok(file) => {
                        self.pipe = Some(Arc::new(Mutex::new(file)));
                        return Ok(());
                    }
                    Err(e) => {
                        if i % 10 == 0 {
                            log::debug!(
                                "Waiting for mpv IPC socket... attempt {}/{}: {}",
                                i + 1,
                                max_attempts,
                                e
                            );
                        }
                    }
                }
            }

            #[cfg(not(windows))]
            {
                match std::os::unix::net::UnixStream::connect(&self.pipe_name) {
                    Ok(file) => {
                        self.pipe = Some(Arc::new(Mutex::new(file)));
                        return Ok(());
                    }
                    Err(e) => {
                        if i % 10 == 0 {
                            log::debug!(
                                "Waiting for mpv IPC socket... attempt {}/{}: {}",
                                i + 1,
                                max_attempts,
                                e
                            );
                        }
                    }
                }
            }

            thread::sleep(delay);
        }

        Err(MpvIpcError::ConnectionError(
            "Timeout waiting for mpv IPC socket".to_string(),
        ))
    }

    /// Stop mpv process
    pub fn stop(&mut self) {
        // Send quit command if connected
        if self.pipe.is_some() {
            let _ = self.command(&["quit"]);
            thread::sleep(Duration::from_millis(100));
        }

        self.pipe = None;

        if let Some(mut child) = self.process.take() {
            let _ = child.kill();
            let _ = child.wait();
        }

        log::info!("mpv stopped");
    }

    /// Check if mpv is running
    #[allow(dead_code)]
    pub fn is_running(&self) -> bool {
        self.pipe.is_some()
    }

    /// Send a command to mpv and get response
    pub fn command(&self, args: &[&str]) -> Result<Value, MpvIpcError> {
        let pipe = self.pipe.as_ref().ok_or(MpvIpcError::NotRunning)?;

        let request_id = self.request_id.fetch_add(1, Ordering::SeqCst);

        let request = IpcRequest {
            command: args.iter().map(|s| json!(s)).collect(),
            request_id,
        };

        let mut json_str = serde_json::to_string(&request)
            .map_err(|e| MpvIpcError::SendError(format!("Failed to serialize: {}", e)))?;
        json_str.push('\n');

        log::debug!("Sending mpv command: {}", json_str.trim());

        // Send command
        {
            let mut pipe_guard = pipe
                .lock()
                .map_err(|e| MpvIpcError::SendError(format!("Lock error: {}", e)))?;

            pipe_guard
                .write_all(json_str.as_bytes())
                .map_err(|e| MpvIpcError::SendError(format!("Write error: {}", e)))?;

            pipe_guard
                .flush()
                .map_err(|e| MpvIpcError::SendError(format!("Flush error: {}", e)))?;
        }

        log::debug!("Command sent, waiting for response...");

        // Read response
        self.read_response(request_id)
    }

    /// Read response for a specific request
    fn read_response(&self, expected_id: u64) -> Result<Value, MpvIpcError> {
        let pipe = self.pipe.as_ref().ok_or(MpvIpcError::NotRunning)?;

        let pipe_guard = pipe
            .lock()
            .map_err(|e| MpvIpcError::ReceiveError(format!("Lock error: {}", e)))?;

        let mut reader = BufReader::new(&*pipe_guard);
        let mut line = String::new();

        // Read lines until we get our response
        for attempt in 0..100 {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => {
                    log::error!("EOF reached while waiting for response");
                    return Err(MpvIpcError::ReceiveError("EOF reached".to_string()));
                }
                Ok(_) => {
                    log::debug!("Received from mpv (attempt {}): {}", attempt, line.trim());
                    // Try to parse as response
                    if let Ok(response) = serde_json::from_str::<IpcResponse>(&line) {
                        if response.request_id == expected_id {
                            if response.error == "success" || response.error.is_empty() {
                                log::debug!("Command successful, data: {:?}", response.data);
                                return Ok(response.data);
                            } else {
                                log::error!("MPV error: {}", response.error);
                                return Err(MpvIpcError::MpvError(response.error));
                            }
                        }
                    }
                    // Ignore events and other responses
                }
                Err(e) => {
                    log::error!("Read error: {}", e);
                    return Err(MpvIpcError::ReceiveError(format!("Read error: {}", e)));
                }
            }
        }

        log::error!("Response timeout after 100 attempts");
        Err(MpvIpcError::ReceiveError("Response timeout".to_string()))
    }

    /// Get a property value from mpv
    pub fn get_property<T: serde::de::DeserializeOwned>(&self, name: &str) -> Result<T, MpvIpcError> {
        let result = self.command(&["get_property", name])?;
        serde_json::from_value(result)
            .map_err(|e| MpvIpcError::ReceiveError(format!("Failed to parse property: {}", e)))
    }

    /// Set a property value in mpv
    pub fn set_property<T: Serialize>(&self, name: &str, value: T) -> Result<(), MpvIpcError> {
        let value_json = serde_json::to_value(value)
            .map_err(|e| MpvIpcError::SendError(format!("Failed to serialize value: {}", e)))?;

        let pipe = self.pipe.as_ref().ok_or(MpvIpcError::NotRunning)?;
        let request_id = self.request_id.fetch_add(1, Ordering::SeqCst);

        let request = json!({
            "command": ["set_property", name, value_json],
            "request_id": request_id
        });

        let mut json_str = serde_json::to_string(&request)
            .map_err(|e| MpvIpcError::SendError(format!("Failed to serialize: {}", e)))?;
        json_str.push('\n');

        {
            let mut pipe_guard = pipe
                .lock()
                .map_err(|e| MpvIpcError::SendError(format!("Lock error: {}", e)))?;

            pipe_guard
                .write_all(json_str.as_bytes())
                .map_err(|e| MpvIpcError::SendError(format!("Write error: {}", e)))?;

            pipe_guard.flush()?;
        }

        self.read_response(request_id)?;
        Ok(())
    }

    // ========================================
    // High-level playback control methods
    // ========================================

    /// Load and play a file
    pub fn load_file(&self, path: &str) -> Result<(), MpvIpcError> {
        log::info!("Loading file: {}", path);
        self.command(&["loadfile", path, "replace"])?;
        log::info!("File loaded successfully");
        Ok(())
    }

    /// Pause playback
    pub fn pause(&self) -> Result<(), MpvIpcError> {
        self.set_property("pause", true)
    }

    /// Resume playback
    pub fn resume(&self) -> Result<(), MpvIpcError> {
        self.set_property("pause", false)
    }

    /// Toggle pause state
    pub fn toggle_pause(&self) -> Result<(), MpvIpcError> {
        self.command(&["cycle", "pause"])?;
        Ok(())
    }

    /// Stop playback
    pub fn stop_playback(&self) -> Result<(), MpvIpcError> {
        self.command(&["stop"])?;
        Ok(())
    }

    /// Seek to absolute position (seconds)
    pub fn seek_absolute(&self, position: f64) -> Result<(), MpvIpcError> {
        self.command(&["seek", &position.to_string(), "absolute"])?;
        Ok(())
    }

    /// Seek relative (seconds, can be negative)
    pub fn seek_relative(&self, offset: f64) -> Result<(), MpvIpcError> {
        self.command(&["seek", &offset.to_string(), "relative"])?;
        Ok(())
    }

    /// Set volume (0-100)
    pub fn set_volume(&self, volume: i64) -> Result<(), MpvIpcError> {
        self.set_property("volume", volume.clamp(0, 100))
    }

    /// Get current volume
    pub fn get_volume(&self) -> Result<i64, MpvIpcError> {
        self.get_property("volume")
    }

    /// Set mute state
    pub fn set_mute(&self, muted: bool) -> Result<(), MpvIpcError> {
        self.set_property("mute", muted)
    }

    /// Toggle mute
    pub fn toggle_mute(&self) -> Result<(), MpvIpcError> {
        self.command(&["cycle", "mute"])?;
        Ok(())
    }

    /// Get current playback position (seconds)
    pub fn get_position(&self) -> Result<f64, MpvIpcError> {
        self.get_property("time-pos").or(Ok(0.0))
    }

    /// Get total duration (seconds)
    pub fn get_duration(&self) -> Result<f64, MpvIpcError> {
        self.get_property("duration").or(Ok(0.0))
    }

    /// Check if paused
    pub fn is_paused(&self) -> Result<bool, MpvIpcError> {
        self.get_property("pause").or(Ok(true))
    }

    /// Check if muted
    pub fn is_muted(&self) -> Result<bool, MpvIpcError> {
        self.get_property("mute").or(Ok(false))
    }

    /// Set audio track by index
    pub fn set_audio_track(&self, index: i64) -> Result<(), MpvIpcError> {
        self.set_property("aid", index)
    }

    /// Set subtitle track by index (0 = off)
    pub fn set_subtitle_track(&self, index: i64) -> Result<(), MpvIpcError> {
        if index == 0 {
            self.set_property("sid", "no")
        } else {
            self.set_property("sid", index)
        }
    }

    /// Set playback speed (1.0 = normal)
    pub fn set_speed(&self, speed: f64) -> Result<(), MpvIpcError> {
        self.set_property("speed", speed.clamp(0.1, 4.0))
    }

    /// Get full playback state
    pub fn get_playback_state(&self) -> Result<PlaybackState, MpvIpcError> {
        Ok(PlaybackState {
            position: self.get_position().unwrap_or(0.0),
            duration: self.get_duration().unwrap_or(0.0),
            is_playing: !self.is_paused().unwrap_or(true),
            is_paused: self.is_paused().unwrap_or(true),
            volume: self.get_volume().unwrap_or(100),
            is_muted: self.is_muted().unwrap_or(false),
            filename: self.get_property::<String>("filename").ok(),
            media_title: self.get_property::<String>("media-title").ok(),
        })
    }

    /// Toggle fullscreen mode
    pub fn toggle_fullscreen(&self) -> Result<(), MpvIpcError> {
        self.command(&["cycle", "fullscreen"])?;
        Ok(())
    }

    /// Set fullscreen mode
    pub fn set_fullscreen(&self, fullscreen: bool) -> Result<(), MpvIpcError> {
        self.set_property("fullscreen", fullscreen)
    }

    /// Check if fullscreen
    pub fn is_fullscreen(&self) -> Result<bool, MpvIpcError> {
        self.get_property("fullscreen").or(Ok(false))
    }
}

impl Drop for MpvIpc {
    fn drop(&mut self) {
        self.stop();
    }
}

impl Default for MpvIpc {
    fn default() -> Self {
        Self::new()
    }
}
