//! MPV Player wrapper for JellyRemote
//!
//! Provides a safe wrapper around libmpv for video playback.

use libmpv::Mpv;
use parking_lot::RwLock;
use std::sync::Arc;
use thiserror::Error;

/// Errors that can occur during MPV operations
#[derive(Error, Debug)]
pub enum MpvError {
    #[error("Failed to initialize MPV: {0}")]
    InitError(String),

    #[error("Failed to load file: {0}")]
    LoadError(String),

    #[error("Playback error: {0}")]
    PlaybackError(String),

    #[error("MPV not initialized")]
    NotInitialized,
}

impl From<libmpv::Error> for MpvError {
    fn from(err: libmpv::Error) -> Self {
        MpvError::PlaybackError(err.to_string())
    }
}

/// Playback state information
#[derive(Debug, Clone, serde::Serialize)]
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

impl Default for PlaybackState {
    fn default() -> Self {
        Self {
            position: 0.0,
            duration: 0.0,
            is_playing: false,
            is_paused: false,
            volume: 100,
            is_muted: false,
            filename: None,
            media_title: None,
        }
    }
}

/// MPV Player wrapper
pub struct MpvPlayer {
    mpv: Option<Mpv>,
    state: Arc<RwLock<PlaybackState>>,
}

impl MpvPlayer {
    /// Create a new MPV player instance
    pub fn new() -> Result<Self, MpvError> {
        let mpv = Mpv::new().map_err(|e| MpvError::InitError(e.to_string()))?;

        // Configure MPV for video playback
        Self::configure_mpv(&mpv)?;

        Ok(Self {
            mpv: Some(mpv),
            state: Arc::new(RwLock::new(PlaybackState::default())),
        })
    }

    /// Configure MPV with sensible defaults
    fn configure_mpv(mpv: &Mpv) -> Result<(), MpvError> {
        // Video output configuration
        mpv.set_property("vo", "gpu")
            .map_err(|e| MpvError::InitError(format!("Failed to set vo: {}", e)))?;

        // Hardware decoding (auto-select best method)
        mpv.set_property("hwdec", "auto-safe")
            .map_err(|e| MpvError::InitError(format!("Failed to set hwdec: {}", e)))?;

        // Keep the player open when playback ends
        mpv.set_property("keep-open", "yes")
            .map_err(|e| MpvError::InitError(format!("Failed to set keep-open: {}", e)))?;

        // Enable OSC (on-screen controller)
        mpv.set_property("osc", "yes")
            .map_err(|e| MpvError::InitError(format!("Failed to set osc: {}", e)))?;

        // Set reasonable cache settings for streaming
        mpv.set_property("cache", "yes")
            .map_err(|e| MpvError::InitError(format!("Failed to set cache: {}", e)))?;

        mpv.set_property("demuxer-max-bytes", "150MiB")
            .map_err(|e| MpvError::InitError(format!("Failed to set demuxer-max-bytes: {}", e)))?;

        mpv.set_property("demuxer-max-back-bytes", "75MiB")
            .map_err(|e| MpvError::InitError(format!("Failed to set demuxer-max-back-bytes: {}", e)))?;

        // User agent for Jellyfin
        mpv.set_property("user-agent", "JellyRemote/1.0")
            .map_err(|e| MpvError::InitError(format!("Failed to set user-agent: {}", e)))?;

        Ok(())
    }

    /// Get a reference to the MPV instance
    fn mpv(&self) -> Result<&Mpv, MpvError> {
        self.mpv.as_ref().ok_or(MpvError::NotInitialized)
    }

    /// Load and play a file/URL
    pub fn load_file(&self, url: &str) -> Result<(), MpvError> {
        let mpv = self.mpv()?;

        // Load the file
        mpv.command("loadfile", &[url, "replace"])
            .map_err(|e| MpvError::LoadError(format!("Failed to load {}: {}", url, e)))?;

        // Update state
        let mut state = self.state.write();
        state.filename = Some(url.to_string());
        state.is_playing = true;
        state.is_paused = false;

        log::info!("Loading file: {}", url);
        Ok(())
    }

