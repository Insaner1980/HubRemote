//! Rclone mount management
//!
//! Handles automatic mounting/unmounting of cloud storage via rclone.
//! Supports Google Drive and other rclone-compatible remotes.

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// Global rclone process handle
static RCLONE_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

/// Mount configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RcloneConfig {
    pub rclone_path: String,
    pub remote_name: String,
    pub remote_folder: String,
    pub mount_point: String,
    pub vfs_cache_mode: String,
    pub auto_mount: bool,
}

impl Default for RcloneConfig {
    fn default() -> Self {
        Self {
            rclone_path: "rclone".to_string(),
            remote_name: "gdrive".to_string(),
            remote_folder: "Media Hub".to_string(),
            mount_point: "G:".to_string(),
            vfs_cache_mode: "full".to_string(),
            auto_mount: true,
        }
    }
}

/// Mount status
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MountStatus {
    pub is_mounted: bool,
    pub mount_point: String,
    pub remote_name: String,
    pub remote_folder: String,
    pub error: Option<String>,
}

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

/// Check if a path/drive is mounted and accessible
pub fn is_path_mounted(mount_point: &str) -> bool {
    let path = Path::new(mount_point);

    // On Windows, check if the drive letter exists
    if cfg!(windows) {
        // For drive letters like "G:", check if it exists
        if mount_point.len() <= 3 && mount_point.contains(':') {
            return path.exists() && path.is_dir();
        }
    }

    // For full paths, just check if it exists
    path.exists()
}

/// Check if rclone is installed and accessible
pub fn check_rclone_installed(rclone_path: &str) -> Result<String, String> {
    let output = Command::new(rclone_path)
        .arg("version")
        .output()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                "rclone not found. Please install rclone and ensure it's in your PATH.".to_string()
            } else {
                format!("Failed to run rclone: {}", e)
            }
        })?;

    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout);
        let first_line = version.lines().next().unwrap_or("rclone").to_string();
        Ok(first_line)
    } else {
        Err("rclone command failed".to_string())
    }
}

/// Start rclone mount process
pub fn start_mount(config: &RcloneConfig) -> Result<(), String> {
    // Check if already mounted
    if is_path_mounted(&config.mount_point) {
        log::info!("Drive {} is already mounted", config.mount_point);
        return Ok(());
    }

    // Check if rclone is installed
    check_rclone_installed(&config.rclone_path)?;

    // Build the remote path
    let remote_path = format!("{}:{}", config.remote_name, config.remote_folder);

    log::info!("Starting rclone mount: {} -> {}", remote_path, config.mount_point);

    // Build the command
    let mut cmd = Command::new(&config.rclone_path);
    cmd.arg("mount")
        .arg(&remote_path)
        .arg(&config.mount_point)
        .arg("--vfs-cache-mode")
        .arg(&config.vfs_cache_mode)
        .arg("--network-mode");  // Makes mount visible to ALL processes (required for Jellyfin transcoding)

    // Windows-specific options
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW = 0x08000000
        cmd.creation_flags(0x08000000);
    }

    // Start the process
    let child = cmd.spawn().map_err(|e| format!("Failed to start rclone: {}", e))?;

    // Store the process handle
    let mut process = RCLONE_PROCESS.lock().map_err(|e| format!("Lock error: {}", e))?;
    *process = Some(child);

    Ok(())
}

/// Wait for mount to become available
pub fn wait_for_mount(mount_point: &str, timeout_secs: u64) -> Result<(), String> {
    let start = Instant::now();
    let timeout = Duration::from_secs(timeout_secs);
    let poll_interval = Duration::from_millis(500);

    log::info!("Waiting for mount at {} (timeout: {}s)", mount_point, timeout_secs);

    while start.elapsed() < timeout {
        if is_path_mounted(mount_point) {
            log::info!("Mount ready at {}", mount_point);
            return Ok(());
        }
        std::thread::sleep(poll_interval);
    }

    Err(format!(
        "Timeout waiting for mount at {} after {} seconds",
        mount_point, timeout_secs
    ))
}

