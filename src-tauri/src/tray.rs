//! System tray functionality
//!
//! Provides system tray icon with context menu for controlling
//! the application when minimized.

use std::sync::Mutex;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};

/// Current playback info for tray display
#[derive(Debug, Clone, Default)]
pub struct TrayPlaybackInfo {
    pub is_playing: bool,
    pub title: Option<String>,
    pub artist: Option<String>,
}

/// Global tray state
pub struct TrayState {
    pub playback_info: Mutex<TrayPlaybackInfo>,
    pub minimize_to_tray: Mutex<bool>,
}

impl TrayState {
    pub fn new() -> Self {
        Self {
            playback_info: Mutex::new(TrayPlaybackInfo::default()),
            minimize_to_tray: Mutex::new(true), // Default to minimize to tray
        }
    }
}

impl Default for TrayState {
    fn default() -> Self {
        Self::new()
    }
}

/// Menu item IDs
const MENU_SHOW_HIDE: &str = "show_hide";
const MENU_NOW_PLAYING: &str = "now_playing";
const MENU_PLAY_PAUSE: &str = "play_pause";
const MENU_NEXT: &str = "next";
const MENU_PREVIOUS: &str = "previous";
const MENU_QUIT: &str = "quit";

/// Create the system tray
pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> Result<TrayIcon<R>, Box<dyn std::error::Error>> {
    // Load tray icon
    let icon = load_tray_icon(app, false)?;

    // Build the tray menu
    let menu = build_tray_menu(app, None)?;

    // Create tray icon
    let tray = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false) // We handle left click separately
        .tooltip("HubRemote")
        .on_tray_icon_event(|tray, event| {
            handle_tray_event(tray, event);
        })
        .on_menu_event(|app, event| {
            handle_menu_event(app, event.id.as_ref());
        })
        .build(app)?;

    Ok(tray)
}

/// Load tray icon based on playback state
fn load_tray_icon<R: Runtime>(_app: &AppHandle<R>, _is_playing: bool) -> Result<Image<'static>, Box<dyn std::error::Error>> {
    // Load embedded icon (use .ico on Windows)
    let icon_bytes = include_bytes!("../icons/icon.ico");
    Image::from_bytes(icon_bytes).map_err(|e| e.into())
}

/// Build the tray context menu
fn build_tray_menu<R: Runtime>(
    app: &AppHandle<R>,
    playback_info: Option<&TrayPlaybackInfo>,
) -> Result<Menu<R>, Box<dyn std::error::Error>> {
    let menu = Menu::new(app)?;

    // Show/Hide window
    let show_hide = MenuItem::with_id(app, MENU_SHOW_HIDE, "Show/Hide", true, None::<&str>)?;
    menu.append(&show_hide)?;

    // Separator
    menu.append(&PredefinedMenuItem::separator(app)?)?;

    // Now Playing info (if available)
    if let Some(info) = playback_info {
        if let Some(title) = &info.title {
            let display_text = if let Some(artist) = &info.artist {
                format!("{} - {}", artist, title)
            } else {
                title.clone()
            };
            // Truncate if too long
            let display_text = if display_text.len() > 40 {
                format!("{}...", &display_text[..37])
            } else {
                display_text
            };
            let now_playing = MenuItem::with_id(app, MENU_NOW_PLAYING, &display_text, false, None::<&str>)?;
            menu.append(&now_playing)?;
            menu.append(&PredefinedMenuItem::separator(app)?)?;
        }
    }

    // Playback controls
    let play_pause_text = if playback_info.map_or(false, |i| i.is_playing) {
        "Pause"
    } else {
        "Play"
    };
    let play_pause = MenuItem::with_id(app, MENU_PLAY_PAUSE, play_pause_text, true, None::<&str>)?;
    let previous = MenuItem::with_id(app, MENU_PREVIOUS, "Previous", true, None::<&str>)?;
    let next = MenuItem::with_id(app, MENU_NEXT, "Next", true, None::<&str>)?;

    menu.append(&previous)?;
    menu.append(&play_pause)?;
    menu.append(&next)?;

    // Separator
    menu.append(&PredefinedMenuItem::separator(app)?)?;

    // Quit
    let quit = MenuItem::with_id(app, MENU_QUIT, "Quit", true, None::<&str>)?;
    menu.append(&quit)?;

    Ok(menu)
}