    /// Load file with additional options (e.g., start position, headers)
    pub fn load_file_with_options(
        &self,
        url: &str,
        start_position: Option<f64>,
        headers: Option<&[(&str, &str)]>,
    ) -> Result<(), MpvError> {
        let mpv = self.mpv()?;

        // Build options string
        let mut options = Vec::new();

        if let Some(pos) = start_position {
            options.push(format!("start={}", pos));
        }

        if let Some(hdrs) = headers {
            let header_str: Vec<String> = hdrs
                .iter()
                .map(|(k, v)| format!("{}: {}", k, v))
                .collect();
            if !header_str.is_empty() {
                options.push(format!("http-header-fields={}", header_str.join(",")));
            }
        }

        let options_str = options.join(",");

        if options_str.is_empty() {
            mpv.command("loadfile", &[url, "replace"])
                .map_err(|e| MpvError::LoadError(e.to_string()))?;
        } else {
            mpv.command("loadfile", &[url, "replace", &options_str])
                .map_err(|e| MpvError::LoadError(e.to_string()))?;
        }

        // Update state
        let mut state = self.state.write();
        state.filename = Some(url.to_string());
        state.is_playing = true;
        state.is_paused = false;

        log::info!("Loading file with options: {} ({})", url, options_str);
        Ok(())
    }

    /// Start or resume playback
    pub fn play(&self) -> Result<(), MpvError> {
        let mpv = self.mpv()?;

        mpv.set_property("pause", false)?;

        let mut state = self.state.write();
        state.is_paused = false;
        state.is_playing = true;

        log::info!("Playback resumed");
        Ok(())
    }

    /// Pause playback
    pub fn pause(&self) -> Result<(), MpvError> {
        let mpv = self.mpv()?;

        mpv.set_property("pause", true)?;

        let mut state = self.state.write();
        state.is_paused = true;

        log::info!("Playback paused");
        Ok(())
    }

    /// Toggle pause state
    pub fn toggle_pause(&self) -> Result<bool, MpvError> {
        let mpv = self.mpv()?;

        let is_paused: bool = mpv.get_property("pause").unwrap_or(false);
        mpv.set_property("pause", !is_paused)?;

        let mut state = self.state.write();
        state.is_paused = !is_paused;

        log::info!("Playback toggled: paused={}", !is_paused);
        Ok(!is_paused)
    }

    /// Stop playback
    pub fn stop(&self) -> Result<(), MpvError> {
        let mpv = self.mpv()?;

        mpv.command("stop", &[])
            .map_err(|e| MpvError::PlaybackError(e.to_string()))?;

        let mut state = self.state.write();
        state.is_playing = false;
        state.is_paused = false;
        state.position = 0.0;
        state.filename = None;
        state.media_title = None;

        log::info!("Playback stopped");
        Ok(())
    }

    /// Seek to absolute position in seconds
    pub fn seek(&self, position: f64) -> Result<(), MpvError> {
        let mpv = self.mpv()?;

        mpv.command("seek", &[&position.to_string(), "absolute"])
            .map_err(|e| MpvError::PlaybackError(e.to_string()))?;

        let mut state = self.state.write();
        state.position = position;

        log::info!("Seeked to {} seconds", position);
        Ok(())
    }

    /// Seek relative to current position
    pub fn seek_relative(&self, offset: f64) -> Result<(), MpvError> {
        let mpv = self.mpv()?;

        mpv.command("seek", &[&offset.to_string(), "relative"])
            .map_err(|e| MpvError::PlaybackError(e.to_string()))?;

        log::info!("Seeked by {} seconds", offset);
        Ok(())
    }

    /// Set volume (0-100)
    pub fn set_volume(&self, volume: i64) -> Result<(), MpvError> {
        let mpv = self.mpv()?;

        let clamped = volume.clamp(0, 100);
        mpv.set_property("volume", clamped)?;

        let mut state = self.state.write();
        state.volume = clamped;

        log::info!("Volume set to {}", clamped);
        Ok(())
    }

    /// Get current volume
    pub fn get_volume(&self) -> Result<i64, MpvError> {
        let mpv = self.mpv()?;
        let volume: i64 = mpv.get_property("volume").unwrap_or(100);
        Ok(volume)
    }

    /// Set mute state
    pub fn set_mute(&self, muted: bool) -> Result<(), MpvError> {
        let mpv = self.mpv()?;

        mpv.set_property("mute", muted)?;

        let mut state = self.state.write();
        state.is_muted = muted;

        log::info!("Mute set to {}", muted);
        Ok(())
    }

    /// Toggle mute
    pub fn toggle_mute(&self) -> Result<bool, MpvError> {
        let mpv = self.mpv()?;

        let is_muted: bool = mpv.get_property("mute").unwrap_or(false);
        mpv.set_property("mute", !is_muted)?;

        let mut state = self.state.write();
        state.is_muted = !is_muted;

        Ok(!is_muted)
    }

    /// Get current playback position in seconds
    pub fn get_position(&self) -> Result<f64, MpvError> {
        let mpv = self.mpv()?;
        let position: f64 = mpv.get_property("time-pos").unwrap_or(0.0);
        Ok(position)
    }

