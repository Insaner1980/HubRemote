//! JellyRemote - A Jellyfin remote control application
//!
//! This library provides the Tauri backend for the JellyRemote application,
//! including MPV video playback integration.

mod commands;
mod mpv;

use mpv::MpvState;

/// Greet command for testing
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to JellyRemote.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        // Initialize MPV state
        .manage(MpvState::new())
        // Register all commands
        .invoke_handler(tauri::generate_handler![
            // Test command
            greet,
            // Player initialization
            commands::init_player,
            commands::destroy_player,
            // Playback control
            commands::play_video,
            commands::play_video_with_options,
            commands::pause_video,
            commands::resume_video,
            commands::toggle_playback,
            commands::stop_video,
            // Seeking
            commands::seek_video,
            commands::seek_video_relative,
            // Volume
            commands::set_volume,
            commands::get_volume,
            commands::toggle_mute,
            commands::set_mute,
            // State
            commands::get_playback_state,
            commands::get_position,
            commands::get_duration,
            // Tracks
            commands::set_audio_track,
            commands::set_subtitle_track,
            commands::set_playback_speed,
        ])
        .setup(|_app| {
            // Log app startup
            log::info!("JellyRemote starting up...");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
