import { AlertTriangle, RefreshCw, WifiOff, Lock, ServerOff, FileQuestion } from 'lucide-react'
import type { ApiError } from '../types'

interface ErrorStateProps {
  error: Error | ApiError | string | null
  onRetry?: () => void
  title?: string
  fullPage?: boolean
}

// Map error codes to icons and default messages
const errorConfig: Record<string, { icon: React.ReactNode; title: string; message: string }> = {
  NETWORK_ERROR: {
    icon: <WifiOff className="w-8 h-8 text-red-400" />,
    title: 'Connection Failed',
    message: 'Cannot connect to the server. Please check your network connection.',
  },
  TIMEOUT: {
    icon: <WifiOff className="w-8 h-8 text-yellow-400" />,
    title: 'Request Timeout',
    message: 'The server took too long to respond. Please try again.',
  },
  UNAUTHORIZED: {
    icon: <Lock className="w-8 h-8 text-red-400" />,
    title: 'Authentication Required',
    message: 'Please log in to access this content.',
  },
  FORBIDDEN: {
    icon: <Lock className="w-8 h-8 text-red-400" />,
    title: 'Access Denied',
    message: 'You do not have permission to view this content.',
  },
  NOT_FOUND: {
    icon: <FileQuestion className="w-8 h-8 text-yellow-400" />,
    title: 'Not Found',
    message: 'The requested item could not be found.',
  },
  SERVER_ERROR: {
    icon: <ServerOff className="w-8 h-8 text-red-400" />,
    title: 'Server Error',
    message: 'Something went wrong on the server. Please try again later.',
  },
  SERVER_UNAVAILABLE: {
    icon: <ServerOff className="w-8 h-8 text-yellow-400" />,
    title: 'Server Unavailable',
    message: 'The server is temporarily unavailable. Please try again later.',
  },
  default: {
    icon: <AlertTriangle className="w-8 h-8 text-red-400" />,
    title: 'Error',
    message: 'An unexpected error occurred.',
  },
}

export function ErrorState({ error, onRetry, title, fullPage = false }: ErrorStateProps) {
  // Parse error
  let errorCode = 'default'
  let errorMessage = ''

  if (typeof error === 'string') {
    errorMessage = error
  } else if (error && 'code' in error) {
    errorCode = (error as ApiError).code || 'default'
    errorMessage = (error as ApiError).message
  } else if (error instanceof Error) {
    errorMessage = error.message
  }

  const config = errorConfig[errorCode] || errorConfig.default
  const displayTitle = title || config.title
  const displayMessage = errorMessage || config.message

  const content = (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 mb-4 rounded-full bg-bg-hover flex items-center justify-center">
        {config.icon}
      </div>

      <h3 className="text-lg font-medium text-text-primary mb-2">{displayTitle}</h3>

      <p className="text-sm text-text-secondary mb-6 max-w-sm">{displayMessage}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        {content}
      </div>
    )
  }

  return content
}

// Compact inline error for smaller areas
export function InlineError({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
      <p className="text-sm text-red-400 flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
          title="Retry"
        >
          <RefreshCw className="w-4 h-4 text-red-400" />
        </button>
      )}
    </div>
  )
}

export default ErrorState
