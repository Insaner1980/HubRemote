import { useState } from 'react'
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
} from 'lucide-react'
import { useAuthStore, useConfigStore } from '../stores'

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
      </div>
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
