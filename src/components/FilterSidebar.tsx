import { memo, useEffect } from 'react'
import { X, Check, RotateCcw } from 'lucide-react'
import type { LibraryParams, LibraryCategory } from '../hooks/useUrlParams'

interface FilterSidebarProps {
  isOpen: boolean
  onClose: () => void
  params: LibraryParams
  onParamsChange: (updates: Partial<LibraryParams>) => void
  onReset: () => void
  availableGenres: string[]
  availableYears: number[]
  hasActiveFilters: boolean
  category?: LibraryCategory | null
}

export const FilterSidebar = memo(function FilterSidebar({
  isOpen,
  onClose,
  params,
  onParamsChange,
  onReset,
  availableGenres,
  availableYears,
  hasActiveFilters,
  category,
}: FilterSidebarProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const toggleGenre = (genre: string) => {
    const newGenres = params.genres.includes(genre)
      ? params.genres.filter((g) => g !== genre)
      : [...params.genres, genre]
    onParamsChange({ genres: newGenres })
  }

  const toggleYear = (year: number) => {
    const newYears = params.years.includes(year)
      ? params.years.filter((y) => y !== year)
      : [...params.years, year]
    onParamsChange({ years: newYears })
  }

  const setStatus = (status: 'all' | 'watched' | 'unwatched') => {
    onParamsChange({ status })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-bg-secondary border-l border-border z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-2 py-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Content */}
        <div className="overflow-y-auto h-[calc(100%-65px)] scrollbar-thin">
          {/* Status - hidden for music */}
          {category !== 'music' && (
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-medium text-text-primary mb-3">Status</h3>
              <div className="flex gap-2">
                {(['all', 'unwatched', 'watched'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatus(status)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      params.status === status
                        ? 'bg-accent-primary text-white'
                        : 'bg-bg-hover text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Genres */}
          {availableGenres.length > 0 && (
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-medium text-text-primary mb-3">
                Genres
                {params.genres.length > 0 && (
                  <span className="ml-2 text-xs text-accent-primary">
                    ({params.genres.length})
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableGenres.map((genre) => {
                  const isSelected = params.genres.includes(genre)
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors ${
                        isSelected
                          ? 'bg-accent-primary text-white'
                          : 'bg-bg-hover text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {genre}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Years */}
          {availableYears.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">
                Year
                {params.years.length > 0 && (
                  <span className="ml-2 text-xs text-accent-primary">
                    ({params.years.length})
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto scrollbar-thin">
                {availableYears.map((year) => {
                  const isSelected = params.years.includes(year)
                  return (
                    <button
                      key={year}
                      onClick={() => toggleYear(year)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-accent-primary text-white'
                          : 'bg-bg-hover text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {year}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
})
