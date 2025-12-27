import { useState, useCallback, useMemo } from 'react'

export interface LibraryParams {
  libraryId: string | null
  view: 'grid' | 'list'
  sortBy: 'SortName' | 'DateCreated' | 'CommunityRating' | 'ProductionYear'
  sortOrder: 'Ascending' | 'Descending'
  genres: string[]
  years: number[]
  status: 'all' | 'watched' | 'unwatched'
  page: number
}

const DEFAULT_PARAMS: LibraryParams = {
  libraryId: null,
  view: 'grid',
  sortBy: 'SortName',
  sortOrder: 'Ascending',
  genres: [],
  years: [],
  status: 'all',
  page: 1,
}

// Parse URL search params to LibraryParams
function parseParams(search: string): Partial<LibraryParams> {
  const params = new URLSearchParams(search)
  const result: Partial<LibraryParams> = {}

  const libraryId = params.get('library')
  if (libraryId) result.libraryId = libraryId

  const view = params.get('view')
  if (view === 'grid' || view === 'list') result.view = view

  const sortBy = params.get('sortBy')
  if (sortBy === 'SortName' || sortBy === 'DateCreated' || sortBy === 'CommunityRating' || sortBy === 'ProductionYear') {
    result.sortBy = sortBy
  }

  const sortOrder = params.get('sortOrder')
  if (sortOrder === 'Ascending' || sortOrder === 'Descending') result.sortOrder = sortOrder

  const genres = params.get('genres')
  if (genres) result.genres = genres.split(',').filter(Boolean)

  const years = params.get('years')
  if (years) result.years = years.split(',').map(Number).filter((n) => !isNaN(n))

  const status = params.get('status')
  if (status === 'all' || status === 'watched' || status === 'unwatched') result.status = status

  const page = params.get('page')
  if (page) {
    const pageNum = parseInt(page, 10)
    if (!isNaN(pageNum) && pageNum > 0) result.page = pageNum
  }

  return result
}

// Convert LibraryParams to URL search string
function stringifyParams(params: LibraryParams): string {
  const searchParams = new URLSearchParams()

  if (params.libraryId) searchParams.set('library', params.libraryId)
  if (params.view !== DEFAULT_PARAMS.view) searchParams.set('view', params.view)
  if (params.sortBy !== DEFAULT_PARAMS.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortOrder !== DEFAULT_PARAMS.sortOrder) searchParams.set('sortOrder', params.sortOrder)
  if (params.genres.length > 0) searchParams.set('genres', params.genres.join(','))
  if (params.years.length > 0) searchParams.set('years', params.years.join(','))
  if (params.status !== DEFAULT_PARAMS.status) searchParams.set('status', params.status)
  if (params.page > 1) searchParams.set('page', String(params.page))

  return searchParams.toString()
}

export function useLibraryParams() {
  // In a real app with React Router, this would use useSearchParams
  // For now, we'll use local state that syncs with URL
  const [params, setParamsState] = useState<LibraryParams>(() => {
    const parsed = parseParams(window.location.search)
    return { ...DEFAULT_PARAMS, ...parsed }
  })

  // Update URL when params change
  const setParams = useCallback((updates: Partial<LibraryParams>) => {
    setParamsState((prev) => {
      const newParams = { ...prev, ...updates }

      // Reset page to 1 when filters change (except when explicitly setting page)
      if (!('page' in updates)) {
        newParams.page = 1
      }

      // Update URL without page reload
      const search = stringifyParams(newParams)
      const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname
      window.history.replaceState(null, '', newUrl)

      return newParams
    })
  }, [])

  const resetFilters = useCallback(() => {
    setParams({
      genres: [],
      years: [],
      status: 'all',
      page: 1,
    })
  }, [setParams])

  const hasActiveFilters = useMemo(() => {
    return params.genres.length > 0 || params.years.length > 0 || params.status !== 'all'
  }, [params.genres, params.years, params.status])

  return {
    params,
    setParams,
    resetFilters,
    hasActiveFilters,
  }
}
