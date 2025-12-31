import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { jellyfinApi } from '../services'
import { useConfigStore } from './configStore'
import type { JellyfinUser, PublicSystemInfo } from '../types'

interface AuthState {
  // State
  user: JellyfinUser | null
  serverInfo: PublicSystemInfo | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  testConnection: (serverUrl: string) => Promise<PublicSystemInfo>
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  validateSession: () => Promise<boolean>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      serverInfo: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Test connection to a Jellyfin server
      testConnection: async (serverUrl: string) => {
        set({ isLoading: true, error: null })

        try {
          // Normalize URL
          const normalizedUrl = serverUrl.replace(/\/+$/, '')

          // Test connection by fetching public info
          const serverInfo = await jellyfinApi.getPublicInfo(normalizedUrl)

          // Save server URL to config store
          useConfigStore.getState().setServerUrl(normalizedUrl)

          set({ serverInfo, isLoading: false })
          return serverInfo
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to connect to server'
          set({ error: message, isLoading: false, serverInfo: null })
          throw new Error(message)
        }
      },

      // Login with username and password
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          const authResult = await jellyfinApi.authenticateByName(username, password)

          set({
            user: authResult.User,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          const message = (error as { message?: string })?.message || 'Authentication failed'
          set({ error: message, isLoading: false, isAuthenticated: false })
          throw new Error(message)
        }
      },

      // Logout
      logout: async () => {
        set({ isLoading: true })

        try {
          await jellyfinApi.logout()
        } catch {
          // Ignore logout errors
        } finally {
          // Clear all auth state
          useConfigStore.getState().clearCredentials()
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      // Validate existing session on app start
      validateSession: async () => {
        const configStore = useConfigStore.getState()

        // Check if we have stored credentials
        if (!configStore.isAuthenticated() || !configStore.serverUrl) {
          set({ isAuthenticated: false })
          return false
        }

        set({ isLoading: true })

        try {
          // Try to fetch libraries to validate the session
          const libraries = await jellyfinApi.getLibraries(configStore.userId!)

          if (libraries) {
            set({ isAuthenticated: true, isLoading: false })
            return true
          }

          return false
        } catch {
          // Session is invalid, clear credentials
          configStore.clearCredentials()
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
          return false
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'hubremote-auth',
      partialize: (state) => ({
        user: state.user,
        serverInfo: state.serverInfo,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
