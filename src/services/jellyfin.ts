import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useConfigStore } from '../stores/configStore'
import { toast } from '../stores/toastStore'
import type {
  AuthenticationResult,
  BaseItemDto,
  ItemsResponse,
  SessionInfo,
  PublicSystemInfo,
  GetItemsOptions,
  ImageOptions,
  ImageType,
  ApiError,
  PlaystateCommand,
  GeneralCommandType,
  PlayCommand,
} from '../types'

// Error logging helper
const logError = (context: string, error: unknown) => {
  if (import.meta.env.DEV) {
    console.group(`%c API Error: ${context}`, 'color: red; font-weight: bold')
    console.error(error)
    console.groupEnd()
  }
}

// ============================================
// Axios Instance & Interceptors
// ============================================

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor - adds auth header and base URL
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const { serverUrl, getAuthorizationHeader, accessToken } = useConfigStore.getState()

      // Set base URL from config store
      if (serverUrl) {
        config.baseURL = serverUrl
      }

      // Add authorization header
      config.headers['X-Emby-Authorization'] = getAuthorizationHeader()

      // Add token header if authenticated
      if (accessToken) {
        config.headers['X-Emby-Token'] = accessToken
      }

      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor - handle errors
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const apiError: ApiError = {
        status: error.response?.status ?? 0,
        message: error.message,
      }

      let toastTitle = 'Error'
      let showToast = true

      if (error.response) {
        switch (error.response.status) {
          case 401:
            apiError.message = 'Authentication failed. Please log in again.'
            apiError.code = 'UNAUTHORIZED'
            toastTitle = 'Authentication Failed'
            // Clear credentials on 401
            useConfigStore.getState().clearCredentials()
            break
          case 403:
            apiError.message = 'Access denied. You do not have permission.'
            apiError.code = 'FORBIDDEN'
            toastTitle = 'Access Denied'
            break
          case 404:
            apiError.message = 'Resource not found.'
            apiError.code = 'NOT_FOUND'
            toastTitle = 'Not Found'
            // Don't show toast for 404s - they're often expected
            showToast = false
            break
          case 500:
            apiError.message = 'Server error. Please try again later.'
            apiError.code = 'SERVER_ERROR'
            toastTitle = 'Server Error'
            break
          case 502:
          case 503:
          case 504:
            apiError.message = 'Server is temporarily unavailable.'
            apiError.code = 'SERVER_UNAVAILABLE'
            toastTitle = 'Server Unavailable'
            break
          default:
            apiError.message = (error.response.data as { Message?: string })?.Message ?? error.message
        }
      } else if (error.code === 'ECONNABORTED') {
        apiError.message = 'Request timed out. Please check your connection.'
        apiError.code = 'TIMEOUT'
        toastTitle = 'Request Timeout'
      } else if (!error.response) {
        apiError.message = 'Cannot connect to server. Please check the URL and your network.'
        apiError.code = 'NETWORK_ERROR'
        toastTitle = 'Connection Failed'
      }

      // Log error in development
      logError(error.config?.url || 'Unknown endpoint', apiError)

      // Show toast notification
      if (showToast) {
        toast.error(toastTitle, apiError.message)
      }

      return Promise.reject(apiError)
    }
  )

  return client
}

const api = createApiClient()

// ============================================
// Helper Functions
// ============================================

const DEFAULT_FIELDS = [
  'Overview',
  'Genres',
  'DateCreated',
  'MediaSources',
  'MediaStreams',
  'Path',
  'ProviderIds',
  'Studios',
  'Taglines',
  'Tags',
  'People',
  'ExternalUrls',
  'OfficialRating',
  'CommunityRating',
  'RunTimeTicks',
  'ProductionYear',
  'PremiereDate',
  'ParentId',
  'SeriesId',
  'SeasonId',
  'ChildCount',
].join(',')

const DEFAULT_IMAGE_TYPES = 'Primary,Backdrop,Logo,Thumb,Banner'

// ============================================
// API Methods
// ============================================

