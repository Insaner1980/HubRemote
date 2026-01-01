import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Cast } from 'lucide-react'
import { useNavigation } from '../contexts/NavigationContext'
import { useConfigStore } from '../stores/configStore'
import { playerService } from '../services/player'
import { jellyfinApi } from '../services/jellyfin'
import type { BaseItemDto } from '../types'

const PROGRESS_REPORT_INTERVAL = 10000

function ticksToSeconds(t: number) { return t / 10000000 }
function secondsToTicks(s: number) { return Math.floor(s * 10000000) }

interface PlayerProps { itemId?: string; mediaSourceId?: string; startPositionTicks?: number }

export default function Player({ itemId, mediaSourceId, startPositionTicks }: PlayerProps) {
  const { goBack, navigate, state: navState } = useNavigation()
  const { serverUrl, accessToken } = useConfigStore()
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isPaused, setIsPaused] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [item, setItem] = useState<BaseItemDto | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playSessionIdRef = useRef<string | null>(null)
  const effectiveItemId = itemId || navState.params?.itemId

  // Jellyfin playback reporting
  const reportPlaybackStart = useCallback(async () => {
    if (!effectiveItemId || !serverUrl || !accessToken) return
    try {
      playSessionIdRef.current = crypto.randomUUID()
      await fetch(`${serverUrl}/Sessions/Playing`, {
        method: 'POST',
        headers: { 'X-Emby-Authorization': `MediaBrowser Token="${accessToken}"`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ItemId: effectiveItemId, MediaSourceId: mediaSourceId || effectiveItemId, PlaySessionId: playSessionIdRef.current, PositionTicks: startPositionTicks || 0, IsPaused: false, VolumeLevel: volume, PlayMethod: 'DirectPlay' })
      })
    } catch (e) { console.error('Failed to report playback start:', e) }
  }, [effectiveItemId, serverUrl, accessToken, mediaSourceId, startPositionTicks, volume])

  const reportPlaybackProgress = useCallback(async () => {
    if (!effectiveItemId || !serverUrl || !accessToken || !playSessionIdRef.current) return
    try {
      await fetch(`${serverUrl}/Sessions/Playing/Progress`, {
        method: 'POST',
        headers: { 'X-Emby-Authorization': `MediaBrowser Token="${accessToken}"`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ItemId: effectiveItemId, MediaSourceId: mediaSourceId || effectiveItemId, PlaySessionId: playSessionIdRef.current, PositionTicks: secondsToTicks(position), IsPaused: isPaused, VolumeLevel: volume, PlayMethod: 'DirectPlay' })
      })
    } catch (e) { console.error('Failed to report playback progress:', e) }
  }, [effectiveItemId, serverUrl, accessToken, mediaSourceId, position, isPaused, volume])

  const reportPlaybackStopped = useCallback(async () => {
    if (!effectiveItemId || !serverUrl || !accessToken || !playSessionIdRef.current) return
    try {
      await fetch(`${serverUrl}/Sessions/Playing/Stopped`, {
        method: 'POST',
        headers: { 'X-Emby-Authorization': `MediaBrowser Token="${accessToken}"`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ItemId: effectiveItemId, MediaSourceId: mediaSourceId || effectiveItemId, PlaySessionId: playSessionIdRef.current, PositionTicks: secondsToTicks(position), PlayMethod: 'DirectPlay' })
      })
    } catch (e) { console.error('Failed to report playback stopped:', e) }
  }, [effectiveItemId, serverUrl, accessToken, mediaSourceId, position])

  const handleExit = useCallback(async () => {
    await reportPlaybackStopped()
    try { await playerService.stop() } catch { /* Player may already be stopped */ }
    try { await playerService.destroy() } catch { /* Player may already be destroyed */ }
    goBack()
  }, [reportPlaybackStopped, goBack])

  // Initialize player and load item
  useEffect(() => {
    if (!effectiveItemId) {
      setError('No item ID provided')
      setIsLoading(false)
      return
    }
    let cancelled = false
    const init = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Initialize MPV (will open fullscreen with OSC)
        await playerService.init()

        const { userId } = useConfigStore.getState()
        if (!userId) throw new Error('User not logged in')
        const itemData = await jellyfinApi.getItem(userId, effectiveItemId)
        if (cancelled) return
        setItem(itemData)

        // Check if item is playable
        if (itemData.Type === 'Series' || itemData.Type === 'Season') {
          throw new Error(`Cannot play ${itemData.Type} directly. Please select an episode.`)
        }

        // Get stream URL from Jellyfin
        const playbackInfo = await jellyfinApi.getPlaybackInfo(effectiveItemId, userId)
        if (!playbackInfo) {
          if (!itemData.MediaSources?.length) {
            throw new Error(`No media sources available for "${itemData.Name}"`)
          }
          throw new Error(`Failed to get playback info for "${itemData.Name}"`)
        }

        await playerService.playVideoWithOptions({
          url: playbackInfo.url,
          start_position: startPositionTicks ? ticksToSeconds(startPositionTicks) : 0,
          auth_token: accessToken || undefined
        })

        setIsPlaying(true)
        setIsPaused(false)
        setIsLoading(false)
        await reportPlaybackStart()
      } catch (e: unknown) {
        if (!cancelled) {
          setError((e as Error).message || 'Failed to initialize player')
          setIsLoading(false)
        }
      }
    }
    init()
    return () => { cancelled = true }
  }, [effectiveItemId, mediaSourceId, startPositionTicks, reportPlaybackStart, accessToken])

  // Poll playback state for Jellyfin reporting
  useEffect(() => {
    if (!isPlaying) return
    stateIntervalRef.current = setInterval(async () => {
      try {
        const state = await playerService.getState()
        setPosition(state.position)
        setIsPaused(state.is_paused)
        setVolume(state.volume)
      } catch { /* Ignore state polling errors during playback */ }
    }, 1000)
    return () => { if (stateIntervalRef.current) clearInterval(stateIntervalRef.current) }
  }, [isPlaying])

  // Progress reporting interval
  useEffect(() => {
    if (!isPlaying) return
    progressIntervalRef.current = setInterval(reportPlaybackProgress, PROGRESS_REPORT_INTERVAL)
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current) }
  }, [isPlaying, reportPlaybackProgress])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (stateIntervalRef.current) clearInterval(stateIntervalRef.current)
    }
  }, [])

  // Keyboard: ESC to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleExit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleExit])

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button onClick={goBack} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white">Go Back</button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-white/20 border-t-white rounded-full" />
      </div>
    )
  }

  // When playing, show minimal UI - MPV is fullscreen with its own controls
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="text-center text-white">
        <p className="text-lg mb-2">Now Playing: {item?.Name}</p>
        {item?.SeriesName && <p className="text-white/60 mb-4">{item.SeriesName} - S{item.ParentIndexNumber}E{item.IndexNumber}</p>}
        <p className="text-white/40 text-sm mb-4">Video is playing in fullscreen MPV player</p>
        <p className="text-white/40 text-sm mb-4">Use MPV controls (mouse/keyboard) to control playback</p>
        <p className="text-white/40 text-sm mb-4">Press ESC or F in MPV to exit fullscreen</p>
        <div className="flex items-center gap-3">
          <button onClick={handleExit} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white">
            <ArrowLeft className="w-4 h-4" />
            Stop & Go Back
          </button>
          <button onClick={() => navigate('remote')} className="flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-hover rounded text-white">
            <Cast className="w-4 h-4" />
            Open Remote
          </button>
        </div>
      </div>
    </div>
  )
}
