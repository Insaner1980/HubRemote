import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JellyfinConfig } from '../types'

// Generate a unique device ID for this installation
function generateDeviceId(): string {
  const stored = localStorage.getItem('hubremote-device-id')
  if (stored) return stored

  const id = `hubremote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  localStorage.setItem('hubremote-device-id', id)
  return id
}

// Detect device name based on platform
function getDeviceName(): string {
  const userAgent = navigator.userAgent
  if (userAgent.includes('Windows')) return 'Windows PC'
  if (userAgent.includes('Mac')) return 'Mac'
  if (userAgent.includes('Linux')) return 'Linux PC'
  if (userAgent.includes('iPhone')) return 'iPhone'
  if (userAgent.includes('iPad')) return 'iPad'
  if (userAgent.includes('Android')) return 'Android Device'
  return 'HubRemote Device'
}

// Shortcut configuration
export interface ShortcutSettings {
  enabled: boolean
  playPause: string
  nextTrack: string
  previousTrack: string
  stop: string
  volumeUp: string
  volumeDown: string
  mute: string
}

const defaultShortcuts: ShortcutSettings = {
  enabled: true,
  playPause: 'MediaPlayPause',
  nextTrack: 'MediaNextTrack',
  previousTrack: 'MediaPreviousTrack',
  stop: 'MediaStop',
  volumeUp: '',
  volumeDown: '',
  mute: '',
}

// Tray settings
export interface TraySettings {
  minimizeToTray: boolean
  showNotifications: boolean
}

const defaultTraySettings: TraySettings = {
  minimizeToTray: true,
  showNotifications: true,
}

// Rclone settings
export interface RcloneSettings {
  rclonePath: string
  remoteName: string
  remoteFolder: string
  mountPoint: string
  vfsCacheMode: 'off' | 'minimal' | 'writes' | 'full'
  autoMount: boolean
}

const defaultRcloneSettings: RcloneSettings = {
  rclonePath: 'rclone',
  remoteName: 'gdrive',
  remoteFolder: 'Media Hub',
  mountPoint: 'G:',
  vfsCacheMode: 'full',
  autoMount: false,  // Disabled - use local storage instead
}

interface ConfigState extends JellyfinConfig {
  // Shortcut settings
  shortcuts: ShortcutSettings

  // Tray settings
  tray: TraySettings

  // Rclone settings
  rclone: RcloneSettings

  // Actions
  setServerUrl: (url: string) => void
  setCredentials: (accessToken: string, userId: string, serverId: string) => void
  clearCredentials: () => void
  isConfigured: () => boolean
  isAuthenticated: () => boolean
  getAuthorizationHeader: () => string

  // Shortcut actions
  setShortcutsEnabled: (enabled: boolean) => void
  updateShortcut: (key: keyof Omit<ShortcutSettings, 'enabled'>, value: string) => void
  resetShortcuts: () => void

  // Tray actions
  setMinimizeToTray: (enabled: boolean) => void
  setShowNotifications: (enabled: boolean) => void

  // Rclone actions
  updateRclone: (settings: Partial<RcloneSettings>) => void
  resetRclone: () => void
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      // Initial state
      serverUrl: '',
      accessToken: null,
      userId: null,
      serverId: null,
      deviceId: generateDeviceId(),
      deviceName: getDeviceName(),
      clientName: 'HubRemote',
      clientVersion: '0.1.0',

      // Shortcut settings
      shortcuts: defaultShortcuts,

      // Tray settings
      tray: defaultTraySettings,

      // Rclone settings
      rclone: defaultRcloneSettings,

      // Actions
      setServerUrl: (url: string) => {
        // Normalize URL (remove trailing slash)
        const normalizedUrl = url.replace(/\/+$/, '')
        set({ serverUrl: normalizedUrl })
      },

      setCredentials: (accessToken: string, userId: string, serverId: string) => {
        set({ accessToken, userId, serverId })
      },

      clearCredentials: () => {
        set({ accessToken: null, userId: null, serverId: null })
      },

      isConfigured: () => {
        const { serverUrl } = get()
        return Boolean(serverUrl)
      },

      isAuthenticated: () => {
        const { accessToken, userId } = get()
        return Boolean(accessToken && userId)
      },

      getAuthorizationHeader: () => {
        const { clientName, deviceName, deviceId, clientVersion, accessToken } = get()

        let header = `MediaBrowser Client="${clientName}", Device="${deviceName}", DeviceId="${deviceId}", Version="${clientVersion}"`

        if (accessToken) {
          header += `, Token="${accessToken}"`
        }

        return header
      },

      // Shortcut actions
      setShortcutsEnabled: (enabled: boolean) => {
        set((state) => ({
          shortcuts: { ...state.shortcuts, enabled },
        }))
      },

      updateShortcut: (key, value) => {
        set((state) => ({
          shortcuts: { ...state.shortcuts, [key]: value },
        }))
      },

      resetShortcuts: () => {
        set({ shortcuts: defaultShortcuts })
      },

      // Tray actions
      setMinimizeToTray: (enabled: boolean) => {
        set((state) => ({
          tray: { ...state.tray, minimizeToTray: enabled },
        }))
      },

      setShowNotifications: (enabled: boolean) => {
        set((state) => ({
          tray: { ...state.tray, showNotifications: enabled },
        }))
      },

      // Rclone actions
      updateRclone: (settings: Partial<RcloneSettings>) => {
        set((state) => ({
          rclone: { ...state.rclone, ...settings },
        }))
      },

      resetRclone: () => {
        set({ rclone: defaultRcloneSettings })
      },
    }),
    {
      name: 'hubremote-config',
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        accessToken: state.accessToken,
        userId: state.userId,
        serverId: state.serverId,
        deviceId: state.deviceId,
        deviceName: state.deviceName,
        shortcuts: state.shortcuts,
        tray: state.tray,
        rclone: state.rclone,
      }),
    }
  )
)
