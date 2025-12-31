import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Server,
  User,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  LogOut,
  Wifi,
  Keyboard,
  RotateCcw,
  MonitorDown,
  Bell,
  Bug,
  Play,
  Copy,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  HardDrive,
  Cloud,
} from 'lucide-react'
import { useAuthStore, useConfigStore } from '../stores'
import { shortcutsService } from '../services/shortcuts'
import { trayService } from '../services/tray'
import { rcloneService } from '../services/rclone'
import { jellyfinApi } from '../services/jellyfin'
import type { RcloneSettings as RcloneSettingsType } from '../stores/configStore'

type ConnectionStep = 'server' | 'credentials' | 'connected'

export default function Settings() {
  const { user, serverInfo, isAuthenticated, isLoading, error, testConnection, login, logout, clearError } =
    useAuthStore()
  const { serverUrl } = useConfigStore()

  const [step, setStep] = useState<ConnectionStep>(isAuthenticated ? 'connected' : 'server')
  const [serverInput, setServerInput] = useState(serverUrl || '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [connectionSuccess, setConnectionSuccess] = useState(false)

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setConnectionSuccess(false)

    try {
      await testConnection(serverInput)
      setConnectionSuccess(true)
      // Auto-advance to credentials after successful connection
      setTimeout(() => setStep('credentials'), 500)
    } catch {
      // Error is handled in the store
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      await login(username, password)
      setStep('connected')
      setPassword('') // Clear password after login
    } catch {
      // Error is handled in the store
    }
  }

  const handleLogout = async () => {
    await logout()
    setStep('server')
    setConnectionSuccess(false)
    setUsername('')
    setPassword('')
  }

  const handleChangeServer = () => {
    setStep('server')
    setConnectionSuccess(false)
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <SettingsIcon className="w-6 h-6 text-accent-primary" />
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
      </div>

      <div className="max-w-md mx-auto">
        {/* Connection Status Card */}
        {isAuthenticated && step === 'connected' && (
          <div className="card p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-text-primary font-medium">Connected</p>
                <p className="text-sm text-text-secondary">{serverInfo?.ServerName || serverUrl}</p>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-3 p-3 bg-bg-hover rounded-lg mb-4">
                <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-accent-primary" />
                </div>
                <div>
                  <p className="text-text-primary text-sm font-medium">{user.Name}</p>
                  <p className="text-xs text-text-secondary">
                    {user.Policy.IsAdministrator ? 'Administrator' : 'User'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleChangeServer}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <Server className="w-4 h-4" />
                Change Server
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 btn-ghost flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        {!isAuthenticated && (
          <div className="flex items-center gap-2 mb-6">
            <StepIndicator
              number={1}
              label="Server"
              active={step === 'server'}
              completed={step === 'credentials' || step === 'connected'}
            />
            <div className="flex-1 h-px bg-border" />
            <StepIndicator
              number={2}
              label="Login"
              active={step === 'credentials'}
              completed={step === 'connected'}
            />
          </div>
        )}

        {/* Server Connection Form */}
        {step === 'server' && !isAuthenticated && (
          <form onSubmit={handleTestConnection} className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-accent-primary" />
              <h2 className="text-lg font-medium text-text-primary">Connect to Server</h2>
            </div>

            <div className="mb-4">
              <label htmlFor="serverUrl" className="block text-sm text-text-secondary mb-2">
                Jellyfin Server URL
              </label>
              <input
                id="serverUrl"
                type="url"
                value={serverInput}
                onChange={(e) => setServerInput(e.target.value)}
                placeholder="http://localhost:8096"
                className="input"
                required
                disabled={isLoading}
              />
              <p className="mt-2 text-xs text-text-secondary">
                Enter your Jellyfin server address including the port
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {connectionSuccess && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-green-400">Connected to {serverInfo?.ServerName}</p>
                  <p className="text-xs text-green-400/70">Version {serverInfo?.Version}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !serverInput.trim()}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  Test Connection
                </>
              )}
            </button>
          </form>
        )}

        {/* Login Form */}
        {step === 'credentials' && !isAuthenticated && (
          <form onSubmit={handleLogin} className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-accent-primary" />
              <h2 className="text-lg font-medium text-text-primary">Sign In</h2>
            </div>

            {serverInfo && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-bg-hover rounded-lg">
                <Server className="w-4 h-4 text-text-secondary" />
                <span className="text-sm text-text-secondary">{serverInfo.ServerName}</span>
                <button
                  type="button"
                  onClick={handleChangeServer}
                  className="ml-auto text-xs text-accent-primary hover:text-accent-hover"
                >
                  Change
                </button>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="username" className="block text-sm text-text-secondary mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="input pl-10"
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="block text-sm text-text-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="input pl-10"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                Leave empty if your account has no password
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        {/* Server Info */}
        {serverInfo && isAuthenticated && (
          <div className="card p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">Server Information</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Name" value={serverInfo.ServerName} />
              <InfoRow label="Version" value={serverInfo.Version} />
              <InfoRow label="OS" value={serverInfo.OperatingSystem} />
              <InfoRow label="Server ID" value={serverInfo.Id.slice(0, 8) + '...'} />
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts */}
        <ShortcutSettings />

        {/* System Tray */}
        <TraySettings />

        {/* Rclone Mount */}
        <RcloneSettingsPanel />

        {/* Debug Panel */}
        <DebugPanel />
      </div>
    </div>
  )
}

function ShortcutSettings() {
  const { shortcuts, setShortcutsEnabled, updateShortcut, resetShortcuts } = useConfigStore()
  const [isApplying, setIsApplying] = useState(false)

  // Apply shortcuts when enabled/disabled
  useEffect(() => {
    const applyShortcuts = async () => {
      try {
        if (shortcuts.enabled) {
          await shortcutsService.registerCustom({
            playPause: shortcuts.playPause || undefined,
            nextTrack: shortcuts.nextTrack || undefined,
            previousTrack: shortcuts.previousTrack || undefined,
            stop: shortcuts.stop || undefined,
            volumeUp: shortcuts.volumeUp || undefined,
            volumeDown: shortcuts.volumeDown || undefined,
            mute: shortcuts.mute || undefined,
          })
        } else {
          await shortcutsService.disable()
        }
      } catch (error) {
        console.error('Failed to apply shortcuts:', error)
      }
    }

    applyShortcuts()
  }, [shortcuts])

  const handleToggle = async () => {
    setIsApplying(true)
    setShortcutsEnabled(!shortcuts.enabled)
    // Small delay for UI feedback
    setTimeout(() => setIsApplying(false), 300)
  }

  const handleReset = () => {
    resetShortcuts()
  }

  const shortcutFields: { key: keyof typeof shortcuts; label: string }[] = [
    { key: 'playPause', label: 'Play/Pause' },
    { key: 'nextTrack', label: 'Next Track' },
    { key: 'previousTrack', label: 'Previous Track' },
    { key: 'stop', label: 'Stop' },
    { key: 'volumeUp', label: 'Volume Up' },
    { key: 'volumeDown', label: 'Volume Down' },
    { key: 'mute', label: 'Mute' },
  ]

  return (
    <div className="card p-4 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-accent-primary" />
          <h3 className="text-sm font-medium text-text-primary">Global Shortcuts</h3>
        </div>
        <button
          onClick={handleToggle}
          disabled={isApplying}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            shortcuts.enabled ? 'bg-accent-primary' : 'bg-bg-hover'
          }`}
        >
          <div
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
              shortcuts.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <p className="text-xs text-text-secondary mb-4">
        Control playback with keyboard shortcuts even when the app is in the background.
      </p>

      {shortcuts.enabled && (
        <>
          <div className="space-y-3">
            {shortcutFields.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">{label}</label>
                <input
                  type="text"
                  value={key !== 'enabled' ? (shortcuts[key] as string) : ''}
                  onChange={(e) => {
                    if (key !== 'enabled') {
                      updateShortcut(key as keyof Omit<typeof shortcuts, 'enabled'>, e.target.value)
                    }
                  }}
                  placeholder="Not set"
                  className="w-40 px-2 py-1 text-sm bg-bg-hover border border-border rounded text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleReset}
            className="mt-4 w-full btn-ghost flex items-center justify-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>

          <p className="mt-3 text-xs text-text-secondary/70">
            Media keys: MediaPlayPause, MediaNextTrack, MediaPreviousTrack, MediaStop
          </p>
        </>
      )}
    </div>
  )
}

function TraySettings() {
  const { tray, setMinimizeToTray, setShowNotifications } = useConfigStore()

  // Sync minimize to tray setting with backend
  useEffect(() => {
    trayService.setMinimizeToTray(tray.minimizeToTray)
  }, [tray.minimizeToTray])

  return (
    <div className="card p-4 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <MonitorDown className="w-5 h-5 text-accent-primary" />
        <h3 className="text-sm font-medium text-text-primary">System Tray</h3>
      </div>

      <p className="text-xs text-text-secondary mb-4">
        Control how HubRemote behaves with the system tray.
      </p>

      <div className="space-y-4">
        {/* Minimize to Tray */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary">Minimize to Tray</p>
            <p className="text-xs text-text-secondary">
              Hide to system tray when closing the window
            </p>
          </div>
          <button
            onClick={() => setMinimizeToTray(!tray.minimizeToTray)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              tray.minimizeToTray ? 'bg-accent-primary' : 'bg-bg-hover'
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                tray.minimizeToTray ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Show Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-text-secondary" />
            <div>
              <p className="text-sm text-text-primary">Show Notifications</p>
              <p className="text-xs text-text-secondary">
                Display playback notifications
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowNotifications(!tray.showNotifications)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              tray.showNotifications ? 'bg-accent-primary' : 'bg-bg-hover'
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                tray.showNotifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-text-secondary/70">
        Right-click the tray icon for playback controls. Left-click to show/hide the window.
      </p>
    </div>
  )
}

function RcloneSettingsPanel() {
  const { rclone, updateRclone, resetRclone } = useConfigStore()
  const [rcloneVersion, setRcloneVersion] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isMounting, setIsMounting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check rclone on mount
  useEffect(() => {
    checkRclone()
    checkMountStatus()
  }, [rclone.rclonePath])

  const checkRclone = async () => {
    setIsChecking(true)
    try {
      const version = await rcloneService.checkRclone(rclone.rclonePath)
      setRcloneVersion(version)
      setError(null)
    } catch (err) {
      setRcloneVersion(null)
      setError(err instanceof Error ? err.message : 'Rclone not found')
    } finally {
      setIsChecking(false)
    }
  }

  const checkMountStatus = async () => {
    try {
      const config = {
        rclonePath: rclone.rclonePath,
        remoteName: rclone.remoteName,
        remoteFolder: rclone.remoteFolder,
        mountPoint: rclone.mountPoint,
        vfsCacheMode: rclone.vfsCacheMode,
        autoMount: rclone.autoMount,
      }
      const status = await rcloneService.checkStatus(config)
      setIsMounted(status.isMounted)
    } catch {
      // Silently fail
    }
  }

  const handleMount = async () => {
    setIsMounting(true)
    setError(null)
    try {
      const config = {
        rclonePath: rclone.rclonePath,
        remoteName: rclone.remoteName,
        remoteFolder: rclone.remoteFolder,
        mountPoint: rclone.mountPoint,
        vfsCacheMode: rclone.vfsCacheMode,
        autoMount: rclone.autoMount,
      }
      const result = await rcloneService.mount(config)
      setIsMounted(result.isMounted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mount failed')
    } finally {
      setIsMounting(false)
    }
  }

  const handleUnmount = async () => {
    setIsMounting(true)
    setError(null)
    try {
      const config = {
        rclonePath: rclone.rclonePath,
        remoteName: rclone.remoteName,
        remoteFolder: rclone.remoteFolder,
        mountPoint: rclone.mountPoint,
        vfsCacheMode: rclone.vfsCacheMode,
        autoMount: rclone.autoMount,
      }
      await rcloneService.unmount(config)
      setIsMounted(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unmount failed')
    } finally {
      setIsMounting(false)
    }
  }

  const handleChange = (key: keyof RcloneSettingsType, value: string | boolean) => {
    updateRclone({ [key]: value })
  }

  return (
    <div className="card p-4 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-accent-primary" />
          <h3 className="text-sm font-medium text-text-primary">Cloud Storage (rclone)</h3>
        </div>
        <div className="flex items-center gap-2">
          {isChecking ? (
            <Loader2 className="w-4 h-4 text-text-secondary animate-spin" />
          ) : rcloneVersion ? (
            <span className="text-xs text-green-400">{rcloneVersion}</span>
          ) : (
            <span className="text-xs text-red-400">Not found</span>
          )}
        </div>
      </div>

      <p className="text-xs text-text-secondary mb-4">
        Mount cloud storage via rclone for streaming media from Google Drive and other providers.
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Auto Mount Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary">Auto Mount on Startup</p>
            <p className="text-xs text-text-secondary">
              Automatically mount when HubRemote starts
            </p>
          </div>
          <button
            onClick={() => handleChange('autoMount', !rclone.autoMount)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              rclone.autoMount ? 'bg-accent-primary' : 'bg-bg-hover'
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                rclone.autoMount ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Mount Status & Control */}
        <div className="p-3 bg-bg-hover rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isMounted ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span className="text-sm text-text-primary">
                {isMounted ? 'Mounted' : 'Not Mounted'}
              </span>
              <span className="text-xs text-text-secondary">({rclone.mountPoint})</span>
            </div>
            <button
              onClick={isMounted ? handleUnmount : handleMount}
              disabled={isMounting || !rcloneVersion}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                isMounting
                  ? 'bg-bg-primary text-text-secondary cursor-wait'
                  : isMounted
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
            >
              {isMounting ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isMounted ? 'Unmounting...' : 'Mounting...'}
                </span>
              ) : isMounted ? (
                'Unmount'
              ) : (
                'Mount Now'
              )}
            </button>
          </div>
          <p className="text-xs text-text-secondary">
            <Cloud className="w-3 h-3 inline mr-1" />
            {rclone.remoteName}:{rclone.remoteFolder}
          </p>
        </div>

        {/* Configuration Fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Rclone Path</label>
            <input
              type="text"
              value={rclone.rclonePath}
              onChange={(e) => handleChange('rclonePath', e.target.value)}
              placeholder="rclone"
              className="w-full px-3 py-2 text-sm bg-bg-hover border border-border rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Remote Name</label>
              <input
                type="text"
                value={rclone.remoteName}
                onChange={(e) => handleChange('remoteName', e.target.value)}
                placeholder="gdrive"
                className="w-full px-3 py-2 text-sm bg-bg-hover border border-border rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Mount Point</label>
              <input
                type="text"
                value={rclone.mountPoint}
                onChange={(e) => handleChange('mountPoint', e.target.value)}
                placeholder="G:"
                className="w-full px-3 py-2 text-sm bg-bg-hover border border-border rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Remote Folder</label>
            <input
              type="text"
              value={rclone.remoteFolder}
              onChange={(e) => handleChange('remoteFolder', e.target.value)}
              placeholder="Media Hub"
              className="w-full px-3 py-2 text-sm bg-bg-hover border border-border rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">VFS Cache Mode</label>
            <select
              value={rclone.vfsCacheMode}
              onChange={(e) => handleChange('vfsCacheMode', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-bg-hover border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
              <option value="off">Off (no caching)</option>
              <option value="minimal">Minimal</option>
              <option value="writes">Writes only</option>
              <option value="full">Full (recommended)</option>
            </select>
          </div>
        </div>

        <button
          onClick={resetRclone}
          className="w-full btn-ghost flex items-center justify-center gap-2 text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>

      <p className="mt-4 text-xs text-text-secondary/70">
        Requires rclone to be installed and configured. Run <code className="bg-bg-primary px-1 rounded">rclone config</code> to set up remotes.
      </p>
    </div>
  )
}

// Debug API test result
interface ApiTestResult {
  endpoint: string
  success: boolean
  responseTime: number
  data?: unknown
  error?: string
}

function DebugPanel() {
  const { serverUrl, userId, accessToken } = useConfigStore()
  const { isAuthenticated } = useAuthStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [lastPing, setLastPing] = useState<number | null>(null)
  const [testResults, setTestResults] = useState<ApiTestResult[]>([])
  const [selectedResult, setSelectedResult] = useState<ApiTestResult | null>(null)
  const [isTesting, setIsTesting] = useState<string | null>(null)

  // Test connection on mount and when server URL changes
  useEffect(() => {
    if (serverUrl) {
      testConnection()
    }
  }, [serverUrl])

  const testConnection = async () => {
    if (!serverUrl) {
      setIsConnected(false)
      return
    }

    const start = performance.now()
    try {
      await jellyfinApi.getPublicInfo(serverUrl)
      const elapsed = Math.round(performance.now() - start)
      setIsConnected(true)
      setLastPing(elapsed)
    } catch {
      setIsConnected(false)
      setLastPing(null)
    }
  }

  const runApiTest = async (
    name: string,
    endpoint: string,
    testFn: () => Promise<unknown>
  ) => {
    setIsTesting(name)
    const start = performance.now()

    try {
      const data = await testFn()
      const elapsed = Math.round(performance.now() - start)

      const result: ApiTestResult = {
        endpoint,
        success: true,
        responseTime: elapsed,
        data,
      }

      setTestResults((prev) => {
        const filtered = prev.filter((r) => r.endpoint !== endpoint)
        return [...filtered, result]
      })
      setSelectedResult(result)
    } catch (err) {
      const elapsed = Math.round(performance.now() - start)
      const error = err instanceof Error ? err.message : String(err)

      const result: ApiTestResult = {
        endpoint,
        success: false,
        responseTime: elapsed,
        error,
      }

      setTestResults((prev) => {
        const filtered = prev.filter((r) => r.endpoint !== endpoint)
        return [...filtered, result]
      })
      setSelectedResult(result)
    } finally {
      setIsTesting(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const apiTests = [
    {
      name: 'Get Libraries',
      endpoint: '/Users/{userId}/Views',
      requiresAuth: true,
      test: () => jellyfinApi.getLibraries(userId!),
    },
    {
      name: 'Get Sessions',
      endpoint: '/Sessions',
      requiresAuth: true,
      test: () => jellyfinApi.getSessions(),
    },
    {
      name: 'Get Server Info',
      endpoint: '/System/Info/Public',
      requiresAuth: false,
      test: () => jellyfinApi.getPublicInfo(serverUrl),
    },
    {
      name: 'Get Resume Items',
      endpoint: '/Users/{userId}/Items/Resume',
      requiresAuth: true,
      test: () => jellyfinApi.getResumeItems(userId!, 5),
    },
    {
      name: 'Get Next Up',
      endpoint: '/Shows/NextUp',
      requiresAuth: true,
      test: () => jellyfinApi.getNextUp(userId!, 5),
    },
  ]

  return (
    <div className="card p-4 mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-accent-primary" />
          <h3 className="text-sm font-medium text-text-primary">Debug Panel</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Connection Status */}
          <div className="p-3 bg-bg-hover rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Server URL</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-bg-primary px-2 py-1 rounded text-text-primary max-w-48 truncate">
                  {serverUrl || 'Not configured'}
                </code>
                {serverUrl && (
                  <button
                    onClick={() => copyToClipboard(serverUrl)}
                    className="p-1 hover:bg-bg-primary rounded"
                    title="Copy URL"
                  >
                    <Copy className="w-3 h-3 text-text-secondary" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Connection</span>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected === null
                      ? 'bg-yellow-500'
                      : isConnected
                        ? 'bg-green-500'
                        : 'bg-red-500'
                  }`}
                />
                <span className="text-xs text-text-primary">
                  {isConnected === null
                    ? 'Unknown'
                    : isConnected
                      ? 'Connected'
                      : 'Disconnected'}
                </span>
                <button
                  onClick={testConnection}
                  className="p-1 hover:bg-bg-primary rounded"
                  title="Test connection"
                >
                  <Zap className="w-3 h-3 text-text-secondary" />
                </button>
              </div>
            </div>

            {lastPing !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Ping</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-text-secondary" />
                  <span className="text-xs text-text-primary">{lastPing}ms</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Auth Status</span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  isAuthenticated
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </span>
            </div>

            {accessToken && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Token</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-bg-primary px-2 py-1 rounded text-text-primary">
                    {accessToken.slice(0, 8)}...{accessToken.slice(-4)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(accessToken)}
                    className="p-1 hover:bg-bg-primary rounded"
                    title="Copy token"
                  >
                    <Copy className="w-3 h-3 text-text-secondary" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* API Tests */}
          <div>
            <p className="text-xs text-text-secondary mb-2">Test API Endpoints</p>
            <div className="flex flex-wrap gap-2">
              {apiTests.map((test) => {
                const result = testResults.find((r) => r.endpoint === test.endpoint)
                const isDisabled = test.requiresAuth && !isAuthenticated
                const isRunning = isTesting === test.name

                return (
                  <button
                    key={test.name}
                    onClick={() => runApiTest(test.name, test.endpoint, test.test)}
                    disabled={isDisabled || isRunning}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      isDisabled
                        ? 'bg-bg-hover text-text-secondary/50 cursor-not-allowed'
                        : result?.success === false
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : result?.success === true
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-bg-hover text-text-primary hover:bg-border'
                    }`}
                    title={isDisabled ? 'Requires authentication' : test.endpoint}
                  >
                    {isRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    {test.name}
                    {result && (
                      <span className="text-[10px] opacity-70">({result.responseTime}ms)</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Response Viewer */}
          {selectedResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-secondary">
                  Response: <code className="text-accent-primary">{selectedResult.endpoint}</code>
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      selectedResult.success
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {selectedResult.success ? 'Success' : 'Failed'}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {selectedResult.responseTime}ms
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(selectedResult.data || selectedResult.error, null, 2)
                      )
                    }
                    className="p-1 hover:bg-bg-primary rounded"
                    title="Copy response"
                  >
                    <Copy className="w-3 h-3 text-text-secondary" />
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="p-3 bg-bg-primary rounded-lg text-xs text-text-secondary overflow-auto max-h-64 font-mono">
                  {selectedResult.success
                    ? JSON.stringify(selectedResult.data, null, 2)
                    : selectedResult.error}
                </pre>
              </div>
            </div>
          )}

          <p className="text-xs text-text-secondary/50">
            Use this panel to troubleshoot Jellyfin connection issues.
          </p>
        </div>
      )}
    </div>
  )
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
          completed
            ? 'bg-green-500 text-white'
            : active
              ? 'bg-accent-primary text-white'
              : 'bg-bg-hover text-text-secondary'
        }`}
      >
        {completed ? <CheckCircle className="w-3.5 h-3.5" /> : number}
      </div>
      <span
        className={`text-sm ${active || completed ? 'text-text-primary' : 'text-text-secondary'}`}
      >
        {label}
      </span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  )
}