export const jellyfinApi = {
  // ------------------------------------------
  // Server & Authentication
  // ------------------------------------------

  /**
   * Get public server information (no auth required)
   */
  async getPublicInfo(serverUrl: string): Promise<PublicSystemInfo> {
    const response = await axios.get<PublicSystemInfo>(`${serverUrl}/System/Info/Public`)
    return response.data
  },

  /**
   * Authenticate user by username and password
   */
  async authenticateByName(username: string, password: string): Promise<AuthenticationResult> {
    const response = await api.post<AuthenticationResult>('/Users/AuthenticateByName', {
      Username: username,
      Pw: password,
    })

    // Store credentials on successful auth
    const { AccessToken, User, ServerId } = response.data
    useConfigStore.getState().setCredentials(AccessToken, User.Id, ServerId)

    return response.data
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await api.post('/Sessions/Logout')
    } finally {
      useConfigStore.getState().clearCredentials()
    }
  },

  // ------------------------------------------
  // Libraries
  // ------------------------------------------

  /**
   * Get user's media libraries (Views)
   */
  async getLibraries(userId: string): Promise<BaseItemDto[]> {
    const response = await api.get<ItemsResponse>(`/Users/${userId}/Views`)
    return response.data.Items
  },

  // ------------------------------------------
  // Items
  // ------------------------------------------

  /**
   * Get items with various filters and options
   */
  async getItems(userId: string, options: GetItemsOptions = {}): Promise<ItemsResponse> {
    const params: Record<string, string | number | boolean> = {
      Fields: options.fields?.join(',') ?? DEFAULT_FIELDS,
      EnableImages: options.enableImages ?? true,
      EnableImageTypes: options.enableImageTypes?.join(',') ?? DEFAULT_IMAGE_TYPES,
      ImageTypeLimit: options.imageTypeLimit ?? 1,
    }

    if (options.parentId) params.ParentId = options.parentId
    if (options.includeItemTypes?.length) params.IncludeItemTypes = options.includeItemTypes.join(',')
    if (options.excludeItemTypes?.length) params.ExcludeItemTypes = options.excludeItemTypes.join(',')
    if (options.sortBy?.length) params.SortBy = options.sortBy.join(',')
    if (options.sortOrder) params.SortOrder = options.sortOrder
    if (options.filters?.length) params.Filters = options.filters.join(',')
    if (options.limit !== undefined) params.Limit = options.limit
    if (options.startIndex !== undefined) params.StartIndex = options.startIndex
    if (options.recursive !== undefined) params.Recursive = options.recursive
    if (options.searchTerm) params.SearchTerm = options.searchTerm
    if (options.genres?.length) params.Genres = options.genres.join(',')
    if (options.years?.length) params.Years = options.years.join(',')
    if (options.isFavorite !== undefined) params.IsFavorite = options.isFavorite
    if (options.isPlayed !== undefined) params.IsPlayed = options.isPlayed
    if (options.hasSubtitles !== undefined) params.HasSubtitles = options.hasSubtitles

    const response = await api.get<ItemsResponse>(`/Users/${userId}/Items`, { params })
    return response.data
  },

  /**
   * Get "Continue Watching" items
   */
  async getResumeItems(userId: string, limit: number = 12): Promise<BaseItemDto[]> {
    const response = await api.get<ItemsResponse>(`/Users/${userId}/Items/Resume`, {
      params: {
        Limit: limit,
        Fields: DEFAULT_FIELDS,
        EnableImages: true,
        EnableImageTypes: DEFAULT_IMAGE_TYPES,
        ImageTypeLimit: 1,
        MediaTypes: 'Video',
      },
    })
    return response.data.Items
  },

  /**
   * Get latest items in a library
   */
  async getLatestItems(userId: string, parentId?: string, limit: number = 16): Promise<BaseItemDto[]> {
    const params: Record<string, string | number | boolean> = {
      Limit: limit,
      Fields: DEFAULT_FIELDS,
      EnableImages: true,
      EnableImageTypes: DEFAULT_IMAGE_TYPES,
      ImageTypeLimit: 1,
    }

    if (parentId) params.ParentId = parentId

    const response = await api.get<BaseItemDto[]>(`/Users/${userId}/Items/Latest`, { params })
    return response.data
  },

  /**
   * Get single item details
   */
  async getItem(userId: string, itemId: string): Promise<BaseItemDto> {
    const response = await api.get<BaseItemDto>(`/Users/${userId}/Items/${itemId}`, {
      params: {
        Fields: DEFAULT_FIELDS,
      },
    })
    return response.data
  },

  /**
   * Get similar items
   */
  async getSimilarItems(itemId: string, userId: string, limit: number = 12): Promise<BaseItemDto[]> {
    const response = await api.get<ItemsResponse>(`/Items/${itemId}/Similar`, {
      params: {
        UserId: userId,
        Limit: limit,
        Fields: 'Overview,Genres,CommunityRating,ProductionYear',
      },
    })
    return response.data.Items
  },

  // ------------------------------------------
  // TV Shows
  // ------------------------------------------

  /**
   * Get seasons for a series
   */
  async getSeasons(seriesId: string, userId: string): Promise<BaseItemDto[]> {
    const response = await api.get<ItemsResponse>(`/Shows/${seriesId}/Seasons`, {
      params: {
        UserId: userId,
        Fields: 'Overview,RecursiveItemCount',
        EnableImages: true,
        EnableImageTypes: 'Primary,Backdrop,Thumb',
      },
    })
    return response.data.Items
  },

  /**
   * Get episodes for a season
   */
  async getEpisodes(seriesId: string, seasonId: string, userId: string): Promise<BaseItemDto[]> {
    const response = await api.get<ItemsResponse>(`/Shows/${seriesId}/Episodes`, {
      params: {
        UserId: userId,
        SeasonId: seasonId,
        Fields: DEFAULT_FIELDS,
        EnableImages: true,
        EnableImageTypes: 'Primary,Backdrop,Thumb',
      },
    })
    return response.data.Items
  },

  /**
   * Get next up episodes for a user
   */
  async getNextUp(userId: string, limit: number = 12, seriesId?: string): Promise<BaseItemDto[]> {
    const response = await api.get<ItemsResponse>('/Shows/NextUp', {
      params: {
        UserId: userId,
        Limit: limit,
        SeriesId: seriesId,
        Fields: DEFAULT_FIELDS,
        EnableImages: true,
        EnableImageTypes: DEFAULT_IMAGE_TYPES,
      },
    })
    return response.data.Items
  },

  /**
   * Get first episode of a series (for play button when no progress exists)
   */
  async getFirstEpisode(seriesId: string, userId: string): Promise<BaseItemDto | null> {
    try {
      // First try NextUp (next unwatched episode)
      const nextUp = await this.getNextUp(userId, 1, seriesId)
      if (nextUp.length > 0) {
        return nextUp[0]
      }

      // If no NextUp, get first episode of first season
      const seasons = await this.getSeasons(seriesId, userId)
      if (!seasons.length) return null

      const episodes = await this.getEpisodes(seriesId, seasons[0].Id!, userId)
      return episodes.length > 0 ? episodes[0] : null
    } catch (error) {
      console.error('Failed to get first episode:', error)
      return null
    }
  },

  // ------------------------------------------
  // Sessions & Remote Control
  // ------------------------------------------

  /**
   * Get active playback sessions
   */
  async getSessions(): Promise<SessionInfo[]> {
    const response = await api.get<SessionInfo[]>('/Sessions', {
      params: {
        ActiveWithinSeconds: 960,
      },
    })
    return response.data
  },

  /**
   * Get sessions that are currently playing
   */
  async getPlayingSessions(): Promise<SessionInfo[]> {
    const sessions = await this.getSessions()
    return sessions.filter((s) => s.NowPlayingItem)
  },

  /**
   * Start playback on a session
   */
  async playOnSession(
    sessionId: string,
    itemIds: string[],
    options: { startPositionTicks?: number; playCommand?: PlayCommand; startIndex?: number } = {}
  ): Promise<void> {
    await api.post(`/Sessions/${sessionId}/Playing`, null, {
      params: {
        ItemIds: itemIds.join(','),
        PlayCommand: options.playCommand ?? 'PlayNow',
        StartPositionTicks: options.startPositionTicks,
        StartIndex: options.startIndex,
      },
    })
  },

  /**
   * Send a playstate command (Pause, Unpause, Stop, NextTrack, PreviousTrack, etc.)
   */
  async sendPlaystateCommand(
    sessionId: string,
    command: PlaystateCommand,
    options: { seekPositionTicks?: number } = {}
  ): Promise<void> {
    await api.post(`/Sessions/${sessionId}/Playing/${command}`, null, {
      params: options.seekPositionTicks ? { SeekPositionTicks: options.seekPositionTicks } : undefined,
    })
  },

  /**
   * Send a general command to a session
   */
  async sendGeneralCommand(
    sessionId: string,
    command: GeneralCommandType,
    args?: Record<string, string>
  ): Promise<void> {
    await api.post(`/Sessions/${sessionId}/Command`, {
      Name: command,
      Arguments: args,
    })
  },

  /**
   * Seek to a position in the currently playing media
   */
  async seek(sessionId: string, positionTicks: number): Promise<void> {
    await this.sendPlaystateCommand(sessionId, 'Seek', { seekPositionTicks: positionTicks })
  },

  /**
   * Set the volume on a session (0-100)
   */
  async setVolume(sessionId: string, volume: number): Promise<void> {
    await this.sendGeneralCommand(sessionId, 'SetVolume', {
      Volume: Math.max(0, Math.min(100, volume)).toString(),
    })
  },

  /**
   * Toggle mute on a session
   */
  async toggleMute(sessionId: string): Promise<void> {
    await this.sendGeneralCommand(sessionId, 'ToggleMute')
  },

  /**
   * Set audio stream index
   */
  async setAudioStream(sessionId: string, index: number): Promise<void> {
    await this.sendGeneralCommand(sessionId, 'SetAudioStreamIndex', {
      Index: index.toString(),
    })
  },

  /**
   * Set subtitle stream index (-1 to disable)
   */
  async setSubtitleStream(sessionId: string, index: number): Promise<void> {
    await this.sendGeneralCommand(sessionId, 'SetSubtitleStreamIndex', {
      Index: index.toString(),
    })
  },

  // ------------------------------------------
  // Images
  // ------------------------------------------

  /**
   * Construct image URL for an item
   */
  getImageUrl(
    itemId: string,
    imageType: ImageType = 'Primary',
    options: ImageOptions = {}
  ): string {
    const { serverUrl, accessToken } = useConfigStore.getState()

    if (!serverUrl) return ''

    const params = new URLSearchParams()

    if (options.maxWidth) params.set('maxWidth', options.maxWidth.toString())
    if (options.maxHeight) params.set('maxHeight', options.maxHeight.toString())
    if (options.width) params.set('width', options.width.toString())
    if (options.height) params.set('height', options.height.toString())
    if (options.quality) params.set('quality', options.quality.toString())
    if (options.fillWidth) params.set('fillWidth', options.fillWidth.toString())
    if (options.fillHeight) params.set('fillHeight', options.fillHeight.toString())
    if (options.tag) params.set('tag', options.tag)
    if (options.format) params.set('format', options.format)
    if (options.blur) params.set('blur', options.blur.toString())
    if (options.backgroundColor) params.set('backgroundColor', options.backgroundColor)
    if (options.imageIndex !== undefined) params.set('imageIndex', options.imageIndex.toString())

    // Add token for authenticated requests
    if (accessToken) {
      params.set('api_key', accessToken)
    }

    const queryString = params.toString()
    const baseUrl = `${serverUrl}/Items/${itemId}/Images/${imageType}`

    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  },

  /**
   * Get backdrop image URL (convenience method)
   */
  getBackdropUrl(itemId: string, options: ImageOptions = {}): string {
    return this.getImageUrl(itemId, 'Backdrop', {
      maxWidth: 1920,
      quality: 90,
      ...options,
    })
  },

  /**
   * Get primary/poster image URL (convenience method)
   */
  getPrimaryUrl(itemId: string, options: ImageOptions = {}): string {
    return this.getImageUrl(itemId, 'Primary', {
      maxWidth: 400,
      quality: 90,
      ...options,
    })
  },

  /**
   * Get thumbnail image URL (convenience method)
   */
  getThumbUrl(itemId: string, options: ImageOptions = {}): string {
    return this.getImageUrl(itemId, 'Thumb', {
      maxWidth: 600,
      quality: 85,
      ...options,
    })
  },

  /**
   * Get logo image URL (convenience method)
   */
  getLogoUrl(itemId: string, options: ImageOptions = {}): string {
    return this.getImageUrl(itemId, 'Logo', {
      maxWidth: 400,
      quality: 90,
      ...options,
    })
  },

  // ------------------------------------------
  // Streaming
  // ------------------------------------------

  /**
   * Get video stream URL for direct play
   */
  getStreamUrl(
    itemId: string,
    mediaSourceId?: string,
    container?: string
  ): string {
    const { serverUrl, accessToken } = useConfigStore.getState()

    if (!serverUrl) return ''

    const params = new URLSearchParams()
    params.set('Static', 'true')
    params.set('mediaSourceId', mediaSourceId || itemId)
    if (container) {
      params.set('Container', container)
    }
    if (accessToken) {
      params.set('api_key', accessToken)
    }

    return `${serverUrl}/Videos/${itemId}/stream?${params.toString()}`
  },

  /**
   * Get video stream URL with full playback info
   * This gets the proper URL with all necessary parameters
   */
  async getPlaybackInfo(
    itemId: string,
    userId: string
  ): Promise<{ url: string; mediaSourceId: string; container: string; playSessionId?: string } | null> {
    try {
      const response = await api.post<{
        MediaSources: Array<{
          Id: string
          Container: string
          Path: string
          Protocol: string
          SupportsDirectPlay: boolean
          SupportsDirectStream: boolean
        }>
        PlaySessionId?: string
      }>(`/Items/${itemId}/PlaybackInfo?userId=${userId}`, {
        StartTimeTicks: 0,
        IsPlayback: true,
        AutoOpenLiveStream: true,
        MaxStreamingBitrate: 140000000,
      })

      const mediaSource = response.data.MediaSources?.[0]
      if (!mediaSource) return null

      // If it's a local file (Protocol: "File"), use the path directly
      // This works when the file is accessible (e.g., local drive or mounted network drive)
      if (mediaSource.Protocol === 'File' && mediaSource.Path && mediaSource.SupportsDirectPlay) {
        return {
          url: mediaSource.Path,
          mediaSourceId: mediaSource.Id,
          container: mediaSource.Container,
          playSessionId: response.data.PlaySessionId,
        }
      }

      // For remote files, use the streaming URL
      const { serverUrl, accessToken } = useConfigStore.getState()
      if (!serverUrl) return null

      // Build the stream URL
      const params = new URLSearchParams()
      params.set('Static', 'true')
      params.set('mediaSourceId', mediaSource.Id)
      params.set('Container', mediaSource.Container)
      if (accessToken) {
        params.set('api_key', accessToken)
      }

      return {
        url: `${serverUrl}/Videos/${itemId}/stream.${mediaSource.Container}?${params.toString()}`,
        mediaSourceId: mediaSource.Id,
        container: mediaSource.Container,
        playSessionId: response.data.PlaySessionId,
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: unknown }; message?: string }
      console.error('API Error:', `/Items/${itemId}/PlaybackInfo?userId=${userId}`)
      console.error('Failed to get playback info:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message
      })
      return null
    }
  },

  // ------------------------------------------
  // User Data
  // ------------------------------------------

  /**
   * Mark item as favorite
   */
  async markFavorite(userId: string, itemId: string): Promise<void> {
    await api.post(`/Users/${userId}/FavoriteItems/${itemId}`)
  },

  /**
   * Unmark item as favorite
   */
  async unmarkFavorite(userId: string, itemId: string): Promise<void> {
    await api.delete(`/Users/${userId}/FavoriteItems/${itemId}`)
  },

  /**
   * Mark item as played
   */
  async markPlayed(userId: string, itemId: string): Promise<void> {
    await api.post(`/Users/${userId}/PlayedItems/${itemId}`)
  },

  /**
   * Mark item as unplayed
   */
  async markUnplayed(userId: string, itemId: string): Promise<void> {
    await api.delete(`/Users/${userId}/PlayedItems/${itemId}`)
  },

  // ------------------------------------------
  // Search
  // ------------------------------------------

  /**
   * Search for items
   */
  async search(userId: string, searchTerm: string, limit: number = 24): Promise<BaseItemDto[]> {
    const response = await api.get<ItemsResponse>(`/Users/${userId}/Items`, {
      params: {
        SearchTerm: searchTerm,
        IncludeItemTypes: 'Movie,Series,Episode,Audio,MusicAlbum,MusicArtist',
        Limit: limit,
        Fields: 'Overview,Genres,ProductionYear',
        Recursive: true,
        EnableImages: true,
        ImageTypeLimit: 1,
      },
    })
    return response.data.Items
  },
}

export default jellyfinApi
