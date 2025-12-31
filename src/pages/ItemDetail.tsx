import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Home,
  Play,
  Heart,
  Check,
  Star,
  Clock,
  Calendar,
  Loader2,
  ChevronDown,
  Tv,
  X,
  Monitor,
  Smartphone,
  Tablet,
  Tv2,
} from 'lucide-react'
import { CastList, EpisodeCard, MediaRow } from '../components'
import { useItem, useSeasons, useEpisodes, useSimilarItems, useToggleFavorite, useTogglePlayed } from '../hooks'
import { useNavigation } from '../contexts/NavigationContext'
import { useConfigStore } from '../stores/configStore'
import { jellyfinApi, streamingService } from '../services'
import { formatRuntime } from '../utils/formatting'
import { toast } from '../stores/toastStore'
import type { BaseItemDto, SessionInfo } from '../types'

interface ItemDetailProps {
  itemId: string
}

export default function ItemDetail({ itemId }: ItemDetailProps) {
  const { goBack, canGoBack, navigate, navigateToItem, navigateToPlayer } = useNavigation()
  const [showCastDialog, setShowCastDialog] = useState(false)

  const handleBack = () => {
    if (canGoBack) {
      goBack()
    } else {
      navigate('home')
    }
  }
  const { data: item, isLoading } = useItem(itemId)
  const { data: similarItems } = useSimilarItems(itemId)
  const toggleFavorite = useToggleFavorite()
  const togglePlayed = useTogglePlayed()

  if (isLoading || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
      </div>
    )
  }

  const isSeries = item.Type === 'Series'

  const handlePlay = async () => {
    // For series, play the next unwatched episode or first episode
    if (isSeries) {
      const { userId } = useConfigStore.getState()
      if (!userId) return

      const episode = await jellyfinApi.getFirstEpisode(item.Id, userId)
      if (episode) {
        const startPosition = episode.UserData?.PlaybackPositionTicks || 0
        navigateToPlayer(episode.Id, startPosition)
      }
      return
    }

    // For movies/episodes, start playback
    // Resume from position if there's progress
    const startPosition = item.UserData?.PlaybackPositionTicks || 0
    navigateToPlayer(item.Id, startPosition)
  }

  const handlePlayEpisode = (episode: BaseItemDto) => {
    const startPosition = episode.UserData?.PlaybackPositionTicks || 0
    navigateToPlayer(episode.Id, startPosition)
  }

  const handleToggleFavorite = () => {
    toggleFavorite.mutate({
      itemId: item.Id,
      isFavorite: item.UserData?.IsFavorite || false,
    })
  }

  const handleTogglePlayed = () => {
    togglePlayed.mutate({
      itemId: item.Id,
      isPlayed: item.UserData?.Played || false,
    })
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <HeroSection
        item={item}
        onBack={handleBack}
        canGoBack={canGoBack}
        onPlay={handlePlay}
        onCast={() => setShowCastDialog(true)}
        onToggleFavorite={handleToggleFavorite}
        onTogglePlayed={handleTogglePlayed}
        isFavorite={item.UserData?.IsFavorite}
        isPlayed={item.UserData?.Played}
      />

      {/* Cast to TV Dialog */}
      {showCastDialog && (
        <CastDialog
          item={item}
          onClose={() => setShowCastDialog(false)}
        />
      )}

      {/* Cast */}
      {item.People && item.People.length > 0 && (
        <CastList people={item.People} />
      )}

      {/* Seasons & Episodes for TV Series */}
      {isSeries && (
        <SeriesContent
          seriesId={item.Id}
          onEpisodeClick={handlePlayEpisode}
        />
      )}

      {/* Similar Items */}
      {similarItems && similarItems.length > 0 && (
        <div className="mt-6">
          <MediaRow
            title="More Like This"
            items={similarItems}
            onItemClick={(item) => navigateToItem(item.Id)}
            cardSize="md"
          />
        </div>
      )}
    </div>
  )
}

