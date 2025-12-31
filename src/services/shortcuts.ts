//! Global Shortcuts service for frontend
//!
//! Provides TypeScript bindings to the Tauri global shortcut commands.

import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'

// ============================================
// Types
// ============================================

interface CommandResult<T> {
  success: boolean
  data: T | null
  error: string | null
}

export type ShortcutAction =
  | 'playPause'
  | 'nextTrack'
  | 'previousTrack'
  | 'stop'
  | 'volumeUp'
  | 'volumeDown'
  | 'mute'
  | { custom: string }

export interface ShortcutEvent {
  action: ShortcutAction
  shortcut: string
}

export interface ShortcutConfig {
  playPause?: string
  nextTrack?: string
  previousTrack?: string
  stop?: string
  volumeUp?: string
  volumeDown?: string
  mute?: string
}

// ============================================
// Helper Functions
// ============================================

async function unwrapResult<T>(promise: Promise<CommandResult<T>>): Promise<T> {
  const result = await promise
  if (!result.success || result.error) {
    throw new Error(result.error || 'Unknown error')
  }
  return result.data as T
}

// ============================================
// Shortcuts Service
// ============================================

export const shortcutsService = {
  /**
   * Enable global shortcuts with default media keys
   */
  async enable(): Promise<boolean> {
    return unwrapResult(invoke<CommandResult<boolean>>('enable_global_shortcuts'))
  },

  /**
   * Disable all global shortcuts
   */
  async disable(): Promise<boolean> {
    return unwrapResult(invoke<CommandResult<boolean>>('disable_global_shortcuts'))
  },

  /**
   * Check if shortcuts are currently enabled
   */
  async isEnabled(): Promise<boolean> {
    return unwrapResult(invoke<CommandResult<boolean>>('get_shortcuts_enabled'))
  },

  /**
   * Set shortcuts active state (without re-registering)
   */
  async setActive(enabled: boolean): Promise<boolean> {
    return unwrapResult(invoke<CommandResult<boolean>>('set_shortcuts_active', { enabled }))
  },

  /**
   * Register shortcuts with custom configuration
   */
  async registerCustom(config: ShortcutConfig): Promise<boolean> {
    return unwrapResult(invoke<CommandResult<boolean>>('register_custom_shortcuts', { config }))
  },

  /**
   * Get default shortcut configuration
   */
  async getDefaultConfig(): Promise<ShortcutConfig> {
    return unwrapResult(invoke<CommandResult<ShortcutConfig>>('get_default_shortcut_config'))
  },

  /**
   * Listen for global shortcut events
   * @returns Unlisten function to stop listening
   */
  async onShortcut(callback: (event: ShortcutEvent) => void): Promise<UnlistenFn> {
    return listen<ShortcutEvent>('global-shortcut', (event) => {
      callback(event.payload)
    })
  },
}

export default shortcutsService
