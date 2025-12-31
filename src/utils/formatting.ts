/**
 * Formatting utilities for time and duration display
 */

/**
 * Convert Jellyfin ticks to human-readable duration
 * @param ticks - Duration in Jellyfin ticks (1 tick = 100 nanoseconds)
 * @param shortFormat - Use short format like "30m" instead of "30 min"
 * @returns Formatted duration string (e.g., "1h 30m" or "45 min")
 */
export function formatRuntime(ticks: number, shortFormat = false): string {
  const minutes = Math.floor(ticks / 600000000)

  if (minutes < 60) {
    return shortFormat ? `${minutes}m` : `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`
  }

  return `${hours}h`
}

/**
 * Convert seconds to mm:ss or h:mm:ss format for playback progress
 * @param seconds - Duration in seconds
 * @returns Formatted time string (e.g., "1:23" or "1:23:45")
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return `${m}:${s.toString().padStart(2, '0')}`
}
