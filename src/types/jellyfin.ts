// ============================================
// Authentication Types
// ============================================

export interface AuthenticationResult {
  User: JellyfinUser
  AccessToken: string
  ServerId: string
  SessionInfo: SessionInfo
}

export interface JellyfinUser {
  Id: string
  Name: string
  ServerId: string
  HasPassword: boolean
  HasConfiguredPassword: boolean
  HasConfiguredEasyPassword: boolean
  EnableAutoLogin: boolean
  LastLoginDate?: string
  LastActivityDate?: string
  Configuration: UserConfiguration
  Policy: UserPolicy
  PrimaryImageTag?: string
}

export interface UserConfiguration {
  PlayDefaultAudioTrack: boolean
  SubtitleLanguagePreference: string
  DisplayMissingEpisodes: boolean
  SubtitleMode: string
  EnableLocalPassword: boolean
  OrderedViews: string[]
  LatestItemsExcludes: string[]
  MyMediaExcludes: string[]
  HidePlayedInLatest: boolean
  RememberAudioSelections: boolean
  RememberSubtitleSelections: boolean
  EnableNextEpisodeAutoPlay: boolean
}

export interface UserPolicy {
  IsAdministrator: boolean
  IsHidden: boolean
  IsDisabled: boolean
  EnableUserPreferenceAccess: boolean
  EnableRemoteControlOfOtherUsers: boolean
  EnableSharedDeviceControl: boolean
  EnableRemoteAccess: boolean
  EnableLiveTvManagement: boolean
  EnableLiveTvAccess: boolean
  EnableMediaPlayback: boolean
  EnableAudioPlaybackTranscoding: boolean
  EnableVideoPlaybackTranscoding: boolean
  EnablePlaybackRemuxing: boolean
  EnableContentDeletion: boolean
  EnableContentDownloading: boolean
  EnableSyncTranscoding: boolean
  EnableMediaConversion: boolean
  EnableAllDevices: boolean
  EnableAllChannels: boolean
  EnableAllFolders: boolean
  InvalidLoginAttemptCount: number
  LoginAttemptsBeforeLockout: number
  MaxActiveSessions: number
  RemoteClientBitrateLimit: number
  AuthenticationProviderId: string
  PasswordResetProviderId: string
  SyncPlayAccess: string
}

// ============================================
// Library & Item Types
// ============================================

export interface BaseItemDto {
  Id: string
  Name: string
  ServerId: string
  Type: ItemType
  CollectionType?: CollectionType
  IsFolder?: boolean
  ParentId?: string
  SeriesId?: string
  SeriesName?: string
  SeasonId?: string
  SeasonName?: string
  IndexNumber?: number
  ParentIndexNumber?: number
  Overview?: string
  Taglines?: string[]
  Genres?: string[]
  CommunityRating?: number
  CriticRating?: number
  OfficialRating?: string
  RunTimeTicks?: number
  ProductionYear?: number
  PremiereDate?: string
  EndDate?: string
  Status?: string
  AirTime?: string
  AirDays?: string[]
  Studios?: StudioInfo[]
  People?: PersonInfo[]
  Tags?: string[]
  ImageTags?: Record<ImageType, string>
  BackdropImageTags?: string[]
  UserData?: UserItemDataDto
  MediaSources?: MediaSourceInfo[]
  MediaStreams?: MediaStream[]
  ProviderIds?: Record<string, string>
  Path?: string
  Container?: string
  DateCreated?: string
  SortName?: string
  ExternalUrls?: ExternalUrl[]
  MediaType?: MediaType
  Width?: number
  Height?: number
  ChildCount?: number
  RecursiveItemCount?: number
  PlayAccess?: string
  CanDelete?: boolean
  CanDownload?: boolean
  // Music-specific properties
  AlbumArtist?: string
  AlbumArtists?: { Name: string; Id: string }[]
  Artists?: string[]
  ArtistItems?: { Name: string; Id: string }[]
  AlbumCount?: number
  SongCount?: number
  AlbumId?: string
  Album?: string
}

export type ItemType =
  | 'Movie'
  | 'Series'
  | 'Season'
  | 'Episode'
  | 'Audio'
  | 'MusicAlbum'
  | 'MusicArtist'
  | 'Playlist'
  | 'BoxSet'
  | 'Folder'
  | 'CollectionFolder'
  | 'Photo'
  | 'Video'
  | 'Book'
  | 'Person'
  | 'Studio'
  | 'Genre'
  | 'MusicGenre'
  | 'MusicVideo'
  | 'Trailer'
  | 'Channel'
  | 'Program'
  | 'Recording'
  | 'LiveTvChannel'
  | 'LiveTvProgram'

