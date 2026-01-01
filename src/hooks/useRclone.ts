import { useState, useEffect, useCallback } from 'react'
import { rcloneService, type MountStatus, type RcloneStatus } from '../services/rclone'
import { useConfigStore } from '../stores/configStore'
import { toast } from '../stores/toastStore'

/**
 * Hook for rclone mount management
 *
 * Provides mount/unmount functionality, status checking, and auto-mount on startup
 */
export function useRclone() {
  const rcloneConfig = useConfigStore((state) => state.rclone)
  const [status, setStatus] = useState<RcloneStatus>('idle')
  const [mountStatus, setMountStatus] = useState<MountStatus | null>(null)
  const [rcloneVersion, setRcloneVersion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  // Convert store settings to service config format
  const getConfig = useCallback(() => ({
    rclonePath: rcloneConfig.rclonePath,
    remoteName: rcloneConfig.remoteName,
    remoteFolder: rcloneConfig.remoteFolder,
    mountPoint: rcloneConfig.mountPoint,
    vfsCacheMode: rcloneConfig.vfsCacheMode,
    autoMount: rcloneConfig.autoMount,
  }), [rcloneConfig])

  // Check if rclone is installed
  const checkRclone = useCallback(async () => {
    try {
      const version = await rcloneService.checkRclone(rcloneConfig.rclonePath)
      setRcloneVersion(version)
      setError(null)
      return true
    } catch (err) {
      setRcloneVersion(null)
      setError(err instanceof Error ? err.message : 'Failed to check rclone')
      return false
    }
  }, [rcloneConfig.rclonePath])

  // Check current mount status
  const checkStatus = useCallback(async () => {
    setIsChecking(true)
    try {
      const result = await rcloneService.checkStatus(getConfig())
      setMountStatus(result)
      setStatus(result.isMounted ? 'mounted' : 'unmounted')
      setError(result.error || null)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check status')
      return null
    } finally {
      setIsChecking(false)
    }
  }, [getConfig])

  // Mount the drive
  const mount = useCallback(async () => {
    setStatus('mounting')
    setError(null)
    try {
      const result = await rcloneService.mount(getConfig())
      setMountStatus(result)
      setStatus(result.isMounted ? 'mounted' : 'error')
      if (result.isMounted) {
        toast.success('Drive Mounted', `${rcloneConfig.mountPoint} is now available`)
      }
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mount'
      setError(errorMsg)
      setStatus('error')
      toast.error('Mount Failed', errorMsg)
      throw err
    }
  }, [getConfig, rcloneConfig.mountPoint])

  // Unmount the drive
  const unmount = useCallback(async () => {
    setStatus('unmounting')
    setError(null)
    try {
      await rcloneService.unmount(getConfig())
      setMountStatus((prev) => prev ? { ...prev, isMounted: false } : null)
      setStatus('unmounted')
      toast.success('Drive Unmounted', `${rcloneConfig.mountPoint} has been unmounted`)
      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to unmount'
      setError(errorMsg)
      setStatus('error')
      toast.error('Unmount Failed', errorMsg)
      throw err
    }
  }, [getConfig, rcloneConfig.mountPoint])

  // Toggle mount state
  const toggleMount = useCallback(async () => {
    if (status === 'mounted') {
      return unmount()
    } else {
      return mount()
    }
  }, [status, mount, unmount])

  // Listen for status events from backend
  useEffect(() => {
    let unlisten: (() => void) | null = null

    const setup = async () => {
      try {
        unlisten = await rcloneService.onStatusChange((newStatus) => {
          setStatus(newStatus)
          if (newStatus === 'error') {
            setError('Mount operation failed')
          }
        })
      } catch (err) {
        console.error('Failed to setup rclone status listener:', err)
      }
    }

    setup()

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [])

  // Auto-mount on startup if enabled
  useEffect(() => {
    const autoMount = async () => {
      if (!rcloneConfig.autoMount) return

      // Check if rclone is available
      const rcloneOk = await checkRclone()
      if (!rcloneOk) {
        return
      }

      // Check current status
      const currentStatus = await checkStatus()
      if (currentStatus?.isMounted) {
        return
      }

      // Attempt to mount
      try {
        await mount()
      } catch {
        // Auto-mount failed silently
      }
    }

    // Small delay to let the app initialize
    const timeout = setTimeout(autoMount, 1000)

    return () => clearTimeout(timeout)
  }, []) // Only run once on mount

  return {
    // State
    status,
    mountStatus,
    rcloneVersion,
    error,
    isChecking,
    isMounted: status === 'mounted',
    isMounting: status === 'mounting',
    isUnmounting: status === 'unmounting',

    // Actions
    mount,
    unmount,
    toggleMount,
    checkStatus,
    checkRclone,
  }
}

export default useRclone
