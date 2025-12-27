import { memo, useMemo } from 'react'
import { Play, Info, Star } from 'lucide-react'
import { jellyfinApi } from '../services'
import type { BaseItemDto } from '../types'

interface HeroBannerProps {
  items: BaseItemDto[]
  onPlay?: (item: BaseItemDto) => void
  onMoreInfo?: (item: BaseItemDto) => void
  isLoading?: boolean
}

function formatRuntime(ticks: number): string {
  const minutes = Math.floor(ticks / 600000000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
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
    <section className="relative w-full aspect-[16/10] max-h-[500px] overflow-hidden">
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
      <div className="absolute inset-0 flex flex-col justify-end p-4 pb-6">
        {/* Logo or Title */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={featuredItem.Name}
            className="max-w-[200px] max-h-16 object-contain object-left mb-3"
          />
        ) : (
          <h1 className="text-2xl font-bold text-text-primary mb-2 line-clamp-2">
            {featuredItem.Name}
          </h1>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary mb-3">
          {rating && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              {rating.toFixed(1)}
            </span>
          )}
          {year && <span>{year}</span>}
          {featuredItem.OfficialRating && (
            <span className="px-1.5 py-0.5 border border-text-secondary/50 rounded text-xs">
              {featuredItem.OfficialRating}
            </span>
          )}
          {runtime && <span>{runtime}</span>}
          {genres && <span className="text-text-secondary/80">{genres}</span>}
        </div>

        {/* Overview */}
        {featuredItem.Overview && (
          <p className="text-sm text-text-secondary line-clamp-2 mb-4 max-w-lg">
            {featuredItem.Overview}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onPlay?.(featuredItem)}
            className="btn-primary flex items-center gap-2 px-5"
          >
            <Play className="w-4 h-4 fill-current" />
            Play
          </button>
          <button
            onClick={() => onMoreInfo?.(featuredItem)}
            className="btn-secondary flex items-center gap-2"
          >
            <Info className="w-4 h-4" />
            More Info
          </button>
        </div>
      </div>
    </section>
  )
})

function HeroBannerSkeleton() {
  return (
    <section className="relative w-full aspect-[16/10] max-h-[500px] overflow-hidden bg-bg-secondary animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-4 pb-6">
        <div className="h-8 w-48 bg-bg-hover rounded mb-3" />
        <div className="flex gap-2 mb-3">
          <div className="h-4 w-12 bg-bg-hover rounded" />
          <div className="h-4 w-16 bg-bg-hover rounded" />
          <div className="h-4 w-20 bg-bg-hover rounded" />
        </div>
        <div className="h-4 w-full max-w-md bg-bg-hover rounded mb-2" />
        <div className="h-4 w-3/4 max-w-sm bg-bg-hover rounded mb-4" />
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-bg-hover rounded-md" />
          <div className="h-10 w-28 bg-bg-hover rounded-md" />
        </div>
      </div>
    </section>
  )
}
