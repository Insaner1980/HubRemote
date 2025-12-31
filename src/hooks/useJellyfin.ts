import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jellyfinApi } from '../services'
import { useConfigStore } from '../stores'
import type { GetItemsOptions } from '../types'

// Query keys factory
export const jellyfinKeys = {
  all: ['jellyfin'] as const,
  libraries: () => [...jellyfinKeys.all, 'libraries'] as const,
  items: (options?: GetItemsOptions) => [...jellyfinKeys.all, 'items', options] as const,
  item: (itemId: string) => [...jellyfinKeys.all, 'item', itemId] as const,
  resume: () => [...jellyfinKeys.all, 'resume'] as const,
  latest: (parentId?: string) => [...jellyfinKeys.all, 'latest', parentId] as const,
  nextUp: () => [...jellyfinKeys.all, 'nextUp'] as const,
  seasons: (seriesId: string) => [...jellyfinKeys.all, 'seasons', seriesId] as const,
  episodes: (seriesId: string, seasonId: string) => [...jellyfinKeys.all, 'episodes', seriesId, seasonId] as const,
  sessions: () => [...jellyfinKeys.all, 'sessions'] as const,
  search: (term: string) => [...jellyfinKeys.all, 'search', term] as const,
  similar: (itemId: string) => [...jellyfinKeys.all, 'similar', itemId] as const,
}

// Get user ID from config store
function useUserId() {
  return useConfigStore((state) => state.userId)
}

function useIsAuthenticated() {
  return useConfigStore((state) => state.isAuthenticated())
}

// ============================================
// Query Hooks
// ============================================

export function useLibraries() {
  const userId = useUserId()
  const isAuthenticated = useIsAuthenticated()

  return useQuery({
    queryKey: jellyfinKeys.libraries(),
    queryFn: () => jellyfinApi.getLibraries(userId!),
    enabled: isAuthenticated && !!userId,
  })
}

export function useItems(options: GetItemsOptions = {}) {
  const userId = useUserId()
  const isAuthenticated = useIsAuthenticated()

  // Don't fetch if no parentId is specified (would return root views instead of library items)
  const hasValidOptions = !!options.parentId

  return useQuery({
    queryKey: jellyfinKeys.items(options),
    queryFn: () => jellyfinApi.getItems(userId!, options),
    enabled: isAuthenticated && !!userId && hasValidOptions,
  })
}

export function useItem(itemId: string) {
  const userId = useUserId()
  const isAuthenticated = useIsAuthenticated()

  return useQuery({
    queryKey: jellyfinKeys.item(itemId),
    queryFn: () => jellyfinApi.getItem(userId!, itemId),
    enabled: isAuthenticated && !!userId && !!itemId,
  })
}

export function useResumeItems(limit: number = 12) {
  const userId = useUserId()
  const isAuthenticated = useIsAuthenticated()

  return useQuery({
    queryKey: jellyfinKeys.resume(),
    queryFn: () => jellyfinApi.getResumeItems(userId!, limit),
    enabled: isAuthenticated && !!userId,
  })
}

export function useLatestItems(parentId?: string, limit: number = 16) {
  const userId = useUserId()
  const isAuthenticated = useIsAuthenticated()

  return useQuery({
    queryKey: jellyfinKeys.latest(parentId),
    queryFn: () => jellyfinApi.getLatestItems(userId!, parentId, limit),
    enabled: isAuthenticated && !!userId,
  })
}

export function useNextUp(limit: number = 12) {
  const userId = useUserId()
  const isAuthenticated = useIsAuthenticated()

  return useQuery({
    queryKey: jellyfinKeys.nextUp(),
    queryFn: () => jellyfinApi.getNextUp(userId!, limit),
    enabled: isAuthenticated && !!userId,
  })
}

export function useSeasons(seriesId: string) {
  const userId = useUserId()
  const isAuthenticated = useIsAuthenticated()

  return useQuery({
    queryKey: jellyfinKeys.seasons(seriesId),
    queryFn: () => jellyfinApi.getSeasons(seriesId, userId!),
    enabled: isAuthenticated && !!userId && !!seriesId,
  })
}

