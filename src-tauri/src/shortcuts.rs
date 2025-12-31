//! Global keyboard shortcuts module
//!
//! Handles registration and management of global media key shortcuts
//! that work even when the application is not focused.

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

/// Global shortcuts enabled state
static SHORTCUTS_ENABLED: AtomicBool = AtomicBool::new(false);

/// Shortcut action types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ShortcutAction {
    PlayPause,
    NextTrack,
    PreviousTrack,
    Stop,
    VolumeUp,
    VolumeDown,
    Mute,
    Custom(String),
}

/// Event payload sent to frontend
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutEvent {
    pub action: ShortcutAction,
    pub shortcut: String,
}

/// Custom shortcut configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutConfig {
    pub play_pause: Option<String>,
    pub next_track: Option<String>,
    pub previous_track: Option<String>,
    pub stop: Option<String>,
    pub volume_up: Option<String>,
    pub volume_down: Option<String>,
    pub mute: Option<String>,
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        Self {
            play_pause: Some("MediaPlayPause".to_string()),
            next_track: Some("MediaNextTrack".to_string()),
            previous_track: Some("MediaPreviousTrack".to_string()),
            stop: Some("MediaStop".to_string()),
            volume_up: None,
            volume_down: None,
            mute: None,
        }
    }
}

/// Register default media key shortcuts
pub fn register_media_shortcuts(app: &AppHandle) -> Result<(), String> {
    let config = ShortcutConfig::default();
    register_shortcuts_with_config(app, &config)
}

/// Register shortcuts with custom configuration
pub fn register_shortcuts_with_config(app: &AppHandle, config: &ShortcutConfig) -> Result<(), String> {
    let global_shortcut = app.global_shortcut();

    // Helper to register a single shortcut
    let register_shortcut = |key: &str, action: ShortcutAction| -> Result<(), String> {
        let shortcut: Shortcut = key.parse().map_err(|e| format!("Invalid shortcut '{}': {:?}", key, e))?;
        let app_handle = app.clone();
        let action_clone = action.clone();
        let key_str = key.to_string();

        global_shortcut
            .on_shortcut(shortcut, move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed && SHORTCUTS_ENABLED.load(Ordering::Relaxed) {
                    log::info!("Global shortcut triggered: {:?}", action_clone);
                    let _ = app_handle.emit("global-shortcut", ShortcutEvent {
                        action: action_clone.clone(),
                        shortcut: key_str.clone(),
                    });
                }
            })
            .map_err(|e| format!("Failed to register shortcut '{}': {:?}", key, e))?;

        Ok(())
    };

    // Register configured shortcuts
    if let Some(ref key) = config.play_pause {
        register_shortcut(key, ShortcutAction::PlayPause)?;
    }
    if let Some(ref key) = config.next_track {
        register_shortcut(key, ShortcutAction::NextTrack)?;
    }
    if let Some(ref key) = config.previous_track {
        register_shortcut(key, ShortcutAction::PreviousTrack)?;
    }
    if let Some(ref key) = config.stop {
        register_shortcut(key, ShortcutAction::Stop)?;
    }
    if let Some(ref key) = config.volume_up {
        register_shortcut(key, ShortcutAction::VolumeUp)?;
    }
    if let Some(ref key) = config.volume_down {
        register_shortcut(key, ShortcutAction::VolumeDown)?;
    }
    if let Some(ref key) = config.mute {
        register_shortcut(key, ShortcutAction::Mute)?;
    }

    SHORTCUTS_ENABLED.store(true, Ordering::Relaxed);
    log::info!("Global shortcuts registered successfully");

    Ok(())
}

/// Unregister all shortcuts
pub fn unregister_all_shortcuts(app: &AppHandle) -> Result<(), String> {
    let global_shortcut = app.global_shortcut();
    global_shortcut
        .unregister_all()
        .map_err(|e| format!("Failed to unregister shortcuts: {:?}", e))?;

    SHORTCUTS_ENABLED.store(false, Ordering::Relaxed);
    log::info!("Global shortcuts unregistered");

    Ok(())
}

/// Check if shortcuts are enabled
pub fn are_shortcuts_enabled() -> bool {
    SHORTCUTS_ENABLED.load(Ordering::Relaxed)
}

/// Enable/disable shortcut handling (shortcuts stay registered but events are not emitted)
pub fn set_shortcuts_enabled(enabled: bool) {
    SHORTCUTS_ENABLED.store(enabled, Ordering::Relaxed);
    log::info!("Global shortcuts {}", if enabled { "enabled" } else { "disabled" });
}

// ============================================
// Tauri Commands
// ============================================

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

/// Enable global shortcuts
#[tauri::command]
pub fn enable_global_shortcuts(app: AppHandle) -> CommandResult<bool> {
    match register_media_shortcuts(&app) {
        Ok(()) => CommandResult::ok(true),
        Err(e) => CommandResult::err(e),
    }
}

/// Disable global shortcuts
#[tauri::command]
pub fn disable_global_shortcuts(app: AppHandle) -> CommandResult<bool> {
    match unregister_all_shortcuts(&app) {
        Ok(()) => CommandResult::ok(true),
        Err(e) => CommandResult::err(e),
    }
}

/// Check if shortcuts are enabled
#[tauri::command]
pub fn get_shortcuts_enabled() -> CommandResult<bool> {
    CommandResult::ok(are_shortcuts_enabled())
}

/// Set shortcuts enabled state (without re-registering)
#[tauri::command]
pub fn set_shortcuts_active(enabled: bool) -> CommandResult<bool> {
    set_shortcuts_enabled(enabled);
    CommandResult::ok(enabled)
}

/// Register shortcuts with custom configuration
#[tauri::command]
pub fn register_custom_shortcuts(app: AppHandle, config: ShortcutConfig) -> CommandResult<bool> {
    // First unregister existing shortcuts
    if let Err(e) = unregister_all_shortcuts(&app) {
        log::warn!("Failed to unregister existing shortcuts: {}", e);
    }

    // Register new shortcuts
    match register_shortcuts_with_config(&app, &config) {
        Ok(()) => CommandResult::ok(true),
        Err(e) => CommandResult::err(e),
    }
}

/// Get default shortcut configuration
#[tauri::command]
pub fn get_default_shortcut_config() -> CommandResult<ShortcutConfig> {
    CommandResult::ok(ShortcutConfig::default())
}
