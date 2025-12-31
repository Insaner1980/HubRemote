//! MPV Player state management for HubRemote
//!
//! Manages the MPV player instance using IPC communication.
//! This works with any installed mpv version.

use crate::mpv_ipc::{MpvIpc, MpvIpcError, PlaybackState};
use parking_lot::RwLock;
use std::sync::Arc;
use thiserror::Error;

/// Errors that can occur during MPV operations
#[derive(Error, Debug)]
pub enum MpvError {
    #[error("Failed to initialize MPV: {0}")]
    InitError(String),

    #[error("MPV not initialized")]
    NotInitialized,

    #[error("IPC error: {0}")]
    IpcError(#[from] MpvIpcError),
}

/// Thread-safe MPV state container
pub struct MpvState {
    player: Arc<RwLock<Option<MpvIpc>>>,
}

impl MpvState {
    /// Create a new MPV state (player not yet initialized)
    pub fn new() -> Self {
        Self {
            player: Arc::new(RwLock::new(None)),
        }
    }

    /// Initialize the MPV player (fullscreen with OSC)
    pub fn init(&self) -> Result<(), MpvError> {
        let mut player_guard = self.player.write();

        // Already initialized?
        if player_guard.is_some() {
            return Ok(());
        }

        log::info!("Initializing MPV player via IPC...");

        let mut mpv = MpvIpc::new();
        mpv.start().map_err(|e| MpvError::InitError(e.to_string()))?;

        *player_guard = Some(mpv);

        log::info!("MPV player initialized successfully");
        Ok(())
    }

    /// Destroy the player
    pub fn destroy(&self) {
        let mut player_guard = self.player.write();
        if let Some(mut mpv) = player_guard.take() {
            log::info!("Destroying MPV player");
            mpv.stop();
        }
    }

    /// Execute an operation on the player
    pub fn with_player<F, T>(&self, f: F) -> Result<T, MpvError>
    where
        F: FnOnce(&MpvIpc) -> Result<T, MpvIpcError>,
    {
        let player_guard = self.player.read();
        let player = player_guard.as_ref().ok_or(MpvError::NotInitialized)?;
        f(player).map_err(MpvError::from)
    }
}

impl Default for MpvState {
    fn default() -> Self {
        Self::new()
    }
}

/// Player wrapper with high-level methods
/// Used by commands.rs for cleaner interface
pub struct MpvPlayer<'a> {
    ipc: &'a MpvIpc,
}

impl<'a> MpvPlayer<'a> {
    pub fn new(ipc: &'a MpvIpc) -> Self {
        Self { ipc }
    }

    /// Load and play a file
    pub fn load_file(&self, url: &str) -> Result<(), MpvIpcError> {
        self.ipc.load_file(url)
    }

    /// Load file with options (start position, headers)
    pub fn load_file_with_options(
        &self,
        url: &str,
        start_position: Option<f64>,
        headers: Option<&[(&str, &str)]>,
    ) -> Result<(), MpvIpcError> {
        // Build URL with headers if provided
        let final_url = if let Some(hdrs) = headers {
            if hdrs.is_empty() {
                url.to_string()
            } else {
                // For Jellyfin, we need to pass auth token in URL or use http-header-fields
                // mpv accepts http-header-fields as a property
                let header_str: String = hdrs
                    .iter()
                    .map(|(k, v)| format!("{}: {}", k, v))
                    .collect::<Vec<_>>()
                    .join("\r\n");

                // Set the headers before loading
                let _ = self.ipc.set_property("http-header-fields", header_str);
                url.to_string()
            }
        } else {
            url.to_string()
        };

        // Set start position if provided
        if let Some(pos) = start_position {
            // Convert to seconds and set start property
            let _ = self.ipc.set_property("start", format!("{}", pos));
        }

        self.ipc.load_file(&final_url)
    }

    /// Pause playback
    pub fn pause(&self) -> Result<(), MpvIpcError> {
        self.ipc.pause()
    }

    /// Resume/play
    pub fn play(&self) -> Result<(), MpvIpcError> {
        self.ipc.resume()
    }

    /// Toggle pause and return new state
    pub fn toggle_pause(&self) -> Result<bool, MpvIpcError> {
        self.ipc.toggle_pause()?;
        self.ipc.is_paused()
    }

    /// Stop playback
    pub fn stop(&self) -> Result<(), MpvIpcError> {
        self.ipc.stop_playback()
    }

    /// Seek to absolute position (seconds)
    pub fn seek(&self, position: f64) -> Result<(), MpvIpcError> {
        self.ipc.seek_absolute(position)
    }

    /// Seek relative
    pub fn seek_relative(&self, offset: f64) -> Result<(), MpvIpcError> {
        self.ipc.seek_relative(offset)
    }

