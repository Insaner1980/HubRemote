import { create } from 'zustand'
import type { SessionInfo } from '../types'

interface SessionState {
  // Selected session for remote control
  selectedSessionId: string | null
  selectedSession: SessionInfo | null

  // Polling settings
  pollingEnabled: boolean
  pollingInterval: number // in ms

  // Actions
  selectSession: (session: SessionInfo | null) => void
  setPollingEnabled: (enabled: boolean) => void
  setPollingInterval: (interval: number) => void
  updateSelectedSession: (sessions: SessionInfo[]) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  selectedSessionId: null,
  selectedSession: null,
  pollingEnabled: true,
  pollingInterval: 2000, // 2 seconds

  selectSession: (session) =>
    set({
      selectedSessionId: session?.Id ?? null,
      selectedSession: session,
    }),

  setPollingEnabled: (enabled) =>
    set({ pollingEnabled: enabled }),

  setPollingInterval: (interval) =>
    set({ pollingInterval: Math.max(1000, interval) }), // Minimum 1 second

  // Update selected session with fresh data from sessions list
  updateSelectedSession: (sessions) => {
    const { selectedSessionId } = get()
    if (!selectedSessionId) return

    const updated = sessions.find((s) => s.Id === selectedSessionId)
    if (updated) {
      set({ selectedSession: updated })
    } else {
      // Session no longer available, clear selection
      set({ selectedSessionId: null, selectedSession: null })
    }
  },

  clearSession: () =>
    set({
      selectedSessionId: null,
      selectedSession: null,
    }),
}))