/// Handle tray icon events (clicks)
fn handle_tray_event<R: Runtime>(tray: &TrayIcon<R>, event: TrayIconEvent) {
    match event {
        TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } => {
            // Left click: toggle window visibility
            if let Some(window) = tray.app_handle().get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
        TrayIconEvent::DoubleClick {
            button: MouseButton::Left,
            ..
        } => {
            // Double click: show and focus window
            if let Some(window) = tray.app_handle().get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        _ => {}
    }
}

/// Handle menu item clicks
fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, menu_id: &str) {
    match menu_id {
        MENU_SHOW_HIDE => {
            if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
        MENU_PLAY_PAUSE => {
            let _ = app.emit("tray-command", "playPause");
        }
        MENU_NEXT => {
            let _ = app.emit("tray-command", "next");
        }
        MENU_PREVIOUS => {
            let _ = app.emit("tray-command", "previous");
        }
        MENU_QUIT => {
            // Set flag to actually quit, not just minimize
            if let Some(state) = app.try_state::<TrayState>() {
                *state.minimize_to_tray.lock().unwrap() = false;
            }
            app.exit(0);
        }
        _ => {}
    }
}

/// Update the tray menu with current playback info
pub fn update_tray_menu<R: Runtime>(app: &AppHandle<R>, info: &TrayPlaybackInfo) -> Result<(), Box<dyn std::error::Error>> {
    // Store playback info
    if let Some(state) = app.try_state::<TrayState>() {
        *state.playback_info.lock().unwrap() = info.clone();
    }

    // Rebuild menu with new info
    if let Some(tray) = app.tray_by_id("main-tray") {
        let menu = build_tray_menu(app, Some(info))?;
        tray.set_menu(Some(menu))?;

        // Update tooltip
        let tooltip = if let Some(title) = &info.title {
            if info.is_playing {
                format!("HubRemote - Playing: {}", title)
            } else {
                format!("HubRemote - Paused: {}", title)
            }
        } else {
            "HubRemote".to_string()
        };
        tray.set_tooltip(Some(&tooltip))?;
    }

    Ok(())
}

// ============================================
// Tauri Commands
// ============================================

use serde::{Deserialize, Serialize};

/// Command result type
#[derive(Serialize)]
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

    pub fn err(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

/// Playback info from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackInfoPayload {
    pub is_playing: bool,
    pub title: Option<String>,
    pub artist: Option<String>,
}

/// Update tray with playback info
#[tauri::command]
pub fn update_tray_playback(app: AppHandle, info: PlaybackInfoPayload) -> CommandResult<bool> {
    let tray_info = TrayPlaybackInfo {
        is_playing: info.is_playing,
        title: info.title,
        artist: info.artist,
    };

    match update_tray_menu(&app, &tray_info) {
        Ok(()) => CommandResult::ok(true),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

/// Get minimize to tray setting
#[tauri::command]
pub fn get_minimize_to_tray(app: AppHandle) -> CommandResult<bool> {
    if let Some(state) = app.try_state::<TrayState>() {
        let value = *state.minimize_to_tray.lock().unwrap();
        CommandResult::ok(value)
    } else {
        CommandResult::ok(true) // Default
    }
}

/// Set minimize to tray setting
#[tauri::command]
pub fn set_minimize_to_tray(app: AppHandle, enabled: bool) -> CommandResult<bool> {
    if let Some(state) = app.try_state::<TrayState>() {
        *state.minimize_to_tray.lock().unwrap() = enabled;
        CommandResult::ok(enabled)
    } else {
        CommandResult::err("State not available".to_string())
    }
}

/// Show the main window
#[tauri::command]
pub fn show_window(app: AppHandle) -> CommandResult<bool> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        CommandResult::ok(true)
    } else {
        CommandResult::err("Window not found".to_string())
    }
}

/// Hide the main window
#[tauri::command]
pub fn hide_window(app: AppHandle) -> CommandResult<bool> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        CommandResult::ok(true)
    } else {
        CommandResult::err("Window not found".to_string())
    }
}

/// Check if should minimize to tray on close
pub fn should_minimize_to_tray(app: &AppHandle) -> bool {
    if let Some(state) = app.try_state::<TrayState>() {
        *state.minimize_to_tray.lock().unwrap()
    } else {
        true // Default behavior
    }
}
