import { useState } from 'react'
import {
  ArrowLeft,
  Play,
  Tv,
  Heart,
  Check,
  Star,
  Clock,
  Calendar,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { CastList, EpisodeCard, MediaRow } from '../components'
import { useItem, useSeasons, useEpisodes, useSimilarItems, useToggleFavorite, useTogglePlayed } from '../hooks'
import { useNavigation } from '../contexts/NavigationContext'
import { jellyfinApi } from '../services'
import type { BaseItemDto } from '../types'

interface ItemDetailProps {
  itemId: string
}

function formatRuntime(ticks: number): string {
  const minutes = Math.floor(ticks / 600000000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export default function ItemDetail({ itemId }: ItemDetailProps) {
  const { goBack, canGoBack, navigateToItem } = useNavigation()
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

  const handlePlay = () => {
    console.log('Play:', item.Name, item.Id)
    // TODO: Start playback
  }

  const handlePlayOnTV = () => {
    console.log('Play on TV:', item.Name, item.Id)
    // TODO: Open device selector
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
        onBack={canGoBack ? goBack : undefined}
        onPlay={handlePlay}
        onPlayOnTV={handlePlayOnTV}
        onToggleFavorite={handleToggleFavorite}
        onTogglePlayed={handleTogglePlayed}
        isFavorite={item.UserData?.IsFavorite}
        isPlayed={item.UserData?.Played}
      />

      {/* Cast */}
      {item.People && item.People.length > 0 && (
        <CastList people={item.People} />
      )}

      {/* Seasons & Episodes for TV Series */}
      {isSeries && (
        <SeriesContent
          seriesId={item.Id}
          onEpisodeClick={(episode) => console.log('Play episode:', episode.Name)}
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
  onPlay,
  onPlayOnTV,
  onToggleFavorite,
  onTogglePlayed,
  isFavorite,
  isPlayed,
}: {
  item: BaseItemDto
  onBack?: () => void
  onPlay: () => void
  onPlayOnTV: () => void
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

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

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
            className="btn-primary flex items-center gap-2 px-6"
          >
            <Play className="w-4 h-4 fill-current" />
            {progress > 0 ? 'Resume' : 'Play'}
          </button>

          <button
            onClick={onPlayOnTV}
            className="btn-secondary flex items-center gap-2"
          >
            <Tv className="w-4 h-4" />
            Play on TV
          </button>

          <button
            onClick={onToggleFavorite}
            className={`btn-icon ${isFavorite ? 'text-red-500' : ''}`}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={onTogglePlayed}
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