export function useEpisodes(seriesId: string, seasonId: string) {
  const userId = useUserId()
  const isAuthenticated = useIsAuthenticated()

  return useQuery({
    queryKey: jellyfinKeys.episodes(seriesId, seasonId),
    queryFn: () => jellyfinApi.getEpisodes(seriesId, seasonId, userId!),
    enabled: isAuthenticated && !!userId && !!seriesId && !!seasonId,
  })
}

export function useSessions() {
  const isAuthenticated = useIsAuthenticated()

  return useQuery({
    queryKey: jellyfinKeys.sessions(),
    queryFn: () => jellyfinApi.getSessions(),
    enabled: isAuthenticated,
    refetchInterval: 5000, // Poll every 5 seconds
  })
}

export function usePlayingSessions() {
  const isAuthenticated = useIsAuthenticated()

  return useQuery({
    queryKey: [...jellyfinKeys.sessions(), 'playing'],
    queryFn: () => jellyfinApi.getPlayingSessions(),
    enabled: isAuthenticated,
    refetchInterval: 3000, // Poll every 3 seconds for active playback
  })
}

export function useSearch(searchTerm: string, limit: number = 24) {
  const userId = useUserId()
  const isAuthenticated = useIsAuthenticated()

  return useQuery({
    queryKey: jellyfinKeys.search(searchTerm),
    queryFn: () => jellyfinApi.search(userId!, searchTerm, limit),
    enabled: isAuthenticated && !!userId && searchTerm.length >= 2,
  })
}

export function useSimilarItems(itemId: string, limit: number = 12) {
  const userId = useUserId()
  const isAuthenticated = useIsAuthenticated()

  return useQuery({
    queryKey: jellyfinKeys.similar(itemId),
    queryFn: () => jellyfinApi.getSimilarItems(itemId, userId!, limit),
    enabled: isAuthenticated && !!userId && !!itemId,
  })
}

// ============================================
// Mutation Hooks
// ============================================

export function useToggleFavorite() {
  const userId = useUserId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, isFavorite }: { itemId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await jellyfinApi.unmarkFavorite(userId!, itemId)
      } else {
        await jellyfinApi.markFavorite(userId!, itemId)
      }
      return !isFavorite
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: jellyfinKeys.item(itemId) })
    },
  })
}

export function useTogglePlayed() {
  const userId = useUserId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, isPlayed }: { itemId: string; isPlayed: boolean }) => {
      if (isPlayed) {
        await jellyfinApi.markUnplayed(userId!, itemId)
      } else {
        await jellyfinApi.markPlayed(userId!, itemId)
      }
      return !isPlayed
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: jellyfinKeys.item(itemId) })
      queryClient.invalidateQueries({ queryKey: jellyfinKeys.resume() })
    },
  })
}

// ============================================
// Remote Control Mutations
// ============================================

export function usePlaystateCommand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sessionId,
      command,
    }: {
      sessionId: string
      command: 'Pause' | 'Unpause' | 'Stop' | 'NextTrack' | 'PreviousTrack'
    }) => {
      await jellyfinApi.sendPlaystateCommand(sessionId, command)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jellyfinKeys.sessions() })
    },
  })
}

export function useSeek() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sessionId,
      positionTicks,
    }: {
      sessionId: string
      positionTicks: number
    }) => {
      await jellyfinApi.seek(sessionId, positionTicks)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jellyfinKeys.sessions() })
    },
  })
}

export function useSetVolume() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      volume,
    }: {
      sessionId: string
      volume: number
    }) => {
      await jellyfinApi.setVolume(sessionId, volume)
    },
  })
}

export function useToggleMute() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await jellyfinApi.toggleMute(sessionId)
    },
  })
}

export function usePlayOnSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sessionId,
      itemIds,
      startPositionTicks,
    }: {
      sessionId: string
      itemIds: string[]
      startPositionTicks?: number
    }) => {
      await jellyfinApi.playOnSession(sessionId, itemIds, { startPositionTicks })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jellyfinKeys.sessions() })
    },
  })
}

export function useSetAudioStream() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      index,
    }: {
      sessionId: string
      index: number
    }) => {
      await jellyfinApi.setAudioStream(sessionId, index)
    },
  })
}

export function useSetSubtitleStream() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      index,
    }: {
      sessionId: string
      index: number
    }) => {
      await jellyfinApi.setSubtitleStream(sessionId, index)
    },
  })
}
