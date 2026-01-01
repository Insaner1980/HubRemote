import { useEffect, useCallback } from 'react'
import { trayService, TrayCommand } from '../services/tray'
import { playerService } from '../services/player'
import { useUIStore } from '../stores/uiStore'

/**
 * Hook to handle system tray integration
 *
 * - Listens for tray commands (play/pause, next, previous)
 * - Updates tray with current playback info
 */
export function useTray() {
  const localPlayback = useUIStore((state) => state.localPlayback)

  // Handle tray commands
  const handleTrayCommand = useCallback(
    async (command: TrayCommand) => {
      try {
        switch (command) {
          case 'playPause':
            await playerService.togglePlayback()
            break
          case 'next':
            // TODO: Implement next track
            break
          case 'previous':
            // TODO: Implement previous track
            break
        }
      } catch (error) {
        console.error('Error handling tray command:', error)
      }
    },
    []
  )

  // Listen for tray commands
  useEffect(() => {
    let unlisten: (() => void) | null = null

    const setup = async () => {
      try {
        unlisten = await trayService.onTrayCommand(handleTrayCommand)
      } catch (error) {
        console.error('Failed to setup tray command listener:', error)
      }
    }

    setup()

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [handleTrayCommand])

  // Update tray with playback info when it changes
  useEffect(() => {
    const updateTray = async () => {
      try {
        if (localPlayback) {
          // Use itemName and seriesName for display
          const title = localPlayback.itemName || undefined
          const artist = localPlayback.seriesName || undefined

          await trayService.updatePlayback({
            isPlaying: localPlayback.isPlaying,
            title,
            artist,
          })
        } else {
          // Clear playback info
          await trayService.updatePlayback({
            isPlaying: false,
          })
        }
      } catch (error) {
        console.error('Failed to update tray:', error)
      }
    }

    updateTray()
  }, [localPlayback])
}

export default useTray
