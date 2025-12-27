import { useRef, useState, useCallback, memo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MediaCard } from './MediaCard'
import type { BaseItemDto } from '../types'

interface MediaRowProps {
  title: string
  items: BaseItemDto[]
  onItemClick?: (item: BaseItemDto) => void
  isLoading?: boolean
  cardSize?: 'sm' | 'md' | 'lg'
}

export const MediaRow = memo(function MediaRow({
  title,
  items,
  onItemClick,
  isLoading = false,
  cardSize = 'md',
}: MediaRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    setShowLeftArrow(scrollLeft > 10)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
  }, [])

  const scroll = useCallback((direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.8
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }, [])

  if (!isLoading && items.length === 0) {
    return null
  }

  return (
    <section className="relative group/row">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {items.length > 5 && (
          <button className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            See All
          </button>
        )}
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-bg-primary to-transparent flex items-center justify-start pl-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <div className="w-8 h-8 rounded-full bg-bg-secondary/90 backdrop-blur flex items-center justify-center hover:bg-bg-hover transition-colors">
              <ChevronLeft className="w-5 h-5 text-text-primary" />
            </div>
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && items.length > 3 && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-bg-primary to-transparent flex items-center justify-end pr-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
            aria-label="Scroll right"
          >
            <div className="w-8 h-8 rounded-full bg-bg-secondary/90 backdrop-blur flex items-center justify-center hover:bg-bg-hover transition-colors">
              <ChevronRight className="w-5 h-5 text-text-primary" />
            </div>
          </button>
        )}

        {/* Items Container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-4"
        >
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, i) => (
              <MediaCardSkeleton key={i} size={cardSize} />
            ))
          ) : (
            items.map((item) => (
              <MediaCard
                key={item.Id}
                item={item}
                onClick={onItemClick}
                size={cardSize}
              />
            ))
          )}
        </div>
      </div>
    </section>
  )
})

function MediaCardSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-28',
    md: 'w-36',
    lg: 'w-44',
  }

  return (
    <div className={`${sizeClasses[size]} flex-shrink-0`}>
      <div className="aspect-[2/3] rounded-xl bg-bg-secondary animate-pulse" />
    </div>
  )
}
