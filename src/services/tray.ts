/**
 * System tray service
 *
 * Provides frontend integration with the Rust system tray,
 * including playback info updates and tray settings.
 */

import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

// Types

export interface PlaybackInfo {
  isPlaying: boolean
  title?: string
  artist?: string
}

interface CommandResult<T> {
  success: boolean
  data?: T
  error?: string
}

export type TrayCommand = 'playPause' | 'next' | 'previous'

// Tray service

export const trayService = {
  /**
   * Update tray with current playback info
   */
  async updatePlayback(info: PlaybackInfo): Promise<boolean> {
    try {
      const result = await invoke<CommandResult<boolean>>('update_tray_playback', { info })
      if (!result.success) {
        throw new Error(result.error || 'Failed to update tray')
      }
      return result.data ?? true
    } catch (error) {
      console.error('Failed to update tray playback:', error)
      return false
    }
  },

  /**
   * Get minimize to tray setting
   */
  async getMinimizeToTray(): Promise<boolean> {
    try {
      const result = await invoke<CommandResult<boolean>>('get_minimize_to_tray')
      return result.data ?? true
    } catch (error) {
      console.error('Failed to get minimize to tray setting:', error)
      return true // Default
    }
  },

  /**
   * Set minimize to tray setting
   */
  async setMinimizeToTray(enabled: boolean): Promise<boolean> {
    try {
      const result = await invoke<CommandResult<boolean>>('set_minimize_to_tray', { enabled })
      if (!result.success) {
        throw new Error(result.error || 'Failed to set minimize to tray')
      }
      return result.data ?? enabled
    } catch (error) {
      console.error('Failed to set minimize to tray:', error)
      return false
    }
  },

  /**
   * Show the main window
   */
  async showWindow(): Promise<boolean> {
    try {
      const result = await invoke<CommandResult<boolean>>('show_window')
      return result.success
    } catch (error) {
      console.error('Failed to show window:', error)
      return false
    }
  },

  /**
   * Hide the main window
   */
  async hideWindow(): Promise<boolean> {
    try {
      const result = await invoke<CommandResult<boolean>>('hide_window')
      return result.success
    } catch (error) {
      console.error('Failed to hide window:', error)
      return false
    }
  },

  /**
   * Listen for tray commands (play/pause, next, previous)
   */
  async onTrayCommand(callback: (command: TrayCommand) => void): Promise<UnlistenFn> {
    return listen<string>('tray-command', (event) => {
      callback(event.payload as TrayCommand)
    })
  },
}

export default trayService