export type CollectionType =
  | 'movies'
  | 'tvshows'
  | 'music'
  | 'musicvideos'
  | 'trailers'
  | 'homevideos'
  | 'boxsets'
  | 'books'
  | 'photos'
  | 'livetv'
  | 'playlists'
  | 'folders'

export type MediaType = 'Video' | 'Audio' | 'Photo' | 'Book'

export type ImageType =
  | 'Primary'
  | 'Backdrop'
  | 'Logo'
  | 'Banner'
  | 'Thumb'
  | 'Art'
  | 'Disc'
  | 'Box'
  | 'Screenshot'
  | 'Menu'
  | 'Chapter'
  | 'BoxRear'
  | 'Profile'

export interface StudioInfo {
  Id: string
  Name: string
}

export interface PersonInfo {
  Id: string
  Name: string
  Role?: string
  Type: string
  PrimaryImageTag?: string
}

export interface ExternalUrl {
  Name: string
  Url: string
}

// ============================================
// User Data Types
// ============================================

export interface UserItemDataDto {
  PlaybackPositionTicks: number
  PlayCount: number
  IsFavorite: boolean
  Played: boolean
  Key: string
  LastPlayedDate?: string
  UnplayedItemCount?: number
}

// ============================================
// Media Source & Stream Types
// ============================================

export interface MediaSourceInfo {
  Id: string
  Name: string
  Path?: string
  Container: string
  Size?: number
  Bitrate?: number
  RunTimeTicks?: number
  SupportsDirectPlay: boolean
  SupportsDirectStream: boolean
  SupportsTranscoding: boolean
  MediaStreams: MediaStream[]
  RequiredHttpHeaders?: Record<string, string>
  TranscodingUrl?: string
  TranscodingSubProtocol?: string
  TranscodingContainer?: string
  DefaultAudioStreamIndex?: number
  DefaultSubtitleStreamIndex?: number
}

export interface MediaStream {
  Index: number
  Type: 'Video' | 'Audio' | 'Subtitle' | 'EmbeddedImage'
  Codec?: string
  CodecTag?: string
  Language?: string
  DisplayTitle?: string
  DisplayLanguage?: string
  Title?: string
  IsDefault: boolean
  IsForced: boolean
  IsExternal: boolean
  IsTextSubtitleStream?: boolean
  SupportsExternalStream: boolean
  Height?: number
  Width?: number
  AverageFrameRate?: number
  RealFrameRate?: number
  BitRate?: number
  BitDepth?: number
  Channels?: number
  SampleRate?: number
  ChannelLayout?: string
  Profile?: string
  Level?: number
  AspectRatio?: string
  PixelFormat?: string
  VideoRange?: string
  VideoRangeType?: string
  ColorSpace?: string
  ColorTransfer?: string
  ColorPrimaries?: string
  DeliveryMethod?: string
  DeliveryUrl?: string
}

// ============================================
// Session Types
// ============================================

export interface SessionInfo {
  Id: string
  UserId: string
  UserName: string
  Client: string
  DeviceId: string
  DeviceName: string
  DeviceType?: string
  ApplicationVersion: string
  LastActivityDate: string
  LastPlaybackCheckIn: string
  NowPlayingItem?: BaseItemDto
  NowPlayingQueue?: QueueItem[]
  NowPlayingQueueFullItems?: BaseItemDto[]
  FullNowPlayingItem?: BaseItemDto
  PlayState?: PlayerStateInfo
  TranscodingInfo?: TranscodingInfo
  PlayableMediaTypes: MediaType[]
  SupportedCommands: string[]
  SupportsMediaControl: boolean
  SupportsRemoteControl: boolean
  HasCustomDeviceName: boolean
  ServerId: string
  PlaylistItemId?: string
  IsActive: boolean
}

export interface QueueItem {
  Id: string
  PlaylistItemId: string
}

export interface PlayerStateInfo {
  PositionTicks?: number
  CanSeek: boolean
  IsPaused: boolean
  IsMuted: boolean
  VolumeLevel?: number
  AudioStreamIndex?: number
  SubtitleStreamIndex?: number
  MediaSourceId?: string
  PlayMethod?: 'Transcode' | 'DirectStream' | 'DirectPlay'
  RepeatMode?: 'RepeatNone' | 'RepeatAll' | 'RepeatOne'
  ShuffleMode?: 'Sorted' | 'Shuffle'
  LiveStreamId?: string
}