// Hero Section Component
function HeroSection({
  item,
  onBack,
  canGoBack = false,
  onPlay,
  onCast,
  onToggleFavorite,
  onTogglePlayed,
  isFavorite,
  isPlayed,
}: {
  item: BaseItemDto
  onBack: () => void
  canGoBack?: boolean
  onPlay: () => void
  onCast: () => void
  onToggleFavorite: () => void
  onTogglePlayed: () => void
  isFavorite?: boolean
  isPlayed?: boolean
}) {
  const backdropUrl = jellyfinApi.getBackdropUrl(item.Id, {
    maxWidth: 1920,
    quality: 80,
  })

  const posterUrl = jellyfinApi.getPrimaryUrl(item.Id, {
    maxWidth: 300,
    quality: 90,
  })

  const logoUrl = item.ImageTags?.Logo
    ? jellyfinApi.getLogoUrl(item.Id, { maxWidth: 400 })
    : null

  const progress = item.UserData?.PlaybackPositionTicks && item.RunTimeTicks
    ? (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100
    : 0

  return (
    <section className="relative">
      {/* Backdrop */}
      <div className="absolute inset-0 h-[400px]">
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full bg-bg-secondary" />
        )}
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-bg-primary/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/80 via-transparent to-transparent" />
      </div>

      {/* Back/Home Button - always visible */}
      <button
        onClick={onBack}
        aria-label={canGoBack ? 'Go back' : 'Go home'}
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
      >
        {canGoBack ? <ArrowLeft className="w-5 h-5" /> : <Home className="w-5 h-5" />}
      </button>

      {/* Content */}
      <div className="relative pt-32 px-4">
        <div className="flex gap-4">
          {/* Poster */}
          <div className="relative flex-shrink-0 w-28 sm:w-36">
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-bg-secondary shadow-2xl">
              {posterUrl && (
                <img
                  src={posterUrl}
                  alt={item.Name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            {/* Progress bar */}
            {progress > 0 && progress < 100 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 rounded-b-xl overflow-hidden">
                <div
                  className="h-full bg-accent-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2">
            {/* Logo or Title */}
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={item.Name}
                className="max-w-[180px] max-h-12 object-contain object-left mb-2"
              />
            ) : (
              <h1 className="text-2xl font-bold text-text-primary mb-2 line-clamp-2">
                {item.Name}
              </h1>
            )}

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
              {item.CommunityRating && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  {item.CommunityRating.toFixed(1)}
                </span>
              )}
              {item.ProductionYear && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {item.ProductionYear}
                </span>
              )}
              {item.RunTimeTicks && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatRuntime(item.RunTimeTicks)}
                </span>
              )}
              {item.OfficialRating && (
                <span className="px-1.5 py-0.5 border border-text-secondary/50 rounded text-xs">
                  {item.OfficialRating}
                </span>
              )}
            </div>

            {/* Genres */}
            {item.Genres && item.Genres.length > 0 && (
              <p className="text-sm text-text-secondary mt-2">
                {item.Genres.slice(0, 3).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={onPlay}
            aria-label={progress > 0 ? `Resume ${item.Name}` : `Play ${item.Name}`}
            className="btn-primary flex items-center gap-2 px-6"
          >
            <Play className="w-4 h-4 fill-current" />
            {progress > 0 ? 'Resume' : 'Play'}
          </button>

          <button
            onClick={onCast}
            aria-label={`Cast ${item.Name} to TV`}
            className="btn-secondary flex items-center gap-2"
          >
            <Tv className="w-4 h-4" />
            Cast to TV
          </button>

          <button
            onClick={onToggleFavorite}
            aria-label={isFavorite ? `Remove ${item.Name} from favorites` : `Add ${item.Name} to favorites`}
            className={`btn-icon ${isFavorite ? 'text-red-500' : ''}`}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={onTogglePlayed}
            aria-label={isPlayed ? `Mark ${item.Name} as unwatched` : `Mark ${item.Name} as watched`}
            className={`btn-icon ${isPlayed ? 'text-green-500' : ''}`}
          >
            <Check className="w-5 h-5" />
          </button>
        </div>

        {/* Overview */}
        {item.Overview && (
          <p className="text-sm text-text-secondary mt-4 leading-relaxed">
            {item.Overview}
          </p>
        )}

        {/* Tagline */}
        {item.Taglines && item.Taglines.length > 0 && (
          <p className="text-sm text-text-secondary/70 italic mt-2">
            "{item.Taglines[0]}"
          </p>
        )}

        {/* Additional Info */}
        <div className="mt-4 space-y-1 text-sm text-text-secondary">
          {item.Studios && item.Studios.length > 0 && (
            <p>
              <span className="text-text-primary">Studio:</span>{' '}
              {item.Studios.map((s) => s.Name).join(', ')}
            </p>
          )}
          {item.PremiereDate && (
            <p>
              <span className="text-text-primary">Released:</span>{' '}
              {new Date(item.PremiereDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

// Series Content Component (Seasons & Episodes)
function SeriesContent({
  seriesId,
  onEpisodeClick,
}: {
  seriesId: string
  onEpisodeClick: (episode: BaseItemDto) => void
}) {
  const { data: seasons, isLoading: seasonsLoading } = useSeasons(seriesId)
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false)

  // Select first season by default
  const currentSeasonId = selectedSeasonId || seasons?.[0]?.Id || null
  const currentSeason = seasons?.find((s) => s.Id === currentSeasonId)

  const { data: episodes, isLoading: episodesLoading } = useEpisodes(
    seriesId,
    currentSeasonId || ''
  )

  if (seasonsLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
      </div>
    )
  }

  if (!seasons || seasons.length === 0) {
    return null
  }

  return (
    <section className="mt-6">
      {/* Season Selector */}
      <div className="px-4 mb-4">
        <div className="relative inline-block">
          <button
            onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-bg-secondary rounded-lg text-text-primary font-medium hover:bg-bg-hover transition-colors"
          >
            {currentSeason?.Name || 'Select Season'}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                seasonDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {seasonDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSeasonDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-48 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                {seasons.map((season) => (
                  <button
                    key={season.Id}
                    onClick={() => {
                      setSelectedSeasonId(season.Id)
                      setSeasonDropdownOpen(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      season.Id === currentSeasonId
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    }`}
                  >
                    {season.Name}
                    {season.UserData?.UnplayedItemCount !== undefined &&
                      season.UserData.UnplayedItemCount > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-accent-primary text-white text-xs rounded-full">
                          {season.UserData.UnplayedItemCount}
                        </span>
                      )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Episodes List */}
      <div className="px-4">
        {episodesLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 p-2 rounded-lg bg-bg-secondary animate-pulse"
              >
                <div className="w-40 aspect-video rounded-lg bg-bg-hover" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-32 bg-bg-hover rounded" />
                  <div className="h-3 w-24 bg-bg-hover rounded" />
                  <div className="h-3 w-full bg-bg-hover rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : episodes && episodes.length > 0 ? (
          <div className="space-y-1">
            {episodes.map((episode) => (
              <EpisodeCard
                key={episode.Id}
                episode={episode}
                onClick={onEpisodeClick}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-text-secondary py-8">
            No episodes found
          </p>
        )}
      </div>
    </section>
  )
}

// Cast to TV Dialog
function CastDialog({
  item,
  onClose,
}: {
  item: BaseItemDto
  onClose: () => void
}) {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [casting, setCasting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true)
        const allSessions = await jellyfinApi.getSessions()
        // Show all sessions - TV apps may not support remote control but can receive playback
        setSessions(allSessions)
      } catch (e) {
        setError('Failed to load devices')
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [])

  const handleCast = async (session: SessionInfo) => {
    try {
      setCasting(true)
      setError(null)

      // Use Jellyfin's playOnSession - the TV will request the video from Jellyfin
      // and Jellyfin will handle streaming/transcoding as needed
      const startPosition = item.UserData?.PlaybackPositionTicks || 0
      await jellyfinApi.playOnSession(session.Id, [item.Id], {
        startPositionTicks: startPosition,
      })
      toast.success('Playing on TV', `Started playback on ${session.DeviceName}`)

      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to cast'
      setError(msg)
      toast.error('Cast failed', msg)
    } finally {
      setCasting(false)
    }
  }

  // Get device icon
  const getDeviceIcon = (deviceName: string, client: string) => {
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
    return Monitor
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-bg-secondary rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Cast to TV</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <Tv className="w-12 h-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-primary font-medium">No devices found</p>
              <p className="text-text-secondary text-sm mt-1">
                Open Jellyfin on your TV to see it here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-text-secondary mb-3">
                Select a device to play "{item.Name}"
              </p>
              {sessions.map((session) => {
                const DeviceIcon = getDeviceIcon(session.DeviceName, session.Client)
                return (
                  <button
                    key={session.Id}
                    onClick={() => handleCast(session)}
                    disabled={casting}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-bg-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
                  >
                    <div className="p-2 rounded-full bg-bg-secondary">
                      <DeviceIcon className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-text-primary">{session.DeviceName}</p>
                      <p className="text-sm text-text-secondary">{session.Client}</p>
                    </div>
                    {casting && <Loader2 className="w-4 h-4 text-accent-primary animate-spin" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-text-secondary text-center">
            Your files will be streamed from this computer to the TV
          </p>
        </div>
      </div>
    </div>
  )
}
