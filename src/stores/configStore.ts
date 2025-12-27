import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JellyfinConfig } from '../types'

// Generate a unique device ID for this installation
function generateDeviceId(): string {
  const stored = localStorage.getItem('jellyremote-device-id')
  if (stored) return stored

  const id = `jellyremote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  localStorage.setItem('jellyremote-device-id', id)
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
  return 'JellyRemote Device'
}

interface ConfigState extends JellyfinConfig {
  // Actions
  setServerUrl: (url: string) => void
  setCredentials: (accessToken: string, userId: string, serverId: string) => void
  clearCredentials: () => void
  isConfigured: () => boolean
  isAuthenticated: () => boolean
  getAuthorizationHeader: () => string
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
      clientName: 'JellyRemote',
      clientVersion: '0.1.0',

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
    }),
    {
      name: 'jellyremote-config',
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        accessToken: state.accessToken,
        userId: state.userId,
        serverId: state.serverId,
        deviceId: state.deviceId,
        deviceName: state.deviceName,
      }),
    }
  )
)
