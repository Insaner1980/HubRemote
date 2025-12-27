//! Tauri commands for MPV playback control
//!
//! These commands are exposed to the frontend for controlling video playback.

use crate::mpv::{MpvState, PlaybackState};
use serde::{Deserialize, Serialize};
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

/// Initialize the MPV player
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

    match state.with_player(|player| player.load_file(&url)) {
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

    match state.with_player(|player| {
        player.load_file_with_options(
            &options.url,
            options.start_position,
            headers.as_deref(),
        )
    }) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Pause video playback
#[tauri::command]
pub fn pause_video(state: State<MpvState>) -> CommandResult<()> {
    match state.with_player(|player| player.pause()) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Resume video playback
#[tauri::command]
pub fn resume_video(state: State<MpvState>) -> CommandResult<()> {
    match state.with_player(|player| player.play()) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Toggle play/pause
#[tauri::command]
pub fn toggle_playback(state: State<MpvState>) -> CommandResult<bool> {
    match state.with_player(|player| player.toggle_pause()) {
        Ok(is_paused) => CommandResult::ok(is_paused),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Stop video playback
#[tauri::command]
pub fn stop_video(state: State<MpvState>) -> CommandResult<()> {
    match state.with_player(|player| player.stop()) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Seek to a specific position in seconds
#[tauri::command]
pub fn seek_video(state: State<MpvState>, position: f64) -> CommandResult<()> {
    match state.with_player(|player| player.seek(position)) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Seek relative to current position
#[tauri::command]
pub fn seek_video_relative(state: State<MpvState>, offset: f64) -> CommandResult<()> {
    match state.with_player(|player| player.seek_relative(offset)) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Set volume (0-100)
#[tauri::command]
pub fn set_volume(state: State<MpvState>, volume: i64) -> CommandResult<()> {
    match state.with_player(|player| player.set_volume(volume)) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Get current volume
#[tauri::command]
pub fn get_volume(state: State<MpvState>) -> CommandResult<i64> {
    match state.with_player(|player| player.get_volume()) {
        Ok(volume) => CommandResult::ok(volume),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Toggle mute
#[tauri::command]
pub fn toggle_mute(state: State<MpvState>) -> CommandResult<bool> {
    match state.with_player(|player| player.toggle_mute()) {
        Ok(is_muted) => CommandResult::ok(is_muted),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Set mute state
#[tauri::command]
pub fn set_mute(state: State<MpvState>, muted: bool) -> CommandResult<()> {
    match state.with_player(|player| player.set_mute(muted)) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Get current playback state
#[tauri::command]
pub fn get_playback_state(state: State<MpvState>) -> CommandResult<PlaybackState> {
    match state.with_player(|player| player.get_state()) {
        Ok(playback_state) => CommandResult::ok(playback_state),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Get current playback position
#[tauri::command]
pub fn get_position(state: State<MpvState>) -> CommandResult<f64> {
    match state.with_player(|player| player.get_position()) {
        Ok(position) => CommandResult::ok(position),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Get total duration
#[tauri::command]
pub fn get_duration(state: State<MpvState>) -> CommandResult<f64> {
    match state.with_player(|player| player.get_duration()) {
        Ok(duration) => CommandResult::ok(duration),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Set audio track by index
#[tauri::command]
pub fn set_audio_track(state: State<MpvState>, index: i64) -> CommandResult<()> {
    match state.with_player(|player| player.set_audio_track(index)) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Set subtitle track by index (0 or negative to disable)
#[tauri::command]
pub fn set_subtitle_track(state: State<MpvState>, index: i64) -> CommandResult<()> {
    match state.with_player(|player| player.set_subtitle_track(index)) {
        Ok(_) => CommandResult::ok_empty(),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Set playback speed
#[tauri::command]
pub fn set_playback_speed(state: State<MpvState>, speed: f64) -> CommandResult<()> {
    match state.with_player(|player| player.set_speed(speed)) {
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