    /// Get total duration in seconds
    pub fn get_duration(&self) -> Result<f64, MpvError> {
        let mpv = self.mpv()?;
        let duration: f64 = mpv.get_property("duration").unwrap_or(0.0);
        Ok(duration)
    }

    /// Get current playback state
    pub fn get_state(&self) -> Result<PlaybackState, MpvError> {
        let mpv = self.mpv()?;

        let position: f64 = mpv.get_property("time-pos").unwrap_or(0.0);
        let duration: f64 = mpv.get_property("duration").unwrap_or(0.0);
        let is_paused: bool = mpv.get_property("pause").unwrap_or(false);
        let volume: i64 = mpv.get_property("volume").unwrap_or(100);
        let is_muted: bool = mpv.get_property("mute").unwrap_or(false);
        let filename: Option<String> = mpv.get_property("filename").ok();
        let media_title: Option<String> = mpv.get_property("media-title").ok();

        // Check if actually playing (has file loaded and not idle)
        let idle: bool = mpv.get_property("idle-active").unwrap_or(true);
        let is_playing = !idle && filename.is_some();

        let state = PlaybackState {
            position,
            duration,
            is_playing,
            is_paused,
            volume,
            is_muted,
            filename,
            media_title,
        };

        // Update internal state
        *self.state.write() = state.clone();

        Ok(state)
    }

    /// Set audio track by index
    pub fn set_audio_track(&self, index: i64) -> Result<(), MpvError> {
        let mpv = self.mpv()?;
        mpv.set_property("aid", index)?;
        log::info!("Audio track set to {}", index);
        Ok(())
    }

    /// Set subtitle track by index (0 to disable)
    pub fn set_subtitle_track(&self, index: i64) -> Result<(), MpvError> {
        let mpv = self.mpv()?;
        if index <= 0 {
            mpv.set_property("sid", "no")?;
            log::info!("Subtitles disabled");
        } else {
            mpv.set_property("sid", index)?;
            log::info!("Subtitle track set to {}", index);
        }
        Ok(())
    }

    /// Set playback speed
    pub fn set_speed(&self, speed: f64) -> Result<(), MpvError> {
        let mpv = self.mpv()?;
        let clamped = speed.clamp(0.25, 4.0);
        mpv.set_property("speed", clamped)?;
        log::info!("Playback speed set to {}", clamped);
        Ok(())
    }

    /// Take a screenshot
    #[allow(dead_code)]
    pub fn screenshot(&self, path: Option<&str>) -> Result<(), MpvError> {
        let mpv = self.mpv()?;

        if let Some(p) = path {
            mpv.command("screenshot-to-file", &[p, "subtitles"])
                .map_err(|e| MpvError::PlaybackError(e.to_string()))?;
        } else {
            mpv.command("screenshot", &["subtitles"])
                .map_err(|e| MpvError::PlaybackError(e.to_string()))?;
        }

        Ok(())
    }

    /// Quit the player
    pub fn quit(&mut self) -> Result<(), MpvError> {
        if let Some(mpv) = self.mpv.take() {
            mpv.command("quit", &[])
                .map_err(|e| MpvError::PlaybackError(e.to_string()))?;
        }
        Ok(())
    }
}

impl Drop for MpvPlayer {
    fn drop(&mut self) {
        if self.mpv.is_some() {
            let _ = self.quit();
        }
    }
}

/// Global MPV player state managed by Tauri
pub struct MpvState {
    player: RwLock<Option<MpvPlayer>>,
}

impl MpvState {
    pub fn new() -> Self {
        Self {
            player: RwLock::new(None),
        }
    }

    /// Initialize the player if not already initialized
    pub fn init(&self) -> Result<(), MpvError> {
        let mut player = self.player.write();
        if player.is_none() {
            *player = Some(MpvPlayer::new()?);
            log::info!("MPV player initialized");
        }
        Ok(())
    }

    /// Get access to the player
    pub fn with_player<F, T>(&self, f: F) -> Result<T, MpvError>
    where
        F: FnOnce(&MpvPlayer) -> Result<T, MpvError>,
    {
        let player = self.player.read();
        match player.as_ref() {
            Some(p) => f(p),
            None => Err(MpvError::NotInitialized),
        }
    }

    /// Destroy the player
    pub fn destroy(&self) {
        let mut player = self.player.write();
        *player = None;
        log::info!("MPV player destroyed");
    }
}

impl Default for MpvState {
    fn default() -> Self {
        Self::new()
    }
}
