import { useEffect, useState, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isValidating, setIsValidating] = useState(true)
  const validateSession = useAuthStore((state) => state.validateSession)

  useEffect(() => {
    const validate = async () => {
      try {
        await validateSession()
      } catch {
        // Validation failed, user will be redirected to login
      } finally {
        setIsValidating(false)
      }
    }

    validate()
  }, [validateSession])

  if (isValidating) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
        <p className="text-text-secondary text-sm">Connecting...</p>
      </div>
    )
  }

  return <>{children}</>
}
