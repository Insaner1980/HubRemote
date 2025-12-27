import { useState, useRef, useCallback, useMemo } from 'react'
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Tv2,
  Subtitles,
  AudioLines,
  ChevronDown,
  X,
} from 'lucide-react'
import {
  usePlaystateCommand,
  useSeek,
  useSetVolume,
  useToggleMute,
  useSetAudioStream,
  useSetSubtitleStream,
} from '../hooks'
import { jellyfinApi } from '../services'
import type { SessionInfo, MediaStream } from '../types'

interface RemotePanelProps {
  session: SessionInfo
}

export default function RemotePanel({ session }: RemotePanelProps) {
  const { mutate: sendCommand, isPending: commandPending } = usePlaystateCommand()
  const { mutate: seek } = useSeek()
  const { mutate: setVolume } = useSetVolume()
  const { mutate: toggleMute } = useToggleMute()
  const { mutate: setAudioStream } = useSetAudioStream()
  const { mutate: setSubtitleStream } = useSetSubtitleStream()

  const [showAudioMenu, setShowAudioMenu] = useState(false)
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false)

  const nowPlaying = session.NowPlayingItem
  const playState = session.PlayState
  const isPaused = playState?.IsPaused ?? false
  const isMuted = playState?.IsMuted ?? false
  const volume = playState?.VolumeLevel ?? 100
  const positionTicks = playState?.PositionTicks ?? 0
  const durationTicks = nowPlaying?.RunTimeTicks ?? 0
  const currentAudioIndex = playState?.AudioStreamIndex ?? -1
  const currentSubtitleIndex = playState?.SubtitleStreamIndex ?? -1

  // Get audio and subtitle streams from now playing item
  const audioStreams = useMemo(
    () => nowPlaying?.MediaStreams?.filter((s) => s.Type === 'Audio') ?? [],
    [nowPlaying?.MediaStreams]
  )

  const subtitleStreams = useMemo(
    () => nowPlaying?.MediaStreams?.filter((s) => s.Type === 'Subtitle') ?? [],
    [nowPlaying?.MediaStreams]
  )

  const hasAudioOptions = audioStreams.length > 1
  const hasSubtitleOptions = subtitleStreams.length > 0

  // Format time from ticks (10,000 ticks = 1ms)
  const formatTime = useCallback((ticks: number) => {
    const totalSeconds = Math.floor(ticks / 10000000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  const progress = durationTicks > 0 ? (positionTicks / durationTicks) * 100 : 0

  // Handle progress bar click for seeking
  const progressBarRef = useRef<HTMLDivElement>(null)

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current || durationTicks === 0) return

      const rect = progressBarRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percent = Math.max(0, Math.min(100, (clickX / rect.width) * 100))
      const newPosition = Math.floor((percent / 100) * durationTicks)

      seek({ sessionId: session.Id, positionTicks: newPosition })
    },
    [session.Id, durationTicks, seek]
  )

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseInt(e.target.value, 10)
      setVolume({ sessionId: session.Id, volume: newVolume })
    },
    [session.Id, setVolume]
  )

  const handleAudioChange = useCallback(
    (index: number) => {
      setAudioStream({ sessionId: session.Id, index })
      setShowAudioMenu(false)
    },
    [session.Id, setAudioStream]
  )

  const handleSubtitleChange = useCallback(
    (index: number) => {
      setSubtitleStream({ sessionId: session.Id, index })
      setShowSubtitleMenu(false)
    },
    [session.Id, setSubtitleStream]
  )

  // Get image URL for now playing item
  const imageUrl = nowPlaying
    ? jellyfinApi.getPrimaryUrl(nowPlaying.Id, { maxWidth: 400 })
    : null

  const backdropUrl = nowPlaying
    ? jellyfinApi.getBackdropUrl(nowPlaying.Id, { maxWidth: 800, quality: 80 })
    : null

  // No active playback state
  if (!nowPlaying) {
    return (
      <div className="bg-bg-secondary rounded-2xl overflow-hidden">
        <div className="p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-bg-hover flex items-center justify-center mx-auto mb-4">
            <Tv2 className="w-10 h-10 text-text-secondary" />
          </div>
          <h3 className="text-xl font-medium text-text-primary mb-2">No Active Playback</h3>
          <p className="text-text-secondary max-w-xs mx-auto">
            Start playing something on {session.DeviceName} to control it from here.
          </p>
        </div>

        {/* Disabled Controls */}
        <div className="p-6 border-t border-border opacity-50">
          <div className="flex items-center justify-center gap-6">
            <button disabled className="p-4 rounded-full bg-bg-hover cursor-not-allowed">
              <SkipBack className="w-6 h-6 text-text-secondary" />
            </button>
            <button disabled className="p-6 rounded-full bg-bg-hover cursor-not-allowed">
              <Play className="w-10 h-10 text-text-secondary" />
            </button>
            <button disabled className="p-4 rounded-full bg-bg-hover cursor-not-allowed">
              <SkipForward className="w-6 h-6 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-2xl overflow-hidden">
      {/* Backdrop */}
      {backdropUrl && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={backdropUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-bg-secondary/60 to-transparent" />
        </div>
      )}

      {/* Now Playing Info */}
      <div className={`px-6 ${backdropUrl ? '-mt-20 relative z-10' : 'pt-6'}`}>
        <div className="flex gap-4">
          {/* Poster */}
          {imageUrl && (
            <div className="w-28 flex-shrink-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-bg-hover shadow-lg">
                <img
                  src={imageUrl}
                  alt={nowPlaying.Name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0 py-2">
            <h3 className="font-bold text-text-primary text-xl truncate">
              {nowPlaying.Name}
            </h3>

            {/* Episode info */}
            {nowPlaying.SeriesName && (
              <p className="text-text-secondary truncate mt-1">
                {nowPlaying.SeriesName}
                {nowPlaying.ParentIndexNumber !== undefined &&
                  nowPlaying.IndexNumber !== undefined && (
                    <span className="text-accent-primary font-medium">
                      {' '}
                      S{nowPlaying.ParentIndexNumber}:E{nowPlaying.IndexNumber}
                    </span>
                  )}
              </p>
            )}

            {/* Year and type */}
            <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
              {nowPlaying.ProductionYear && <span>{nowPlaying.ProductionYear}</span>}
              {nowPlaying.Type && (
                <span className="px-2 py-0.5 bg-bg-hover rounded text-xs">
                  {nowPlaying.Type}
                </span>
              )}
            </div>

            {/* Playback status indicator */}
            <div className="flex items-center gap-2 mt-3">
              <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
              <span className="text-sm text-text-secondary">
                {isPaused ? 'Paused' : 'Playing'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="px-6 mt-6">
        {/* Time display */}
        <div className="flex items-center justify-between text-sm text-text-secondary mb-2">
          <span className="font-mono">{formatTime(positionTicks)}</span>
          <span className="font-mono">{formatTime(durationTicks)}</span>
        </div>

        {/* Clickable Progress Bar */}
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          className="relative h-3 bg-bg-hover rounded-full cursor-pointer group"
        >
          {/* Progress fill */}
          <div
            className="absolute inset-y-0 left-0 bg-accent-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          {/* Thumb indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>
      </div>

      {/* Playback Controls */}
      <div className="px-6 py-8">
        <div className="flex items-center justify-center gap-6">
          {/* Previous */}
          <button
            onClick={() => sendCommand({ sessionId: session.Id, command: 'PreviousTrack' })}
            disabled={commandPending}
            className="p-4 rounded-full bg-bg-hover hover:bg-border transition-colors disabled:opacity-50 active:scale-95"
          >
            <SkipBack className="w-7 h-7 text-text-primary" />
          </button>

          {/* Play/Pause - Large center button */}
          <button
            onClick={() =>
              sendCommand({ sessionId: session.Id, command: isPaused ? 'Unpause' : 'Pause' })
            }
            disabled={commandPending}
            className={`p-6 rounded-full transition-all disabled:opacity-50 active:scale-95 ${
              isPaused
                ? 'bg-accent-primary hover:bg-accent-hover'
                : 'bg-accent-primary hover:bg-accent-hover ring-4 ring-accent-primary/30'
            }`}
          >
            {isPaused ? (
              <Play className="w-10 h-10 text-white" fill="white" />
            ) : (
              <Pause className="w-10 h-10 text-white" fill="white" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={() => sendCommand({ sessionId: session.Id, command: 'NextTrack' })}
            disabled={commandPending}
            className="p-4 rounded-full bg-bg-hover hover:bg-border transition-colors disabled:opacity-50 active:scale-95"
          >
            <SkipForward className="w-7 h-7 text-text-primary" />
          </button>

          {/* Stop */}
          <button
            onClick={() => sendCommand({ sessionId: session.Id, command: 'Stop' })}
            disabled={commandPending}
            className="p-4 rounded-full bg-bg-hover hover:bg-red-500/20 hover:text-red-500 transition-colors disabled:opacity-50 active:scale-95"
          >
            <Square className="w-6 h-6 text-text-secondary" fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Volume Control */}
      <div className="px-6 pb-6">
        <div className="flex items-center gap-4 bg-bg-hover rounded-xl p-4">
          <button
            onClick={() => toggleMute(session.Id)}
            className="p-2 rounded-full hover:bg-bg-secondary transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-text-secondary" />
            ) : (
              <Volume2 className="w-5 h-5 text-text-primary" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 bg-bg-secondary rounded-full appearance-none cursor-pointer accent-accent-primary"
          />

          <span className="text-sm text-text-secondary w-10 text-right font-mono">
            {volume}%
          </span>
        </div>
      </div>

      {/* Additional Controls (Audio & Subtitles) */}
      {(hasAudioOptions || hasSubtitleOptions) && (
        <div className="px-6 pb-6">
          <div className="flex gap-3">
            {/* Audio Track Selection */}
            {hasAudioOptions && (
              <div className="relative flex-1">
                <button
                  onClick={() => {
                    setShowAudioMenu(!showAudioMenu)
                    setShowSubtitleMenu(false)
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-bg-hover hover:bg-border rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AudioLines className="w-5 h-5 text-text-secondary" />
                    <span className="text-sm text-text-primary">Audio</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-text-secondary truncate max-w-[80px]">
                      {getStreamLabel(audioStreams.find((s) => s.Index === currentAudioIndex))}
                    </span>
                    <ChevronDown className="w-4 h-4 text-text-secondary" />
                  </div>
                </button>

                {showAudioMenu && (
                  <TrackMenu
                    streams={audioStreams}
                    currentIndex={currentAudioIndex}
                    onSelect={handleAudioChange}
                    onClose={() => setShowAudioMenu(false)}
                    showDisableOption={false}
                  />
                )}
              </div>
            )}

            {/* Subtitle Selection */}
            {hasSubtitleOptions && (
              <div className="relative flex-1">
                <button
                  onClick={() => {
                    setShowSubtitleMenu(!showSubtitleMenu)
                    setShowAudioMenu(false)
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-bg-hover hover:bg-border rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Subtitles className="w-5 h-5 text-text-secondary" />
                    <span className="text-sm text-text-primary">Subtitles</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-text-secondary truncate max-w-[80px]">
                      {currentSubtitleIndex === -1
                        ? 'Off'
                        : getStreamLabel(subtitleStreams.find((s) => s.Index === currentSubtitleIndex))}
                    </span>
                    <ChevronDown className="w-4 h-4 text-text-secondary" />
                  </div>
                </button>

                {showSubtitleMenu && (
                  <TrackMenu
                    streams={subtitleStreams}
                    currentIndex={currentSubtitleIndex}
                    onSelect={handleSubtitleChange}
                    onClose={() => setShowSubtitleMenu(false)}
                    showDisableOption={true}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Track selection menu component
function TrackMenu({
  streams,
  currentIndex,
  onSelect,
  onClose,
  showDisableOption,
}: {
  streams: MediaStream[]
  currentIndex: number
  onSelect: (index: number) => void
  onClose: () => void
  showDisableOption: boolean
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-bg-primary border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
        {/* Disable option for subtitles */}
        {showDisableOption && (
          <button
            onClick={() => onSelect(-1)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              currentIndex === -1
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'hover:bg-bg-hover text-text-primary'
            }`}
          >
            <X className="w-4 h-4" />
            <span className="text-sm">Off</span>
          </button>
        )}

        {streams.map((stream) => (
          <button
            key={stream.Index}
            onClick={() => onSelect(stream.Index)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              stream.Index === currentIndex
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'hover:bg-bg-hover text-text-primary'
            }`}
          >
            <span className="text-sm flex-1">{getStreamLabel(stream)}</span>
            {stream.IsDefault && (
              <span className="text-xs text-text-secondary bg-bg-hover px-2 py-0.5 rounded">
                Default
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  )
}

// Helper to get stream display label
function getStreamLabel(stream?: MediaStream): string {
  if (!stream) return 'Unknown'

  if (stream.DisplayTitle) return stream.DisplayTitle

  const parts: string[] = []

  if (stream.Language) {
    parts.push(stream.DisplayLanguage || stream.Language)
  }

  if (stream.Title) {
    parts.push(stream.Title)
  }

  if (stream.Codec) {
    parts.push(stream.Codec.toUpperCase())
  }

  if (stream.Channels) {
    parts.push(`${stream.Channels}ch`)
  }

  return parts.join(' - ') || `Track ${stream.Index}`
}