/// Stop rclone mount process
pub fn stop_mount(config: &RcloneConfig) -> Result<(), String> {
    log::info!("Stopping rclone mount at {}", config.mount_point);

    // First try to kill the stored process
    {
        let mut process = RCLONE_PROCESS.lock().map_err(|e| format!("Lock error: {}", e))?;
        if let Some(mut child) = process.take() {
            let _ = child.kill();
            let _ = child.wait();
            log::info!("Killed rclone process");
        }
    }

    // Also try fusermount/umount as backup
    #[cfg(windows)]
    {
        // On Windows, try rclone unmount command
        let output = Command::new(&config.rclone_path)
            .arg("unmount")
            .arg(&config.mount_point)
            .output();

        if let Ok(out) = output {
            if out.status.success() {
                log::info!("Successfully unmounted via rclone unmount");
            }
        }
    }

    #[cfg(not(windows))]
    {
        // On Linux/Mac, try fusermount
        let _ = Command::new("fusermount")
            .arg("-u")
            .arg(&config.mount_point)
            .output();
    }

    // Wait a bit for unmount to complete
    std::thread::sleep(Duration::from_millis(500));

    // Check if still mounted
    if is_path_mounted(&config.mount_point) {
        log::warn!("Mount point {} still exists after unmount", config.mount_point);
        // This might be okay if it's a regular directory
    }

    Ok(())
}

/// Get current mount status
pub fn get_mount_status(config: &RcloneConfig) -> MountStatus {
    let is_mounted = is_path_mounted(&config.mount_point);

    MountStatus {
        is_mounted,
        mount_point: config.mount_point.clone(),
        remote_name: config.remote_name.clone(),
        remote_folder: config.remote_folder.clone(),
        error: None,
    }
}

// ============================================
// Tauri Commands
// ============================================

/// Mount the drive with given configuration
#[tauri::command]
pub fn mount_drive(app: AppHandle, config: RcloneConfig) -> CommandResult<MountStatus> {
    // Check if already mounted
    if is_path_mounted(&config.mount_point) {
        return CommandResult::ok(MountStatus {
            is_mounted: true,
            mount_point: config.mount_point.clone(),
            remote_name: config.remote_name.clone(),
            remote_folder: config.remote_folder.clone(),
            error: None,
        });
    }

    // Emit starting event
    let _ = app.emit("rclone-status", "mounting");

    // Start the mount
    if let Err(e) = start_mount(&config) {
        let _ = app.emit("rclone-status", "error");
        return CommandResult::err(e);
    }

    // Wait for it to be ready
    if let Err(e) = wait_for_mount(&config.mount_point, 30) {
        // Try to clean up
        let _ = stop_mount(&config);
        let _ = app.emit("rclone-status", "error");
        return CommandResult::err(e);
    }

    let _ = app.emit("rclone-status", "mounted");
    CommandResult::ok(MountStatus {
        is_mounted: true,
        mount_point: config.mount_point,
        remote_name: config.remote_name,
        remote_folder: config.remote_folder,
        error: None,
    })
}

/// Unmount the drive
#[tauri::command]
pub fn unmount_drive(app: AppHandle, config: RcloneConfig) -> CommandResult<bool> {
    let _ = app.emit("rclone-status", "unmounting");

    match stop_mount(&config) {
        Ok(()) => {
            let _ = app.emit("rclone-status", "unmounted");
            CommandResult::ok(true)
        }
        Err(e) => {
            let _ = app.emit("rclone-status", "error");
            CommandResult::err(e)
        }
    }
}

/// Check if the drive is currently mounted
#[tauri::command]
pub fn check_mount_status(config: RcloneConfig) -> CommandResult<MountStatus> {
    CommandResult::ok(get_mount_status(&config))
}

/// Check if rclone is installed
#[tauri::command]
pub fn check_rclone(rclone_path: String) -> CommandResult<String> {
    match check_rclone_installed(&rclone_path) {
        Ok(version) => CommandResult::ok(version),
        Err(e) => CommandResult::err(e),
    }
}

/// Get default configuration
#[tauri::command]
pub fn get_default_rclone_config() -> CommandResult<RcloneConfig> {
    CommandResult::ok(RcloneConfig::default())
}

/// Cleanup function to be called on app exit
pub fn cleanup() {
    log::info!("Cleaning up rclone mounts...");

    if let Ok(mut process) = RCLONE_PROCESS.lock() {
        if let Some(mut child) = process.take() {
            log::info!("Killing rclone process on exit");
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}
