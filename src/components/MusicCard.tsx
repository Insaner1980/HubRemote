import { memo } from 'react'
import { Music, User } from 'lucide-react'
import { jellyfinApi } from '../services'
import type { BaseItemDto } from '../types'

interface MusicCardProps {
  item: BaseItemDto
  onClick?: () => void
  variant?: 'album' | 'artist'
}

export const MusicCard = memo(function MusicCard({
  item,
  onClick,
  variant = 'album',
}: MusicCardProps) {
  const imageUrl = jellyfinApi.getPrimaryUrl(item.Id, {
    maxWidth: 300,
    quality: 90,
  })

  const isArtist = variant === 'artist' || item.Type === 'MusicArtist'

  // Get artist name for albums
  const artistName = item.AlbumArtist || item.Artists?.[0] || ''

  return (
    <button
      onClick={onClick}
      className="w-full flex-shrink-0 group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary rounded-xl"
    >
      {/* Image Container */}
      <div
        className={`relative aspect-square overflow-hidden bg-bg-secondary transition-transform duration-200 ease-out group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-black/50 ${
          isArtist ? 'rounded-full' : 'rounded-xl'
        }`}
      >
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
            {isArtist ? (
              <User className="w-12 h-12 text-text-secondary" />
            ) : (
              <Music className="w-12 h-12 text-text-secondary" />
            )}
          </div>
        )}

        {/* Hover Overlay */}
        {!isArtist && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        )}
      </div>

      {/* Info Below Card */}
      <div className={`mt-3 ${isArtist ? 'text-center' : 'text-left'}`}>
        <p className="text-sm font-medium text-text-primary line-clamp-1">
          {item.Name}
        </p>
        {!isArtist && artistName && (
          <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
            {artistName}
          </p>
        )}
        {!isArtist && item.ProductionYear && (
          <p className="text-xs text-text-secondary mt-0.5">
            {item.ProductionYear}
          </p>
        )}
        {isArtist && item.AlbumCount !== undefined && (
          <p className="text-xs text-text-secondary mt-0.5">
            {item.AlbumCount} {item.AlbumCount === 1 ? 'album' : 'albums'}
          </p>
        )}
      </div>
    </button>
  )
})
