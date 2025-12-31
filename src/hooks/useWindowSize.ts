import { useEffect } from 'react'
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'

const STORAGE_KEY = 'hubremote-window-size'

// Default and minimum sizes (matching tauri.conf.json)
const DEFAULT_WIDTH = 1100
const DEFAULT_HEIGHT = 700
const MIN_WIDTH = 750
const MIN_HEIGHT = 550

interface WindowSize {
  width: number
  height: number
}

export function useWindowSize() {
  useEffect(() => {
    const appWindow = getCurrentWindow()
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    // Restore saved window size on mount
    const restoreSize = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const { width, height }: WindowSize = JSON.parse(saved)

          // Get available screen size (accounts for taskbar, etc.)
          const screenWidth = window.screen.availWidth
          const screenHeight = window.screen.availHeight

          // Check if saved size fits current screen
          const fitsScreen = width <= screenWidth && height <= screenHeight

          // Use saved size only if it's valid and fits screen
          if (width >= MIN_WIDTH && height >= MIN_HEIGHT && fitsScreen) {
            await appWindow.setSize(new LogicalSize(width, height))
          } else if (!fitsScreen) {
            // Saved size doesn't fit - use defaults or screen-constrained size
            const newWidth = Math.min(DEFAULT_WIDTH, screenWidth - 50)
            const newHeight = Math.min(DEFAULT_HEIGHT, screenHeight - 50)
            await appWindow.setSize(new LogicalSize(
              Math.max(newWidth, MIN_WIDTH),
              Math.max(newHeight, MIN_HEIGHT)
            ))
            // Clear invalid saved size
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      } catch (err) {
        console.error('Failed to restore window size:', err)
      }
    }

    // Save window size on resize (debounced)
    const saveSize = async () => {
      try {
        const size = await appWindow.innerSize()
        const windowSize: WindowSize = {
          width: size.width,
          height: size.height,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(windowSize))
      } catch (err) {
        console.error('Failed to save window size:', err)
      }
    }

    // Listen for resize events
    const setupListener = async () => {
      // Restore size first
      await restoreSize()

      // Listen for resize
      const unlisten = await appWindow.onResized(() => {
        // Debounce to avoid excessive saves
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }
        debounceTimer = setTimeout(saveSize, 500)
      })

      return unlisten
    }

    let unlisten: (() => void) | undefined

    setupListener().then((unlistenFn) => {
      unlisten = unlistenFn
    })

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      if (unlisten) {
        unlisten()
      }
    }
  }, [])
}
