import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

let toastId = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastId}`
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    }

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))

    // Auto-remove after duration (unless duration is 0)
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, newToast.duration)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  clearToasts: () => {
    set({ toasts: [] })
  },
}))

// Helper functions for common toast types
export const toast = {
  success: (title: string, message?: string, options?: Partial<Toast>) => {
    return useToastStore.getState().addToast({ type: 'success', title, message, ...options })
  },
  error: (title: string, message?: string, options?: Partial<Toast>) => {
    return useToastStore.getState().addToast({ type: 'error', title, message, duration: 8000, ...options })
  },
  warning: (title: string, message?: string, options?: Partial<Toast>) => {
    return useToastStore.getState().addToast({ type: 'warning', title, message, ...options })
  },
  info: (title: string, message?: string, options?: Partial<Toast>) => {
    return useToastStore.getState().addToast({ type: 'info', title, message, ...options })
  },
}

export default useToastStore
