//! MPV Player service for frontend
//!
//! Provides TypeScript bindings to the Tauri MPV commands.

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

/** Playback state from MPV */
export interface PlaybackState {
  position: number
  duration: number
  is_playing: boolean
  is_paused: boolean
  volume: number
  is_muted: boolean
  filename: string | null
  media_title: string | null
}

/** Options for playing a video */
export interface PlayOptions {
  url: string
  start_position?: number
  auth_token?: string
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
// Player Service
// ============================================

export const playerService = {
  // ------------------------------------------
  // Initialization
  // ------------------------------------------

  /**
   * Initialize the MPV player
   */
  async init(): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('init_player'))
  },

  /**
   * Destroy the MPV player and free resources
   */
  async destroy(): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('destroy_player'))
  },

  // ------------------------------------------
  // Playback Control
  // ------------------------------------------

  /**
   * Play a video from URL
   */
  async playVideo(url: string): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('play_video', { url }))
  },

  /**
   * Play a video with additional options
   */
  async playVideoWithOptions(options: PlayOptions): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('play_video_with_options', { options }))
  },

  /**
   * Pause video playback
   */
  async pause(): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('pause_video'))
  },

  /**
   * Resume video playback
   */
  async resume(): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('resume_video'))
  },

  /**
   * Toggle play/pause
   * @returns true if now paused, false if now playing
   */
  async togglePlayback(): Promise<boolean> {
    return unwrapResult(invoke<CommandResult<boolean>>('toggle_playback'))
  },

  /**
   * Stop video playback
   */
  async stop(): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('stop_video'))
  },

  // ------------------------------------------
  // Seeking
  // ------------------------------------------

  /**
   * Seek to absolute position in seconds
   */
  async seek(position: number): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('seek_video', { position }))
  },

  /**
   * Seek relative to current position
   */
  async seekRelative(offset: number): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('seek_video_relative', { offset }))
  },

  // ------------------------------------------
  // Volume
  // ------------------------------------------

  /**
   * Set volume (0-100)
   */
  async setVolume(volume: number): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('set_volume', { volume }))
  },

  /**
   * Get current volume
   */
  async getVolume(): Promise<number> {
    return unwrapResult(invoke<CommandResult<number>>('get_volume'))
  },

  /**
   * Toggle mute
   * @returns true if now muted
   */
  async toggleMute(): Promise<boolean> {
    return unwrapResult(invoke<CommandResult<boolean>>('toggle_mute'))
  },

  /**
   * Set mute state
   */
  async setMute(muted: boolean): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('set_mute', { muted }))
  },

  // ------------------------------------------
  // State
  // ------------------------------------------

  /**
   * Get current playback state
   */
  async getState(): Promise<PlaybackState> {
    return unwrapResult(invoke<CommandResult<PlaybackState>>('get_playback_state'))
  },

  /**
   * Get current playback position in seconds
   */
  async getPosition(): Promise<number> {
    return unwrapResult(invoke<CommandResult<number>>('get_position'))
  },

  /**
   * Get total duration in seconds
   */
  async getDuration(): Promise<number> {
    return unwrapResult(invoke<CommandResult<number>>('get_duration'))
  },

  // ------------------------------------------
  // Tracks
  // ------------------------------------------

  /**
   * Set audio track by index
   */
  async setAudioTrack(index: number): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('set_audio_track', { index }))
  },

  /**
   * Set subtitle track by index (0 or negative to disable)
   */
  async setSubtitleTrack(index: number): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('set_subtitle_track', { index }))
  },

  /**
   * Set playback speed (0.25 - 4.0)
   */
  async setPlaybackSpeed(speed: number): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('set_playback_speed', { speed }))
  },

  // ------------------------------------------
  // Fullscreen
  // ------------------------------------------

  /**
   * Toggle fullscreen mode
   */
  async toggleFullscreen(): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('toggle_fullscreen'))
  },

  /**
   * Set fullscreen mode
   */
  async setFullscreen(fullscreen: boolean): Promise<void> {
    await unwrapVoid(invoke<CommandResult<null>>('set_fullscreen', { fullscreen }))
  },

  /**
   * Check if player is fullscreen
   */
  async isFullscreen(): Promise<boolean> {
    return unwrapResult(invoke<CommandResult<boolean>>('is_fullscreen'))
  },
}

export default playerService
