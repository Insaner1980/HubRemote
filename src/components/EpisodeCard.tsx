import { memo } from 'react'
import { Play, Check } from 'lucide-react'
import { jellyfinApi } from '../services'
import type { BaseItemDto } from '../types'

interface EpisodeCardProps {
  episode: BaseItemDto
  onClick?: (episode: BaseItemDto) => void
}

function formatRuntime(ticks: number): string {
  const minutes = Math.floor(ticks / 600000000)
  return `${minutes} min`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getProgressPercent(episode: BaseItemDto): number {
  const userData = episode.UserData
  if (!userData || !episode.RunTimeTicks) return 0

  const position = userData.PlaybackPositionTicks
  if (!position) return 0

  return Math.min(100, (position / episode.RunTimeTicks) * 100)
}

export const EpisodeCard = memo(function EpisodeCard({
  episode,
  onClick,
}: EpisodeCardProps) {
  const imageUrl = jellyfinApi.getImageUrl(episode.Id, 'Primary', {
    maxWidth: 400,
    quality: 85,
  })

  // Fall back to thumb or backdrop for episode images
  const thumbUrl = episode.ImageTags?.Thumb
    ? jellyfinApi.getThumbUrl(episode.Id, { maxWidth: 400 })
    : episode.ImageTags?.Primary
      ? imageUrl
      : null

  const progress = getProgressPercent(episode)
  const isWatched = episode.UserData?.Played
  const episodeNumber = episode.IndexNumber
  const seasonNumber = episode.ParentIndexNumber

  return (
    <button
      onClick={() => onClick?.(episode)}
      className="w-full flex gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors text-left group"
    >
      {/* Thumbnail */}
      <div className="relative w-40 flex-shrink-0">
        <div className="aspect-video rounded-lg overflow-hidden bg-bg-secondary">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={episode.Name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-8 h-8 text-text-secondary" />
            </div>
          )}

          {/* Play overlay on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-accent-primary flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-current" />
            </div>
          </div>

          {/* Progress bar */}
          {progress > 0 && progress < 100 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
              <div
                className="h-full bg-accent-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Episode number badge */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-xs font-medium text-white">
          E{episodeNumber}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-start gap-2">
          <h4 className="font-medium text-text-primary line-clamp-1 flex-1">
            {episode.Name}
          </h4>
          {isWatched && (
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-green-500" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-text-secondary mt-1">
          {seasonNumber !== undefined && episodeNumber !== undefined && (
            <span>
              S{String(seasonNumber).padStart(2, '0')}E{String(episodeNumber).padStart(2, '0')}
            </span>
          )}
          {episode.RunTimeTicks && (
            <>
              <span className="text-text-secondary/50">·</span>
              <span>{formatRuntime(episode.RunTimeTicks)}</span>
            </>
          )}
          {episode.PremiereDate && (
            <>
              <span className="text-text-secondary/50">·</span>
              <span>{formatDate(episode.PremiereDate)}</span>
            </>
          )}
        </div>

        {episode.Overview && (
          <p className="text-sm text-text-secondary line-clamp-2 mt-2">
            {episode.Overview}
          </p>
        )}
      </div>
    </button>
  )
})
