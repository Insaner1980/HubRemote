import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Mini player
  miniPlayerVisible: boolean
  setMiniPlayerVisible: (visible: boolean) => void

  // Local playback state (for mini player)
  localPlayback: {
    isPlaying: boolean
    itemId: string | null
    itemName: string | null
    seriesName: string | null
    position: number
    duration: number
    posterUrl: string | null
  } | null
  setLocalPlayback: (playback: UIState['localPlayback']) => void
  updateLocalPlaybackPosition: (position: number) => void
  clearLocalPlayback: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar - default collapsed on mobile, expanded on desktop
      sidebarCollapsed: window.innerWidth < 1024,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Mini player
      miniPlayerVisible: false,
      setMiniPlayerVisible: (visible) => set({ miniPlayerVisible: visible }),

      // Local playback
      localPlayback: null,
      setLocalPlayback: (playback) => set({ localPlayback: playback, miniPlayerVisible: !!playback }),
      updateLocalPlaybackPosition: (position) =>
        set((state) => ({
          localPlayback: state.localPlayback ? { ...state.localPlayback, position } : null,
        })),
      clearLocalPlayback: () => set({ localPlayback: null, miniPlayerVisible: false }),
    }),
    {
      name: 'hubremote-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
