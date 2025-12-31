import { useState, useMemo, useCallback, useEffect } from 'react'
import { Loader2, Search, FolderOpen } from 'lucide-react'
import { MediaCard, FilterSidebar, LibraryHeader } from '../components'
import { MusicCard } from '../components/MusicCard'
import { useLibraries, useItems } from '../hooks'
import { useLibraryParams, MusicSubFilter } from '../hooks/useUrlParams'
import { useNavigation } from '../contexts/NavigationContext'
import { jellyfinApi } from '../services'
import type { BaseItemDto, GetItemsOptions, ItemType } from '../types'

const ITEMS_PER_PAGE = 24

// Music sub-filter configuration
const MUSIC_SUBFILTERS: { id: MusicSubFilter; label: string; itemType: ItemType }[] = [
  { id: 'artists', label: 'Artists', itemType: 'MusicArtist' },
  { id: 'albums', label: 'Albums', itemType: 'MusicAlbum' },
  { id: 'songs', label: 'Songs', itemType: 'Audio' },
]

export default function Library() {
  const { navigateToItem } = useNavigation()
  const { params, setParams, resetFilters, hasActiveFilters } = useLibraryParams()
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false)

  // Fetch libraries for the selector
  const { data: libraries, isLoading: librariesLoading } = useLibraries()

  // Select library based on category
  useEffect(() => {
    if (libraries?.length) {
      // Find library matching the current category
      const matchingLibrary = params.category
        ? libraries.find((lib) => lib.CollectionType === params.category)
        : libraries.find(
            (lib) => lib.CollectionType === 'movies' || lib.CollectionType === 'tvshows'
          ) || libraries[0]

      if (matchingLibrary) {
        if (matchingLibrary.Id !== params.libraryId) {
          setParams({ libraryId: matchingLibrary.Id })
        }
      } else {
        // No matching library found - clear libraryId to show empty state
        if (params.libraryId) {
          setParams({ libraryId: null })
        }
      }
    }
  }, [libraries, params.category, params.libraryId, setParams])

  // Current library
  const currentLibrary = useMemo(
    () => libraries?.find((lib) => lib.Id === params.libraryId) || null,
    [libraries, params.libraryId]
  )

  // Build query options
  const queryOptions: GetItemsOptions = useMemo(() => {
    if (!params.libraryId) {
      return {}
    }

    const options: GetItemsOptions = {
      parentId: params.libraryId,
      sortBy: [params.sortBy],
      sortOrder: params.sortOrder,
      limit: ITEMS_PER_PAGE * params.page,
      recursive: true,
      enableImages: true,
      imageTypeLimit: 1,
    }

    // Add item type filter based on category
    if (params.category === 'movies') {
      options.includeItemTypes = ['Movie']
    } else if (params.category === 'tvshows') {
      options.includeItemTypes = ['Series']
    } else if (params.category === 'music') {
      // Use subFilter to determine music item type
      const subFilter = MUSIC_SUBFILTERS.find((f) => f.id === params.subFilter)
      options.includeItemTypes = [subFilter?.itemType || 'MusicArtist']
    }

    // Add genre filter
    if (params.genres.length > 0) {
      options.genres = params.genres
    }

    // Add year filter
    if (params.years.length > 0) {
      options.years = params.years
    }

    // Add watched status filter (not applicable for music)
    if (params.category !== 'music') {
      if (params.status === 'watched') {
        options.isPlayed = true
      } else if (params.status === 'unwatched') {
        options.isPlayed = false
      }
    }

    return options
  }, [params])

  // Fetch items
  const { data: itemsData, isLoading: itemsLoading, isFetching } = useItems(queryOptions)

  // Don't show items if no library is selected
  const items = params.libraryId ? (itemsData?.Items || []) : []
  const totalCount = itemsData?.TotalRecordCount || 0
  const hasMore = items.length < totalCount

  // Extract available genres from all items
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>()
    items.forEach((item) => {
      item.Genres?.forEach((genre) => genreSet.add(genre))
    })
    return Array.from(genreSet).sort()
  }, [items])

  // Extract available years
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>()
    items.forEach((item) => {
      if (item.ProductionYear) yearSet.add(item.ProductionYear)
    })
    return Array.from(yearSet).sort((a, b) => b - a) // Descending
  }, [items])

  const handleLoadMore = useCallback(() => {
    setParams({ page: params.page + 1 })
  }, [params.page, setParams])

  const handleItemClick = (item: BaseItemDto) => {
    navigateToItem(item.Id)
  }

  // Loading state
  if (librariesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
      </div>
    )
  }

  // Get category title
  const getCategoryTitle = () => {
    switch (params.category) {
      case 'movies':
        return 'Movies'
      case 'tvshows':
        return 'Series'
      case 'music':
        return 'Music'
      default:
        return currentLibrary?.Name || 'Library'
    }
  }

  // Handle sub-filter change for music
  const handleSubFilterChange = (subFilter: MusicSubFilter) => {
    setParams({ subFilter, page: 1 })
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Category Title & Music Sub-filters */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">{getCategoryTitle()}</h1>
          {!currentLibrary && params.category && (
            <span className="text-text-secondary text-sm">
              No {params.category} library found
            </span>
          )}
        </div>

        {/* Music sub-filter pills */}
        {params.category === 'music' && currentLibrary && (
          <div className="flex gap-2 mt-3">
            {MUSIC_SUBFILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleSubFilterChange(filter.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  params.subFilter === filter.id
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <LibraryHeader
        library={currentLibrary}
        params={params}
        onParamsChange={setParams}
        onFilterClick={() => setFilterSidebarOpen(true)}
        hasActiveFilters={hasActiveFilters}
        totalCount={totalCount}
      />

      {/* Content */}
      <div className="flex-1 p-4">
        {/* Grid View */}
        {params.view === 'grid' && (
          <>
            {itemsLoading && !items.length ? (
              // Loading skeleton grid
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-xl bg-bg-secondary animate-pulse" />
                ))}
              </div>
            ) : items.length > 0 ? (
              <>
                <div className={`grid gap-4 ${
                  params.category === 'music'
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                }`}>
                  {items.map((item) =>
                    params.category === 'music' ? (
                      <MusicCard
                        key={item.Id}
                        item={item}
                        onClick={() => handleItemClick(item)}
                        variant={params.subFilter === 'artists' ? 'artist' : 'album'}
                      />
                    ) : (
                      <MediaCard
                        key={item.Id}
                        item={item}
                        onClick={handleItemClick}
                        size="lg"
                      />
                    )
                  )}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={isFetching}
                      className="btn-secondary flex items-center gap-2 px-8"
                    >
                      {isFetching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        `Load More (${items.length} of ${totalCount})`
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState hasFilters={hasActiveFilters} onReset={resetFilters} />
            )}
          </>
        )}

        {/* List View */}
        {params.view === 'list' && (
          <>
            {itemsLoading && !items.length ? (
              // Loading skeleton list
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex gap-4 p-3 bg-bg-secondary rounded-lg animate-pulse">
                    <div className="w-16 aspect-[2/3] rounded bg-bg-hover" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-48 bg-bg-hover rounded" />
                      <div className="h-4 w-32 bg-bg-hover rounded" />
                      <div className="h-4 w-full bg-bg-hover rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length > 0 ? (
              <>
                <div className="space-y-2">
                  {items.map((item) => (
                    <ListItem key={item.Id} item={item} onClick={handleItemClick} />
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={isFetching}
                      className="btn-secondary flex items-center gap-2 px-8"
                    >
                      {isFetching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        `Load More (${items.length} of ${totalCount})`
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState hasFilters={hasActiveFilters} onReset={resetFilters} />
            )}
          </>
        )}
      </div>

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={filterSidebarOpen}
        onClose={() => setFilterSidebarOpen(false)}
        params={params}
        onParamsChange={setParams}
        onReset={resetFilters}
        availableGenres={availableGenres}
        availableYears={availableYears}
        hasActiveFilters={hasActiveFilters}
        category={params.category}
      />
    </div>
  )
}

// List Item Component
function ListItem({
  item,
  onClick,
}: {
  item: BaseItemDto
  onClick: (item: BaseItemDto) => void
}) {
  const imageUrl = jellyfinApi.getPrimaryUrl(item.Id, { maxWidth: 100 })
  const progress = item.UserData?.PlaybackPositionTicks && item.RunTimeTicks
    ? (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100
    : 0

  return (
    <button
      onClick={() => onClick(item)}
      className="w-full flex gap-4 p-3 bg-bg-secondary hover:bg-bg-hover rounded-lg transition-colors text-left"
    >
      {/* Poster */}
      <div className="relative w-16 flex-shrink-0">
        <div className="aspect-[2/3] rounded overflow-hidden bg-bg-hover">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={item.Name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>
        {progress > 0 && progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-accent-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-text-primary truncate">{item.Name}</h3>
        <div className="flex items-center gap-2 text-sm text-text-secondary mt-0.5">
          {item.ProductionYear && <span>{item.ProductionYear}</span>}
          {item.OfficialRating && (
            <span className="px-1.5 py-0.5 border border-text-secondary/30 rounded text-xs">
              {item.OfficialRating}
            </span>
          )}
          {item.CommunityRating && <span>★ {item.CommunityRating.toFixed(1)}</span>}
        </div>
        {item.Overview && (
          <p className="text-sm text-text-secondary line-clamp-2 mt-1">{item.Overview}</p>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-col items-end gap-1">
        {item.UserData?.Played && (
          <span className="text-xs text-green-500">Watched</span>
        )}
        {item.UserData?.UnplayedItemCount !== undefined && item.UserData.UnplayedItemCount > 0 && (
          <span className="px-2 py-0.5 bg-accent-primary text-white text-xs rounded-full">
            {item.UserData.UnplayedItemCount}
          </span>
        )}
      </div>
    </button>
  )
}

// Empty State Component
function EmptyState({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean
  onReset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center mb-4">
        {hasFilters ? (
          <Search className="w-8 h-8 text-text-secondary" />
        ) : (
          <FolderOpen className="w-8 h-8 text-text-secondary" />
        )}
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-2">
        {hasFilters ? 'No items match your filters' : 'No items found'}
      </h3>
      <p className="text-sm text-text-secondary mb-4 max-w-sm">
        {hasFilters
          ? 'Try adjusting your filters or clearing them to see more results.'
          : 'This library appears to be empty.'}
      </p>
      {hasFilters && (
        <button onClick={onReset} className="btn-secondary">
          Clear Filters
        </button>
      )}
    </div>
  )
}
