import { useEffect, useCallback } from 'react'
import { shortcutsService, ShortcutEvent } from '../services/shortcuts'
import { useUIStore } from '../stores/uiStore'
import { playerService } from '../services/player'

/**
 * Hook to handle global media key shortcuts
 * Connects Tauri global shortcuts to player actions
 */
export function useGlobalShortcuts(enabled: boolean = true) {
  const { localPlayback } = useUIStore()

  const handleShortcut = useCallback(
    async (event: ShortcutEvent) => {
      // Only handle shortcuts if there's active playback
      if (!localPlayback && event.action !== 'playPause') {
        return
      }

      const action = typeof event.action === 'string' ? event.action : event.action.custom

      try {
        switch (action) {
          case 'playPause':
            await playerService.togglePlayback()
            break
          case 'nextTrack':
            // TODO: Implement next track logic (next episode, etc.)
            break
          case 'previousTrack':
            // TODO: Implement previous track logic
            break
          case 'stop':
            await playerService.stop()
            break
          case 'volumeUp':
            const currentVol = await playerService.getVolume()
            await playerService.setVolume(Math.min(100, currentVol + 5))
            break
          case 'volumeDown':
            const vol = await playerService.getVolume()
            await playerService.setVolume(Math.max(0, vol - 5))
            break
          case 'mute':
            await playerService.toggleMute()
            break
        }
      } catch (error) {
        console.error('Error handling shortcut:', error)
      }
    },
    [localPlayback]
  )

  useEffect(() => {
    if (!enabled) return

    let unlisten: (() => void) | null = null

    const setup = async () => {
      try {
        // Enable shortcuts
        await shortcutsService.enable()

        // Listen for shortcut events
        unlisten = await shortcutsService.onShortcut(handleShortcut)
      } catch (error) {
        console.error('Failed to setup global shortcuts:', error)
      }
    }

    setup()

    return () => {
      if (unlisten) {
        unlisten()
      }
      // Don't disable shortcuts on unmount - they should persist
    }
  }, [enabled, handleShortcut])
}

export default useGlobalShortcuts
