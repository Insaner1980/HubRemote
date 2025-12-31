import { ReactNode, useEffect, useState } from 'react'
import { useNavigation } from '../contexts/NavigationContext'

interface PageTransitionProps {
  children: ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const { state } = useNavigation()
  const [isVisible, setIsVisible] = useState(false)
  const [currentPage, setCurrentPage] = useState(state.page)

  useEffect(() => {
    // Reset animation on page change
    if (state.page !== currentPage) {
      setIsVisible(false)
      // Small delay to allow fade out
      const timer = setTimeout(() => {
        setCurrentPage(state.page)
        setIsVisible(true)
      }, 50)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(true)
    }
  }, [state.page, currentPage])

  return (
    <div
      className={`transition-opacity duration-150 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {children}
    </div>
  )
}
