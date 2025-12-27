import { memo, useState, useRef, useEffect } from 'react'
import {
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Check,
} from 'lucide-react'
import type { LibraryParams } from '../hooks/useUrlParams'
import type { BaseItemDto } from '../types'

interface LibraryHeaderProps {
  library: BaseItemDto | null
  params: LibraryParams
  onParamsChange: (updates: Partial<LibraryParams>) => void
  onFilterClick: () => void
  hasActiveFilters: boolean
  totalCount?: number
}

const SORT_OPTIONS = [
  { value: 'SortName', label: 'Name', defaultOrder: 'Ascending' },
  { value: 'DateCreated', label: 'Date Added', defaultOrder: 'Descending' },
  { value: 'CommunityRating', label: 'Rating', defaultOrder: 'Descending' },
  { value: 'ProductionYear', label: 'Year', defaultOrder: 'Descending' },
] as const

export const LibraryHeader = memo(function LibraryHeader({
  library,
  params,
  onParamsChange,
  onFilterClick,
  hasActiveFilters,
  totalCount,
}: LibraryHeaderProps) {
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false)
      }
    }

    if (sortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [sortDropdownOpen])

  const currentSortOption = SORT_OPTIONS.find((opt) => opt.value === params.sortBy)

  const handleSortChange = (sortBy: LibraryParams['sortBy']) => {
    const option = SORT_OPTIONS.find((opt) => opt.value === sortBy)
    onParamsChange({
      sortBy,
      sortOrder: option?.defaultOrder || 'Ascending',
    })
    setSortDropdownOpen(false)
  }

  const toggleSortOrder = () => {
    onParamsChange({
      sortOrder: params.sortOrder === 'Ascending' ? 'Descending' : 'Ascending',
    })
  }

  return (
    <div className="sticky top-0 z-30 bg-bg-primary/95 backdrop-blur-sm border-b border-border">
      <div className="px-4 py-3">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              {library?.Name || 'Library'}
            </h1>
            {totalCount !== undefined && (
              <p className="text-sm text-text-secondary">
                {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </p>
            )}
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => onParamsChange({ view: 'grid' })}
              className={`p-2 rounded-md transition-colors ${
                params.view === 'grid'
                  ? 'bg-bg-hover text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onParamsChange({ view: 'list' })}
              className={`p-2 rounded-md transition-colors ${
                params.view === 'list'
                  ? 'bg-bg-hover text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">{currentSortOption?.label || 'Sort'}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {sortDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-bg-secondary border border-border rounded-lg shadow-xl overflow-hidden z-50">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                      params.sortBy === option.value
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    }`}
                  >
                    {option.label}
                    {params.sortBy === option.value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={toggleSortOrder}
            className="p-2 bg-bg-secondary rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            aria-label={`Sort ${params.sortOrder === 'Ascending' ? 'descending' : 'ascending'}`}
          >
            <ArrowUpDown
              className={`w-4 h-4 transition-transform ${
                params.sortOrder === 'Descending' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Filter Button */}
          <button
            onClick={onFilterClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              hasActiveFilters
                ? 'bg-accent-primary text-white'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-5 h-5 flex items-center justify-center bg-white/20 rounded-full text-xs">
                !
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
})
