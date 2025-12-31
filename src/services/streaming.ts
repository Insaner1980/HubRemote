//! Streaming service for Cast to TV functionality
//!
//! Provides TypeScript bindings to the Tauri streaming commands.

import { invoke } from '@tauri-apps/api/core'

// ============================================
// Types
// ============================================

/** Result from Tauri commands */
interface CommandResult<T> {
  success: boolean
  data: T | null
  error: string | null
}

/** Stream info returned when creating a stream */
export interface StreamInfo {
  stream_id: string
  stream_url: string
  server_url: string
}

// ============================================
// Helper Functions
// ============================================

/** Unwrap command result or throw error */
async function unwrapResult<T>(promise: Promise<CommandResult<T>>): Promise<T> {
  const result = await promise
  if (!result.success || result.error) {
    throw new Error(result.error || 'Unknown error')
  }
  return result.data as T
}

/** Unwrap void command result */
async function unwrapVoid(promise: Promise<CommandResult<null>>): Promise<void> {
  const result = await promise
  if (!result.success || result.error) {
    throw new Error(result.error || 'Unknown error')
  }
}

// ============================================
// Streaming Service
// ============================================

export const streamingService = {
  /**
   * Start the streaming server
   * @param port - Optional port number (defaults to 8765)
   * @returns Server URL (e.g., "http://192.168.1.100:8765")
   */
  async startServer(port?: number): Promise<string> {
    return invoke<string>('start_stream_server', { port })
  },

  /**
   * Stop the streaming server
   */
  async stopServer(): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('stop_stream_server'))
  },

  /**
   * Check if streaming server is running
   */
  async isServerRunning(): Promise<boolean> {
    return unwrapResult(invoke<CommandResult<boolean>>('is_stream_server_running'))
  },

  /**
   * Get streaming server URL
   */
  async getServerUrl(): Promise<string | null> {
    return unwrapResult(invoke<CommandResult<string | null>>('get_stream_server_url'))
  },

  /**
   * Create a stream for a file
   * @param filePath - Full path to the video file
   * @returns Stream info with URL
   */
  async createStream(filePath: string): Promise<StreamInfo> {
    return invoke<StreamInfo>('create_stream', { filePath })
  },

  /**
   * Remove a stream
   * @param streamId - Stream ID to remove
   */
  async removeStream(streamId: string): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('remove_stream', { streamId }))
  },

  /**
   * Get local IP address
   */
  async getLocalIp(): Promise<string> {
    return unwrapResult(invoke<CommandResult<string>>('get_local_ip'))
  },

  /**
   * Helper: Start server and create stream for a file
   * @param filePath - Full path to the video file
   * @returns Stream URL ready for TV
   */
  async streamFile(filePath: string): Promise<StreamInfo> {
    // Ensure server is running
    const isRunning = await this.isServerRunning()
    if (!isRunning) {
      await this.startServer()
    }

    // Create stream
    return this.createStream(filePath)
  },
}

export default streamingService