    /// Set volume (0-100)
    pub fn set_volume(&self, volume: i64) -> Result<(), MpvIpcError> {
        self.ipc.set_volume(volume)
    }

    /// Get volume
    pub fn get_volume(&self) -> Result<i64, MpvIpcError> {
        self.ipc.get_volume()
    }

    /// Set mute state
    pub fn set_mute(&self, muted: bool) -> Result<(), MpvIpcError> {
        self.ipc.set_mute(muted)
    }

    /// Toggle mute and return new state
    pub fn toggle_mute(&self) -> Result<bool, MpvIpcError> {
        self.ipc.toggle_mute()?;
        self.ipc.is_muted()
    }

    /// Get playback position
    pub fn get_position(&self) -> Result<f64, MpvIpcError> {
        self.ipc.get_position()
    }

    /// Get duration
    pub fn get_duration(&self) -> Result<f64, MpvIpcError> {
        self.ipc.get_duration()
    }

    /// Get full playback state
    pub fn get_state(&self) -> Result<PlaybackState, MpvIpcError> {
        self.ipc.get_playback_state()
    }

    /// Set audio track
    pub fn set_audio_track(&self, index: i64) -> Result<(), MpvIpcError> {
        self.ipc.set_audio_track(index)
    }

    /// Set subtitle track
    pub fn set_subtitle_track(&self, index: i64) -> Result<(), MpvIpcError> {
        self.ipc.set_subtitle_track(index)
    }

    /// Set playback speed
    pub fn set_speed(&self, speed: f64) -> Result<(), MpvIpcError> {
        self.ipc.set_speed(speed)
    }
}

// Convenience trait implementation for MpvState
impl MpvState {
    /// Load and play a file
    pub fn load_file(&self, url: &str) -> Result<(), MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).load_file(url))
    }

    /// Load file with options
    pub fn load_file_with_options(
        &self,
        url: &str,
        start_position: Option<f64>,
        headers: Option<&[(&str, &str)]>,
    ) -> Result<(), MpvError> {
        self.with_player(|ipc| {
            MpvPlayer::new(ipc).load_file_with_options(url, start_position, headers)
        })
    }

    /// Pause
    pub fn pause(&self) -> Result<(), MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).pause())
    }

    /// Resume
    pub fn play(&self) -> Result<(), MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).play())
    }

    /// Toggle pause
    pub fn toggle_pause(&self) -> Result<bool, MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).toggle_pause())
    }

    /// Stop
    pub fn stop(&self) -> Result<(), MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).stop())
    }

    /// Seek absolute
    pub fn seek(&self, position: f64) -> Result<(), MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).seek(position))
    }

    /// Seek relative
    pub fn seek_relative(&self, offset: f64) -> Result<(), MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).seek_relative(offset))
    }

    /// Set volume
    pub fn set_volume(&self, volume: i64) -> Result<(), MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).set_volume(volume))
    }

    /// Get volume
    pub fn get_volume(&self) -> Result<i64, MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).get_volume())
    }

    /// Set mute
    pub fn set_mute(&self, muted: bool) -> Result<(), MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).set_mute(muted))
    }

    /// Toggle mute
    pub fn toggle_mute(&self) -> Result<bool, MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).toggle_mute())
    }

    /// Get position
    pub fn get_position(&self) -> Result<f64, MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).get_position())
    }

    /// Get duration
    pub fn get_duration(&self) -> Result<f64, MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).get_duration())
    }

    /// Get state
    pub fn get_state(&self) -> Result<PlaybackState, MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).get_state())
    }

    /// Set audio track
    pub fn set_audio_track(&self, index: i64) -> Result<(), MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).set_audio_track(index))
    }

    /// Set subtitle track
    pub fn set_subtitle_track(&self, index: i64) -> Result<(), MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).set_subtitle_track(index))
    }

    /// Set speed
    pub fn set_speed(&self, speed: f64) -> Result<(), MpvError> {
        self.with_player(|ipc| MpvPlayer::new(ipc).set_speed(speed))
    }

    /// Toggle fullscreen
    pub fn toggle_fullscreen(&self) -> Result<(), MpvError> {
        self.with_player(|ipc| ipc.toggle_fullscreen())
    }

    /// Set fullscreen state
    pub fn set_fullscreen(&self, fullscreen: bool) -> Result<(), MpvError> {
        self.with_player(|ipc| ipc.set_fullscreen(fullscreen))
    }

    /// Check if fullscreen
    pub fn is_fullscreen(&self) -> Result<bool, MpvError> {
        self.with_player(|ipc| ipc.is_fullscreen())
    }
}
