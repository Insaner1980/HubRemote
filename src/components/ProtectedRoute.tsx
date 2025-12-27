import { ReactNode } from 'react'
import { useAuthStore } from '../stores'
import Settings from '../pages/Settings'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Settings />
  }

  return <>{children}</>
}