export interface TranscodingInfo {
  AudioCodec?: string
  VideoCodec?: string
  Container?: string
  IsVideoDirect: boolean
  IsAudioDirect: boolean
  Bitrate?: number
  Width?: number
  Height?: number
  AudioChannels?: number
  TranscodeReasons?: string[]
  CompletionPercentage?: number
}

// ============================================
// API Response Types
// ============================================

export interface ItemsResponse {
  Items: BaseItemDto[]
  TotalRecordCount: number
  StartIndex: number
}

export interface LibraryResponse {
  Items: BaseItemDto[]
  TotalRecordCount: number
  StartIndex: number
}

// ============================================
// API Request Types
// ============================================

export interface GetItemsOptions {
  parentId?: string
  includeItemTypes?: ItemType[]
  excludeItemTypes?: ItemType[]
  sortBy?: string[]
  sortOrder?: 'Ascending' | 'Descending'
  filters?: string[]
  fields?: string[]
  limit?: number
  startIndex?: number
  recursive?: boolean
  searchTerm?: string
  genres?: string[]
  years?: number[]
  isFavorite?: boolean
  isPlayed?: boolean
  hasSubtitles?: boolean
  enableImages?: boolean
  imageTypeLimit?: number
  enableImageTypes?: ImageType[]
}

export interface ImageOptions {
  maxWidth?: number
  maxHeight?: number
  width?: number
  height?: number
  quality?: number
  fillWidth?: number
  fillHeight?: number
  tag?: string
  format?: 'jpg' | 'png' | 'gif' | 'webp'
  percentPlayed?: number
  unplayedCount?: number
  blur?: number
  backgroundColor?: string
  foregroundLayer?: string
  imageIndex?: number
}

// ============================================
// Server Info Types
// ============================================

export interface PublicSystemInfo {
  LocalAddress: string
  ServerName: string
  Version: string
  ProductName: string
  OperatingSystem: string
  Id: string
  StartupWizardCompleted: boolean
}

// ============================================
// Playback Types
// ============================================

export interface PlaybackInfoResponse {
  MediaSources: MediaSourceInfo[]
  PlaySessionId: string
}

export interface PlaybackProgressInfo {
  ItemId: string
  MediaSourceId?: string
  PositionTicks?: number
  IsPaused?: boolean
  IsMuted?: boolean
  VolumeLevel?: number
  AudioStreamIndex?: number
  SubtitleStreamIndex?: number
  PlayMethod?: 'Transcode' | 'DirectStream' | 'DirectPlay'
  LiveStreamId?: string
  PlaySessionId?: string
  RepeatMode?: 'RepeatNone' | 'RepeatAll' | 'RepeatOne'
  ShuffleMode?: 'Sorted' | 'Shuffle'
  CanSeek?: boolean
}

// ============================================
// Remote Control Types
// ============================================

export type PlayCommand = 'PlayNow' | 'PlayNext' | 'PlayLast'

export type PlaystateCommand =
  | 'Stop'
  | 'Pause'
  | 'Unpause'
  | 'NextTrack'
  | 'PreviousTrack'
  | 'Seek'
  | 'Rewind'
  | 'FastForward'
  | 'PlayPause'

export type GeneralCommandType =
  | 'MoveUp'
  | 'MoveDown'
  | 'MoveLeft'
  | 'MoveRight'
  | 'PageUp'
  | 'PageDown'
  | 'PreviousLetter'
  | 'NextLetter'
  | 'ToggleOsd'
  | 'ToggleContextMenu'
  | 'Select'
  | 'Back'
  | 'TakeScreenshot'
  | 'SendKey'
  | 'SendString'
  | 'GoHome'
  | 'GoToSettings'
  | 'VolumeUp'
  | 'VolumeDown'
  | 'Mute'
  | 'Unmute'
  | 'ToggleMute'
  | 'SetVolume'
  | 'SetAudioStreamIndex'
  | 'SetSubtitleStreamIndex'
  | 'ToggleFullscreen'
  | 'DisplayContent'
  | 'GoToSearch'
  | 'DisplayMessage'
  | 'SetRepeatMode'
  | 'SetShuffleQueue'
  | 'PlayState'
  | 'PlayNext'
  | 'ChannelUp'
  | 'ChannelDown'
  | 'Guide'
  | 'ToggleStats'
  | 'PlayMediaSource'
  | 'PlayTrailers'

// ============================================
// Helper Types
// ============================================

export interface JellyfinConfig {
  serverUrl: string
  accessToken: string | null
  userId: string | null
  serverId: string | null
  deviceId: string
  deviceName: string
  clientName: string
  clientVersion: string
}

export interface ApiError {
  status: number
  message: string
  code?: string
}
