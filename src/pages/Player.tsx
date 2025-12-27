import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize, ArrowLeft, Settings, Subtitles, AudioLines } from 'lucide-react'
import { useNavigation } from '../contexts/NavigationContext'
import { useConfigStore } from '../stores/configStore'
import { playerService } from '../services/player'
import { jellyfinApi } from '../services/jellyfin'
import type { BaseItemDto, MediaStream } from '../types'

const CONTROLS_HIDE_DELAY = 3000
const PROGRESS_REPORT_INTERVAL = 10000
const SEEK_STEP = 10
const VOLUME_STEP = 5
const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60)
  return h > 0 ? h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') : m + ':' + String(s).padStart(2,'0')
}
function ticksToSeconds(t: number) { return t / 10000000 }
function secondsToTicks(s: number) { return Math.floor(s * 10000000) }

interface PlayerProps { itemId?: string; mediaSourceId?: string; startPositionTicks?: number }
interface TrackInfo { index: number; label: string; language?: string; isDefault: boolean }

export default function Player({ itemId, mediaSourceId, startPositionTicks }: PlayerProps) {
  const { goBack, state: navState } = useNavigation()
  const { serverUrl, accessToken } = useConfigStore()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(true)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [item, setItem] = useState<BaseItemDto | null>(null)
  const [audioTracks, setAudioTracks] = useState<TrackInfo[]>([])
  const [subtitleTracks, setSubtitleTracks] = useState<TrackInfo[]>([])
  const [currentAudioTrack, setCurrentAudioTrack] = useState(0)
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1)
  const [showControls, setShowControls] = useState(true)
  const [showCenterPlay, setShowCenterPlay] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showAudioMenu, setShowAudioMenu] = useState(false)
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekPosition, setSeekPosition] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playSessionIdRef = useRef<string | null>(null)
  const centerPlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  // Controls visibility
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isPaused && !showSpeedMenu && !showAudioMenu && !showSubtitleMenu) setShowControls(false)
    }, CONTROLS_HIDE_DELAY)
  }, [isPaused, showSpeedMenu, showAudioMenu, showSubtitleMenu])

  const closeAllMenus = useCallback(() => {
    setShowSpeedMenu(false)
    setShowAudioMenu(false)
    setShowSubtitleMenu(false)
  }, [])

  // Player controls
  const togglePlayPause = useCallback(async () => {
    try {
      await playerService.togglePlayback()
      setIsPaused(p => !p)
      setShowCenterPlay(true)
      if (centerPlayTimeoutRef.current) clearTimeout(centerPlayTimeoutRef.current)
      centerPlayTimeoutRef.current = setTimeout(() => setShowCenterPlay(false), 500)
    } catch (e) { console.error('Toggle playback failed:', e) }
  }, [])

  const seekRelative = useCallback(async (delta: number) => {
    try {
      await playerService.seekRelative(delta)
      setPosition(p => Math.max(0, Math.min(duration, p + delta)))
    } catch (e) { console.error('Seek failed:', e) }
  }, [duration])

  const seekTo = useCallback(async (pos: number) => {
    try {
      await playerService.seek(pos)
      setPosition(pos)
    } catch (e) { console.error('Seek failed:', e) }
  }, [])

  const changeVolume = useCallback(async (delta: number) => {
    const newVol = Math.max(0, Math.min(100, volume + delta))
    try {
      await playerService.setVolume(newVol)
      setVolume(newVol)
      if (newVol > 0 && isMuted) setIsMuted(false)
    } catch (e) { console.error('Volume change failed:', e) }
  }, [volume, isMuted])

  const setVolumeDirectly = useCallback(async (vol: number) => {
    try {
      await playerService.setVolume(vol)
      setVolume(vol)
      if (vol > 0 && isMuted) setIsMuted(false)
    } catch (e) { console.error('Volume change failed:', e) }
  }, [isMuted])

  const toggleMute = useCallback(async () => {
    try {
      await playerService.toggleMute()
      setIsMuted(m => !m)
    } catch (e) { console.error('Mute toggle failed:', e) }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const changeSpeed = useCallback(async (speed: number) => {
    try {
      await playerService.setPlaybackSpeed(speed)
      setPlaybackSpeed(speed)
      setShowSpeedMenu(false)
    } catch (e) { console.error('Speed change failed:', e) }
  }, [])

  const changeAudioTrack = useCallback(async (index: number) => {
    try {
      await playerService.setAudioTrack(index)
      setCurrentAudioTrack(index)
      setShowAudioMenu(false)
    } catch (e) { console.error('Audio track change failed:', e) }
  }, [])

  const changeSubtitleTrack = useCallback(async (index: number) => {
    try {
      await playerService.setSubtitleTrack(index)
      setCurrentSubtitleTrack(index)
      setShowSubtitleMenu(false)
    } catch (e) { console.error('Subtitle track change failed:', e) }
  }, [])

  const handleExit = useCallback(async () => {
    await reportPlaybackStopped()
    try { await playerService.stop() } catch {}
    try { await playerService.destroy() } catch {}
    goBack()
  }, [reportPlaybackStopped, goBack])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlayPause(); break
        case 'ArrowLeft': e.preventDefault(); seekRelative(-SEEK_STEP); break
        case 'ArrowRight': e.preventDefault(); seekRelative(SEEK_STEP); break
        case 'ArrowUp': e.preventDefault(); changeVolume(VOLUME_STEP); break
        case 'ArrowDown': e.preventDefault(); changeVolume(-VOLUME_STEP); break
        case 'f': case 'F': e.preventDefault(); toggleFullscreen(); break
        case 'm': case 'M': e.preventDefault(); toggleMute(); break
        case 'Escape':
          e.preventDefault()
          if (showSpeedMenu || showAudioMenu || showSubtitleMenu) closeAllMenus()
          else handleExit()
          break
      }
      showControlsTemporarily()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlayPause, seekRelative, changeVolume, toggleFullscreen, toggleMute, handleExit, showControlsTemporarily, closeAllMenus, showSpeedMenu, showAudioMenu, showSubtitleMenu])

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
        await playerService.init()
        const { userId } = useConfigStore.getState()
        if (!userId) throw new Error('User not logged in')
        const itemData = await jellyfinApi.getItem(userId, effectiveItemId)
        if (cancelled) return
        setItem(itemData)
        const streams = itemData.MediaSources?.[0]?.MediaStreams || []
        const audio: TrackInfo[] = []
        const subs: TrackInfo[] = []
        streams.forEach((s: MediaStream, i: number) => {
          if (s.Type === 'Audio') {
            audio.push({ index: s.Index ?? i, label: s.DisplayTitle || s.Language || `Audio ${audio.length + 1}`, language: s.Language, isDefault: s.IsDefault || false })
          }
          if (s.Type === 'Subtitle') {
            subs.push({ index: s.Index ?? i, label: s.DisplayTitle || s.Language || `Subtitle ${subs.length + 1}`, language: s.Language, isDefault: s.IsDefault || false })
          }
        })
        setAudioTracks(audio)
        setSubtitleTracks(subs)
        if (audio.length > 0) setCurrentAudioTrack(audio.find(t => t.isDefault)?.index || audio[0].index)
        if (subs.length > 0) {
          const def = subs.find(t => t.isDefault)
          if (def) setCurrentSubtitleTrack(def.index)
        }
        const streamUrl = `${serverUrl}/Videos/${effectiveItemId}/stream?Static=true&mediaSourceId=${mediaSourceId || effectiveItemId}&api_key=${accessToken}`
        await playerService.playVideoWithOptions({
          url: streamUrl,
          start_position: startPositionTicks ? ticksToSeconds(startPositionTicks) : 0,
          auth_token: accessToken || undefined
        })
        const dur = await playerService.getDuration()
        setDuration(dur)
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
  }, [effectiveItemId, mediaSourceId, startPositionTicks, reportPlaybackStart])

  // Poll playback state
  useEffect(() => {
    if (!isPlaying) return
    stateIntervalRef.current = setInterval(async () => {
      try {
        const state = await playerService.getState()
        setPosition(state.position)
        setIsPaused(state.is_paused)
        if (state.duration > 0) setDuration(state.duration)
      } catch {}
    }, 500)
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
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (stateIntervalRef.current) clearInterval(stateIntervalRef.current)
      if (centerPlayTimeoutRef.current) clearTimeout(centerPlayTimeoutRef.current)
    }
  }, [])

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsSeeking(true)
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setSeekPosition(pct * duration)
  }

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSeeking) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setSeekPosition(pct * duration)
  }

  const handleProgressMouseUp = async () => {
    if (isSeeking) {
      await seekTo(seekPosition)
      setIsSeeking(false)
    }
  }

  if (error) {
    return (
      <div ref={containerRef} className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button onClick={goBack} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white">Go Back</button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div ref={containerRef} className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-white/20 border-t-white rounded-full" />
      </div>
    )
  }

  const displayPosition = isSeeking ? seekPosition : position
  const progressPct = duration > 0 ? (displayPosition / duration) * 100 : 0

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black z-50 select-none" onMouseMove={showControlsTemporarily} onClick={() => { closeAllMenus(); togglePlayPause() }} style={{ cursor: showControls ? 'default' : 'none' }}>
      {showCenterPlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/60 rounded-full p-6 animate-pulse">
            {isPaused ? <Play className="w-16 h-16 text-white" /> : <Pause className="w-16 h-16 text-white" />}
          </div>
        </div>
      )}
      <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center gap-4">
          <button onClick={handleExit} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 text-white" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-lg font-medium truncate">{item?.Name || 'Playing'}</h1>
            {item?.SeriesName && <p className="text-white/60 text-sm truncate">{item.SeriesName} - S{item.ParentIndexNumber}E{item.IndexNumber}</p>}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="mb-4 group cursor-pointer" onMouseDown={handleProgressMouseDown} onMouseMove={handleProgressMouseMove} onMouseUp={handleProgressMouseUp} onMouseLeave={() => isSeeking && handleProgressMouseUp()}>
            <div className="h-1 group-hover:h-2 bg-white/20 rounded-full transition-all relative">
              <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full" style={{ width: `${progressPct}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${progressPct}% - 6px)` }} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={togglePlayPause} className="p-2 hover:bg-white/10 rounded-full transition-colors">{isPaused ? <Play className="w-6 h-6 text-white" /> : <Pause className="w-6 h-6 text-white" />}</button>
            <span className="text-white text-sm font-mono">{formatTime(displayPosition)} / {formatTime(duration)}</span>
            <div className="flex-1" />
            <div className="relative">
              <button onClick={() => { closeAllMenus(); setShowSpeedMenu(!showSpeedMenu) }} className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1"><Settings className="w-5 h-5 text-white" /><span className="text-white text-sm">{playbackSpeed}x</span></button>
              {showSpeedMenu && (<div className="absolute bottom-full mb-2 right-0 bg-black/90 rounded-lg py-1 min-w-[100px]">{PLAYBACK_SPEEDS.map(s => (<button key={s} onClick={() => changeSpeed(s)} className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 ${s === playbackSpeed ? 'text-blue-400' : 'text-white'}`}>{s}x</button>))}</div>)}
            </div>
            <div className="relative">
              <button onClick={() => { closeAllMenus(); setShowSubtitleMenu(!showSubtitleMenu) }} className={`p-2 hover:bg-white/10 rounded-full transition-colors ${currentSubtitleTrack >= 0 ? 'text-blue-400' : 'text-white'}`}><Subtitles className="w-5 h-5" /></button>
              {showSubtitleMenu && (<div className="absolute bottom-full mb-2 right-0 bg-black/90 rounded-lg py-1 min-w-[150px] max-h-64 overflow-y-auto"><button onClick={() => changeSubtitleTrack(-1)} className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 ${currentSubtitleTrack < 0 ? 'text-blue-400' : 'text-white'}`}>Off</button>{subtitleTracks.map(t => (<button key={t.index} onClick={() => changeSubtitleTrack(t.index)} className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 ${t.index === currentSubtitleTrack ? 'text-blue-400' : 'text-white'}`}>{t.label}</button>))}</div>)}
            </div>
            <div className="relative">
              <button onClick={() => { closeAllMenus(); setShowAudioMenu(!showAudioMenu) }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><AudioLines className="w-5 h-5" /></button>
              {showAudioMenu && (<div className="absolute bottom-full mb-2 right-0 bg-black/90 rounded-lg py-1 min-w-[150px] max-h-64 overflow-y-auto">{audioTracks.map(t => (<button key={t.index} onClick={() => changeAudioTrack(t.index)} className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 ${t.index === currentAudioTrack ? 'text-blue-400' : 'text-white'}`}>{t.label}</button>))}</div>)}
            </div>
            <div className="flex items-center gap-2 group">
              <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-full transition-colors">{isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-white" /> : volume < 50 ? <Volume1 className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}</button>
              <input type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={e => setVolumeDirectly(parseInt(e.target.value))} className="w-0 group-hover:w-20 transition-all duration-200 accent-blue-500" />
            </div>
            <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full transition-colors">{isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
