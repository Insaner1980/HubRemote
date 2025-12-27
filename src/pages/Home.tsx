import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { HeroBanner, MediaRow } from '../components'
import { useLibraries, useResumeItems, useLatestItems, useNextUp, useItems } from '../hooks'
import { useNavigation } from '../contexts/NavigationContext'
import type { BaseItemDto } from '../types'

export default function Home() {
  const { navigateToItem } = useNavigation()
  const { data: libraries, isLoading: librariesLoading } = useLibraries()
  const { data: resumeItems, isLoading: resumeLoading } = useResumeItems(12)
  const { data: nextUpItems, isLoading: nextUpLoading } = useNextUp(12)
  const { data: latestItems, isLoading: latestLoading } = useLatestItems(undefined, 16)

  // Find Movies and TV Shows libraries
  const movieLibrary = useMemo(
    () => libraries?.find((lib) => lib.CollectionType === 'movies'),
    [libraries]
  )
  const tvLibrary = useMemo(
    () => libraries?.find((lib) => lib.CollectionType === 'tvshows'),
    [libraries]
  )

  // Fetch items from specific libraries
  const { data: moviesData, isLoading: moviesLoading } = useItems(
    movieLibrary
      ? {
          parentId: movieLibrary.Id,
          includeItemTypes: ['Movie'],
          sortBy: ['DateCreated', 'SortName'],
          sortOrder: 'Descending',
          limit: 16,
          recursive: true,
        }
      : {}
  )

  const { data: tvShowsData, isLoading: tvShowsLoading } = useItems(
    tvLibrary
      ? {
          parentId: tvLibrary.Id,
          includeItemTypes: ['Series'],
          sortBy: ['DateCreated', 'SortName'],
          sortOrder: 'Descending',
          limit: 16,
          recursive: true,
        }
      : {}
  )

  // Combine resume and next up for hero banner candidates
  const heroItems = useMemo(() => {
    const items: BaseItemDto[] = []
    if (latestItems?.length) items.push(...latestItems)
    if (moviesData?.Items?.length) items.push(...moviesData.Items)
    if (tvShowsData?.Items?.length) items.push(...tvShowsData.Items)
    // Filter to items with backdrops and unique by ID
    const withBackdrops = items.filter(
      (item) => item.BackdropImageTags?.length || item.ImageTags?.Backdrop
    )
    const unique = Array.from(new Map(withBackdrops.map((item) => [item.Id, item])).values())
    return unique.slice(0, 10)
  }, [latestItems, moviesData?.Items, tvShowsData?.Items])

  // Combine resume items and next up for "Continue Watching"
  const continueWatching = useMemo(() => {
    const items: BaseItemDto[] = []
    if (resumeItems?.length) items.push(...resumeItems)
    if (nextUpItems?.length) {
      // Add next up items that aren't already in resume
      const resumeIds = new Set(resumeItems?.map((i) => i.Id) || [])
      const newNextUp = nextUpItems.filter((i) => !resumeIds.has(i.Id))
      items.push(...newNextUp)
    }
    return items
  }, [resumeItems, nextUpItems])

  const handleItemClick = (item: BaseItemDto) => {
    // For episodes, navigate to the series
    const targetId = item.Type === 'Episode' ? item.SeriesId || item.Id : item.Id
    navigateToItem(targetId)
  }

  const handlePlay = (item: BaseItemDto) => {
    console.log('Play:', item.Name, item.Id)
    // TODO: Start playback
  }

  const handleMoreInfo = (item: BaseItemDto) => {
    navigateToItem(item.Id)
  }

  const isInitialLoading = librariesLoading && !libraries

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <HeroBanner
        items={heroItems}
        onPlay={handlePlay}
        onMoreInfo={handleMoreInfo}
        isLoading={latestLoading && moviesLoading && tvShowsLoading}
      />

      {/* Content Rows */}
      <div className="space-y-6 py-6">
        {/* Continue Watching */}
        <MediaRow
          title="Continue Watching"
          items={continueWatching}
          onItemClick={handleItemClick}
          isLoading={resumeLoading || nextUpLoading}
          cardSize="md"
        />

        {/* Recently Added */}
        <MediaRow
          title="Recently Added"
          items={latestItems || []}
          onItemClick={handleItemClick}
          isLoading={latestLoading}
          cardSize="md"
        />

        {/* Movies */}
        {(moviesData?.Items?.length || moviesLoading) && (
          <MediaRow
            title="Movies"
            items={moviesData?.Items || []}
            onItemClick={handleItemClick}
            isLoading={moviesLoading}
            cardSize="md"
          />
        )}

        {/* TV Shows */}
        {(tvShowsData?.Items?.length || tvShowsLoading) && (
          <MediaRow
            title="TV Shows"
            items={tvShowsData?.Items || []}
            onItemClick={handleItemClick}
            isLoading={tvShowsLoading}
            cardSize="md"
          />
        )}

        {/* Library sections */}
        {libraries
          ?.filter(
            (lib) =>
              lib.CollectionType !== 'movies' &&
              lib.CollectionType !== 'tvshows' &&
              lib.CollectionType !== 'playlists'
          )
          .map((library) => (
            <LibraryRow
              key={library.Id}
              library={library}
              onItemClick={handleItemClick}
            />
          ))}
      </div>

      {/* Bottom padding for nav */}
      <div className="h-4" />
    </div>
  )
}

// Separate component for library rows to manage their own data fetching
function LibraryRow({
  library,
  onItemClick,
}: {
  library: BaseItemDto
  onItemClick: (item: BaseItemDto) => void
}) {
  const { data, isLoading } = useLatestItems(library.Id, 16)

  if (!isLoading && (!data || data.length === 0)) {
    return null
  }

  return (
    <MediaRow
      title={library.Name}
      items={data || []}
      onItemClick={onItemClick}
      isLoading={isLoading}
      cardSize="md"
    />
  )
}
