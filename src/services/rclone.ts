/**
 * Rclone mount service
 *
 * Provides frontend integration with the Rust rclone module
 * for mounting/unmounting cloud storage.
 */

import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

// Types matching Rust structs

export interface RcloneConfig {
  rclonePath: string
  remoteName: string
  remoteFolder: string
  mountPoint: string
  vfsCacheMode: string
  autoMount: boolean
}

export interface MountStatus {
  isMounted: boolean
  mountPoint: string
  remoteName: string
  remoteFolder: string
  error?: string
}

interface CommandResult<T> {
  success: boolean
  data?: T
  error?: string
}

export type RcloneStatus = 'idle' | 'mounting' | 'mounted' | 'unmounting' | 'unmounted' | 'error'

// Rclone service

export const rcloneService = {
  /**
   * Mount the drive with given configuration
   */
  async mount(config: RcloneConfig): Promise<MountStatus> {
    try {
      const result = await invoke<CommandResult<MountStatus>>('mount_drive', { config })
      if (!result.success) {
        throw new Error(result.error || 'Failed to mount drive')
      }
      return result.data!
    } catch (error) {
      console.error('Failed to mount drive:', error)
      throw error
    }
  },

  /**
   * Unmount the drive
   */
  async unmount(config: RcloneConfig): Promise<boolean> {
    try {
      const result = await invoke<CommandResult<boolean>>('unmount_drive', { config })
      if (!result.success) {
        throw new Error(result.error || 'Failed to unmount drive')
      }
      return result.data ?? true
    } catch (error) {
      console.error('Failed to unmount drive:', error)
      throw error
    }
  },

  /**
   * Check current mount status
   */
  async checkStatus(config: RcloneConfig): Promise<MountStatus> {
    try {
      const result = await invoke<CommandResult<MountStatus>>('check_mount_status', { config })
      if (!result.success) {
        throw new Error(result.error || 'Failed to check mount status')
      }
      return result.data!
    } catch (error) {
      console.error('Failed to check mount status:', error)
      throw error
    }
  },

  /**
   * Check if rclone is installed
   */
  async checkRclone(rclonePath: string): Promise<string> {
    try {
      const result = await invoke<CommandResult<string>>('check_rclone', { rclonePath })
      if (!result.success) {
        throw new Error(result.error || 'Rclone not found')
      }
      return result.data!
    } catch (error) {
      console.error('Failed to check rclone:', error)
      throw error
    }
  },

  /**
   * Get default rclone configuration
   */
  async getDefaultConfig(): Promise<RcloneConfig> {
    try {
      const result = await invoke<CommandResult<RcloneConfig>>('get_default_rclone_config')
      if (!result.success) {
        throw new Error(result.error || 'Failed to get default config')
      }
      return result.data!
    } catch (error) {
      console.error('Failed to get default rclone config:', error)
      throw error
    }
  },

  /**
   * Listen for rclone status events
   */
  async onStatusChange(callback: (status: RcloneStatus) => void): Promise<UnlistenFn> {
    return listen<RcloneStatus>('rclone-status', (event) => {
      callback(event.payload)
    })
  },
}

export default rcloneService
