//! HubRemote - A Jellyfin remote control application
//!
//! This library provides the Tauri backend for the HubRemote application,
//! including MPV video playback integration.

mod commands;
mod mpv;
mod mpv_ipc;
mod rclone;
mod shortcuts;
mod streaming;
mod tray;

use commands::StreamingState;
use mpv::MpvState;
use tauri::Manager;
use tray::TrayState;

/// Greet command for testing
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to HubRemote.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // Initialize MPV state
        .manage(MpvState::new())
        // Initialize tray state
        .manage(TrayState::new())
        // Initialize streaming state
        .manage(StreamingState::new())
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
            // Fullscreen
            commands::toggle_fullscreen,
            commands::set_fullscreen,
            commands::is_fullscreen,
            // Global shortcuts
            shortcuts::enable_global_shortcuts,
            shortcuts::disable_global_shortcuts,
            shortcuts::get_shortcuts_enabled,
            shortcuts::set_shortcuts_active,
            shortcuts::register_custom_shortcuts,
            shortcuts::get_default_shortcut_config,
            // Tray commands
            tray::update_tray_playback,
            tray::get_minimize_to_tray,
            tray::set_minimize_to_tray,
            tray::show_window,
            tray::hide_window,
            // Rclone commands
            rclone::mount_drive,
            rclone::unmount_drive,
            rclone::check_mount_status,
            rclone::check_rclone,
            rclone::get_default_rclone_config,
            // Streaming commands
            commands::start_stream_server,
            commands::stop_stream_server,
            commands::is_stream_server_running,
            commands::get_stream_server_url,
            commands::create_stream,
            commands::remove_stream,
            commands::get_local_ip,
        ])
        .setup(|app| {
            // Log app startup
            log::info!("HubRemote starting up...");

            // Create system tray
            match tray::create_tray(app.handle()) {
                Ok(_) => log::info!("System tray created successfully"),
                Err(e) => log::error!("Failed to create system tray: {}", e),
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Handle window close event - minimize to tray instead of quitting
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if tray::should_minimize_to_tray(window.app_handle()) {
                    // Prevent the window from closing
                    api.prevent_close();
                    // Hide the window instead
                    let _ = window.hide();
                    log::info!("Window minimized to tray");
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            if let tauri::RunEvent::Exit = event {
                // Cleanup rclone mounts on exit
                rclone::cleanup();
                log::info!("HubRemote shutting down...");
            }
        });
}
