import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Tv,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Tv2,
  Cast,
  Check,
} from 'lucide-react'
import { jellyfinKeys } from '../hooks'
import { useSessionStore, useConfigStore } from '../stores'
import { jellyfinApi } from '../services'
import { RemotePanel } from '../components'
import type { SessionInfo } from '../types'

export default function Remote() {
  const { selectedSession, selectSession, updateSelectedSession } = useSessionStore()
  const isAuthenticated = useConfigStore((state) => state.isAuthenticated())

  // Use faster polling (1.5s) when a session is selected and playing
  const isPlaying = selectedSession?.NowPlayingItem != null
  const pollingInterval = isPlaying ? 1500 : 5000

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: jellyfinKeys.sessions(),
    queryFn: () => jellyfinApi.getSessions(),
    enabled: isAuthenticated,
    refetchInterval: pollingInterval,
  })

  // Update selected session when sessions list updates
  useEffect(() => {
    if (sessions) {
      updateSelectedSession(sessions)
    }
  }, [sessions, updateSelectedSession])

  // Show all sessions (some may not support full remote control but can still receive playback)
  const controllableSessions = useMemo(
    () => sessions ?? [],
    [sessions]
  )

  // Auto-select first playing session if none selected
  useEffect(() => {
    if (!selectedSession && controllableSessions.length > 0) {
      const playingSession = controllableSessions.find((s) => s.NowPlayingItem)
      if (playingSession) {
        selectSession(playingSession)
      }
    }
  }, [selectedSession, controllableSessions, selectSession])

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Tv className="w-6 h-6 text-accent-primary" />
        <h1 className="text-2xl font-semibold text-text-primary">Remote Control</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">Failed to load sessions</p>
          <p className="text-sm text-text-secondary mt-2">Please check your connection</p>
        </div>
      ) : controllableSessions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {/* Session List */}
          <div>
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
              Active Devices ({controllableSessions.length})
            </h2>
            <div className="grid gap-2">
              {controllableSessions.map((session) => (
                <SessionCard
                  key={session.Id}
                  session={session}
                  isSelected={selectedSession?.Id === session.Id}
                  onSelect={() => selectSession(session)}
                />
              ))}
            </div>
          </div>

          {/* Remote Control Panel */}
          {selectedSession && <RemotePanel session={selectedSession} />}
        </div>
      )}
    </div>
  )
}

// Session Card Component
function SessionCard({
  session,
  isSelected,
  onSelect,
}: {
  session: SessionInfo
  isSelected: boolean
  onSelect: () => void
}) {
  const DeviceIcon = getDeviceIcon(session.DeviceName, session.Client)
  const nowPlaying = session.NowPlayingItem
  const isPaused = session.PlayState?.IsPaused

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
        isSelected
          ? 'bg-accent-primary/15 border-2 border-accent-primary'
          : 'bg-bg-secondary hover:bg-bg-hover border-2 border-transparent'
      }`}
    >
      {/* Device Icon */}
      <div className={`p-3 rounded-full ${isSelected ? 'bg-accent-primary' : 'bg-bg-hover'}`}>
        <DeviceIcon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-text-secondary'}`} />
      </div>

      {/* Device Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary truncate">{session.DeviceName}</span>
          {isSelected && <Check className="w-4 h-4 text-accent-primary flex-shrink-0" />}
        </div>
        <div className="text-sm text-text-secondary truncate">
          {session.Client}
          {session.UserName && <span className="text-text-secondary/60"> - {session.UserName}</span>}
        </div>
        {nowPlaying && (
          <div className="text-sm text-accent-primary truncate mt-1 flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
            {nowPlaying.SeriesName ? (
              <span>
                {nowPlaying.SeriesName} - {nowPlaying.Name}
              </span>
            ) : (
              <span>{nowPlaying.Name}</span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

// Empty State
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-bg-secondary flex items-center justify-center mb-4">
        <Cast className="w-10 h-10 text-text-secondary" />
      </div>
      <h3 className="text-xl font-medium text-text-primary mb-2">No Active Devices</h3>
      <p className="text-text-secondary max-w-sm">
        Start playing something on a Jellyfin client to control it from here.
        Make sure your devices are on the same network.
      </p>
      <div className="mt-6 text-sm text-text-secondary/60">
        <p>Supported clients include:</p>
        <p className="mt-1">Jellyfin Web, Android, iOS, TV apps, and more</p>
      </div>
    </div>
  )
}

// Helper to get device icon
function getDeviceIcon(deviceName: string, client: string) {
  const name = (deviceName + client).toLowerCase()

  if (name.includes('tv') || name.includes('android tv') || name.includes('fire') || name.includes('tizen') || name.includes('webos')) {
    return Tv2
  }
  if (name.includes('phone') || name.includes('mobile') || name.includes('ios') || name.includes('iphone')) {
    return Smartphone
  }
  if (name.includes('android') && !name.includes('tv')) {
    return Smartphone
  }
  if (name.includes('tablet') || name.includes('ipad')) {
    return Tablet
  }
  if (name.includes('chrome') || name.includes('web') || name.includes('browser') || name.includes('firefox') || name.includes('safari')) {
    return Monitor
  }
  return Monitor
}
