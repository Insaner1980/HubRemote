import { memo } from 'react'
import { Play } from 'lucide-react'
import { jellyfinApi } from '../services'
import { formatRuntime } from '../utils/formatting'
import type { BaseItemDto } from '../types'

interface MediaCardProps {
  item: BaseItemDto
  onClick?: (item: BaseItemDto) => void
  showTitle?: boolean
  size?: 'sm' | 'md' | 'lg'
}

function formatEpisodeLabel(item: BaseItemDto): string | null {
  if (item.Type !== 'Episode') return null

  const season = item.ParentIndexNumber
  const episode = item.IndexNumber

  if (season !== undefined && episode !== undefined) {
    return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
  }

  return null
}

function getProgressPercent(item: BaseItemDto): number {
  const userData = item.UserData
  if (!userData || !item.RunTimeTicks) return 0

  const position = userData.PlaybackPositionTicks
  if (!position) return 0

  return Math.min(100, (position / item.RunTimeTicks) * 100)
}

export const MediaCard = memo(function MediaCard({
  item,
  onClick,
  showTitle = true,
  size = 'md',
}: MediaCardProps) {
  const imageUrl = jellyfinApi.getPrimaryUrl(item.Id, {
    maxWidth: size === 'sm' ? 200 : size === 'md' ? 300 : 400,
    quality: 90,
  })

  const progress = getProgressPercent(item)
  const episodeLabel = formatEpisodeLabel(item)
  const hasProgress = progress > 0 && progress < 100

  const sizeClasses = {
    sm: 'w-28',
    md: 'w-36',
    lg: 'w-44',
  }

  return (
    <button
      onClick={() => onClick?.(item)}
      aria-label={`Play ${item.Type === 'Episode' ? `${item.SeriesName}: ${item.Name}` : item.Name}`}
      className={`${sizeClasses[size]} flex-shrink-0 group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary rounded-xl`}
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-bg-secondary transition-transform duration-200 ease-out group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-black/50">
        {/* Image */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.Name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-hover">
            <Play className="w-8 h-8 text-text-secondary" />
          </div>
        )}

        {/* Hover Overlay with Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Title on Hover */}
        {showTitle && (
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
            <p className="text-sm font-medium text-white line-clamp-2 text-left">
              {item.Type === 'Episode' ? item.SeriesName : item.Name}
            </p>
            {episodeLabel && (
              <p className="text-xs text-text-secondary mt-0.5 text-left">
                {episodeLabel} · {item.Name}
              </p>
            )}
            {item.ProductionYear && item.Type !== 'Episode' && (
              <p className="text-xs text-text-secondary mt-0.5 text-left">
                {item.ProductionYear}
                {item.RunTimeTicks && ` · ${formatRuntime(item.RunTimeTicks, true)}`}
              </p>
            )}
          </div>
        )}

        {/* Episode Badge (always visible for episodes) */}
        {episodeLabel && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 rounded text-xs font-medium text-white backdrop-blur-sm">
            {episodeLabel}
          </div>
        )}

        {/* Progress Bar */}
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-accent-primary progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Unplayed indicator */}
        {item.UserData && !item.UserData.Played && item.UserData.UnplayedItemCount === undefined && !hasProgress && (
          <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-accent-primary rounded-full shadow-lg" />
        )}

        {/* Unplayed count for series */}
        {item.UserData?.UnplayedItemCount !== undefined && item.UserData.UnplayedItemCount > 0 && (
          <div className="absolute top-2 right-2 min-w-5 h-5 px-1.5 bg-accent-primary rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              {item.UserData.UnplayedItemCount}
            </span>
          </div>
        )}
      </div>

      {/* Title Below Card (optional, for non-hover displays) */}
      {!showTitle && (
        <div className="mt-2 px-1">
          <p className="text-sm font-medium text-text-primary line-clamp-1 text-left">
            {item.Name}
          </p>
          {item.ProductionYear && (
            <p className="text-xs text-text-secondary text-left">{item.ProductionYear}</p>
          )}
        </div>
      )}
    </button>
  )
})
