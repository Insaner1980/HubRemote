import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type Page = 'home' | 'library' | 'player' | 'remote' | 'settings' | 'item'

interface NavigationState {
  page: Page
  itemId: string | null
  params: Record<string, string>
}

interface NavigationContextType {
  state: NavigationState
  navigate: (page: Page, params?: Record<string, string>) => void
  navigateToItem: (itemId: string) => void
  navigateToPlayer: (itemId: string, startPositionTicks?: number) => void
  goBack: () => void
  canGoBack: boolean
}

const NavigationContext = createContext<NavigationContextType | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<NavigationState[]>([
    { page: 'home', itemId: null, params: {} },
  ])
  const [currentIndex, setCurrentIndex] = useState(0)

  const state = history[currentIndex]

  const navigate = useCallback((page: Page, params: Record<string, string> = {}) => {
    const newState: NavigationState = {
      page,
      itemId: params.itemId || null,
      params,
    }

    setHistory((prev) => {
      // Remove any forward history
      const newHistory = prev.slice(0, currentIndex + 1)
      return [...newHistory, newState]
    })
    setCurrentIndex((prev) => prev + 1)
  }, [currentIndex])

  const navigateToItem = useCallback((itemId: string) => {
    navigate('item', { itemId })
  }, [navigate])

  const navigateToPlayer = useCallback((itemId: string, startPositionTicks?: number) => {
    const params: Record<string, string> = { itemId }
    if (startPositionTicks !== undefined) {
      params.startPositionTicks = String(startPositionTicks)
    }
    navigate('player', params)
  }, [navigate])

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }, [currentIndex])

  const canGoBack = currentIndex > 0

  return (
    <NavigationContext.Provider
      value={{
        state,
        navigate,
        navigateToItem,
        navigateToPlayer,
        goBack,
        canGoBack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}
