import { memo, useMemo } from 'react'
import { Play, Info, Star } from 'lucide-react'
import { jellyfinApi } from '../services'
import { formatRuntime } from '../utils/formatting'
import type { BaseItemDto } from '../types'

interface HeroBannerProps {
  items: BaseItemDto[]
  onPlay?: (item: BaseItemDto) => void
  onMoreInfo?: (item: BaseItemDto) => void
  isLoading?: boolean
}

function getYear(item: BaseItemDto): string | null {
  if (item.ProductionYear) return String(item.ProductionYear)
  if (item.PremiereDate) return new Date(item.PremiereDate).getFullYear().toString()
  return null
}

export const HeroBanner = memo(function HeroBanner({
  items,
  onPlay,
  onMoreInfo,
  isLoading = false,
}: HeroBannerProps) {
  // Pick a random featured item (or first one with a backdrop)
  const featuredItem = useMemo(() => {
    if (!items.length) return null

    // Filter items that have backdrop images
    const withBackdrops = items.filter(
      (item) =>
        item.BackdropImageTags?.length ||
        item.ImageTags?.Backdrop ||
        item.ImageTags?.Primary
    )

    if (!withBackdrops.length) return items[0]

    // Pick a random one
    return withBackdrops[Math.floor(Math.random() * withBackdrops.length)]
  }, [items])

  if (isLoading) {
    return <HeroBannerSkeleton />
  }

  if (!featuredItem) {
    return null
  }

  const backdropUrl = jellyfinApi.getBackdropUrl(featuredItem.Id, {
    maxWidth: 1920,
    quality: 80,
  })

  const logoUrl = featuredItem.ImageTags?.Logo
    ? jellyfinApi.getLogoUrl(featuredItem.Id, { maxWidth: 500 })
    : null

  const year = getYear(featuredItem)
  const rating = featuredItem.CommunityRating
  const runtime = featuredItem.RunTimeTicks ? formatRuntime(featuredItem.RunTimeTicks) : null
  const genres = featuredItem.Genres?.slice(0, 3).join(' · ')

  return (
    <section className="relative w-full aspect-[21/9] max-h-[280px] overflow-hidden">
      {/* Backdrop Image */}
      <div className="absolute inset-0">
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={featuredItem.Name}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full bg-bg-secondary" />
        )}
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-3 pb-4">
        {/* Logo or Title */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={featuredItem.Name}
            className="max-w-[180px] max-h-12 object-contain object-left mb-2"
          />
        ) : (
          <h1 className="text-xl font-bold text-text-primary mb-1.5 line-clamp-1">
            {featuredItem.Name}
          </h1>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mb-2">
          {rating && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Star className="w-3 h-3 fill-current" />
              {rating.toFixed(1)}
            </span>
          )}
          {year && <span>{year}</span>}
          {featuredItem.OfficialRating && (
            <span className="px-1 py-0.5 border border-text-secondary/50 rounded text-xs">
              {featuredItem.OfficialRating}
            </span>
          )}
          {runtime && <span>{runtime}</span>}
          {genres && <span className="text-text-secondary/80">{genres}</span>}
        </div>

        {/* Overview - hidden on compact mode */}
        {featuredItem.Overview && (
          <p className="text-xs text-text-secondary line-clamp-1 mb-2 max-w-md hidden sm:block">
            {featuredItem.Overview}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onPlay?.(featuredItem)}
            className="btn-primary flex items-center gap-1.5 px-4 py-1.5 text-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Play
          </button>
          <button
            onClick={() => onMoreInfo?.(featuredItem)}
            className="btn-secondary flex items-center gap-1.5 py-1.5 text-sm"
          >
            <Info className="w-3.5 h-3.5" />
            More Info
          </button>
        </div>
      </div>
    </section>
  )
})

function HeroBannerSkeleton() {
  return (
    <section className="relative w-full aspect-[21/9] max-h-[280px] overflow-hidden bg-bg-secondary animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-3 pb-4">
        <div className="h-6 w-40 bg-bg-hover rounded mb-2" />
        <div className="flex gap-2 mb-2">
          <div className="h-3 w-10 bg-bg-hover rounded" />
          <div className="h-3 w-14 bg-bg-hover rounded" />
          <div className="h-3 w-16 bg-bg-hover rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-bg-hover rounded-md" />
          <div className="h-8 w-24 bg-bg-hover rounded-md" />
        </div>
      </div>
    </section>
  )
}
