import { useState, memo } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore, Toast as ToastType, ToastType as ToastVariant } from '../stores/toastStore'

const iconMap: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
}

const bgColorMap: Record<ToastVariant, string> = {
  success: 'bg-green-500/10 border-green-500/30',
  error: 'bg-red-500/10 border-red-500/30',
  warning: 'bg-yellow-500/10 border-yellow-500/30',
  info: 'bg-blue-500/10 border-blue-500/30',
}

const ToastItem = memo(function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useToastStore()
  const [isLeaving, setIsLeaving] = useState(false)

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => removeToast(toast.id), 200)
  }

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
        shadow-lg max-w-sm w-full
        transition-all duration-200
        ${bgColorMap[toast.type]}
        ${isLeaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{iconMap[toast.type]}</div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-xs text-text-secondary">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick()
              handleClose()
            }}
            className="mt-2 text-xs font-medium text-accent-primary hover:text-accent-hover transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-text-secondary" />
      </button>
    </div>
  )
})

export function ToastContainer() {
  const { toasts } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

export default ToastContainer
