import { ReactNode, useState, useEffect, useCallback } from 'react'
import {
  Home,
  Tv,
  Film,
  Music,
  Cast,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Server,
  Play,
  Pause,
  SkipForward,
  Menu,
  X,
} from 'lucide-react'
import { useNavigation } from '../contexts/NavigationContext'
import { useLibraryParams, LibraryCategory } from '../hooks/useUrlParams'
import { useUIStore } from '../stores/uiStore'
import { useConfigStore } from '../stores/configStore'
import { playerService } from '../services/player'

type NavPage = 'home' | 'library' | 'player' | 'remote' | 'settings'

interface NavItem {
  id: NavPage
  label: string
  icon: typeof Home
  category?: LibraryCategory
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'library', label: 'Series', icon: Tv, category: 'tvshows' },
  { id: 'library', label: 'Movies', icon: Film, category: 'movies' },
  { id: 'library', label: 'Music', icon: Music, category: 'music' },
  { id: 'remote', label: 'Remote', icon: Cast },
  { id: 'settings', label: 'Settings', icon: Settings },
]

// Responsive breakpoints
const BREAKPOINT_HIDE_SIDEBAR = 600
const BREAKPOINT_COLLAPSE_SIDEBAR = 1400

interface LayoutProps {
  children: ReactNode
  showSearch?: boolean
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Tooltip component for collapsed sidebar
function Tooltip({ children, label, show }: { children: ReactNode; label: string; show: boolean }) {
  if (!show) return <>{children}</>
  return (
    <div className="relative group">
      {children}
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-bg-hover text-text-primary text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
        {label}
      </div>
    </div>
  )
}

export default function Layout({ children, showSearch = true }: LayoutProps) {
  const { state: navState, navigate } = useNavigation()
  const { params: libraryParams, setParams: setLibraryParams } = useLibraryParams()
  const { sidebarCollapsed, setSidebarCollapsed, toggleSidebar, localPlayback, miniPlayerVisible } = useUIStore()
  const { isAuthenticated } = useConfigStore()
  const isAuth = isAuthenticated()

  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Determine sidebar mode based on window width
  const sidebarHidden = windowWidth < BREAKPOINT_HIDE_SIDEBAR
  const shouldAutoCollapse = windowWidth < BREAKPOINT_COLLAPSE_SIDEBAR && windowWidth >= BREAKPOINT_HIDE_SIDEBAR
  const effectiveCollapsed = sidebarHidden ? true : (shouldAutoCollapse || sidebarCollapsed)

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setWindowWidth(width)

      // Auto-collapse when below breakpoint
      if (width < BREAKPOINT_COLLAPSE_SIDEBAR && width >= BREAKPOINT_HIDE_SIDEBAR && !sidebarCollapsed) {
        setSidebarCollapsed(true)
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Initial check

    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarCollapsed, setSidebarCollapsed])

  // Close mobile menu when navigating
  const handleNavWithClose = useCallback((item: NavItem) => {
    if (item.category) {
      navigate(item.id, { category: item.category })
      // Update URL params directly for category
      setLibraryParams({
        category: item.category,
        subFilter: item.category === 'music' ? 'artists' : null,
        libraryId: null,
        page: 1,
      })
    } else {
      navigate(item.id)
    }
    setMobileMenuOpen(false)
  }, [navigate, setLibraryParams])

  const handleNavClick = (item: NavItem) => {
    if (item.category) {
      navigate(item.id, { category: item.category })
      // Update URL params directly for category
      setLibraryParams({
        category: item.category,
        subFilter: item.category === 'music' ? 'artists' : null,
        libraryId: null,
        page: 1,
      })
    } else {
      navigate(item.id)
    }
  }

  const isActive = (item: NavItem) => {
    if (item.category) {
      // Check both navigation state and URL params
      return navState.page === 'library' && libraryParams.category === item.category
    }
    return navState.page === item.id
  }

  const handleMiniPlayerClick = () => {
    navigate('player')
  }

  const handlePlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await playerService.togglePlayback()
    } catch (err) {
      console.error('Failed to toggle playback:', err)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Mobile menu overlay */}
      {sidebarHidden && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile header with hamburger */}
      {sidebarHidden && (
        <header className="fixed top-0 left-0 right-0 h-14 bg-bg-secondary border-b border-border z-30 flex items-center px-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span className="ml-3 font-semibold text-text-primary">HubRemote</span>
        </header>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-bg-secondary border-r border-border z-40 transition-all duration-300 flex flex-col ${
          sidebarHidden
            ? mobileMenuOpen
              ? 'w-60 translate-x-0'
              : 'w-60 -translate-x-full'
            : effectiveCollapsed
              ? 'w-16'
              : 'w-60'
        }`}
      >
        {/* Toggle button - hidden on mobile */}
        {!sidebarHidden && (
          <div className="h-14 flex items-center justify-end px-3 border-b border-border">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {effectiveCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        )}
        {/* Mobile close button */}
        {sidebarHidden && (
          <div className="h-14 flex items-center justify-between px-3 border-b border-border">
            <span className="font-semibold text-text-primary">Menu</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Navigation items */}
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item, index) => {
              const Icon = item.icon
              const active = isActive(item)
              const key = item.category ? `${item.id}-${item.category}` : item.id

              return (
                <li
                  key={key}
                  className="stagger-item"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Tooltip label={item.label} show={effectiveCollapsed && !sidebarHidden}>
                    <button
                      onClick={() => sidebarHidden ? handleNavWithClose(item) : handleNavClick(item)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative ${
                        active
                          ? 'bg-bg-hover text-text-primary'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                      }`}
                    >
                      {/* Active indicator */}
                      <div
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-primary rounded-r transition-all duration-200 ${
                          active ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
                        }`}
                      />
                      <Icon
                        size={24}
                        className={`transition-colors duration-150 flex-shrink-0 ${active ? 'text-accent-primary' : ''}`}
                      />
                      <span
                        className={`font-medium truncate transition-all duration-200 ${
                          effectiveCollapsed && !sidebarHidden ? 'opacity-0 w-0' : 'opacity-100'
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  </Tooltip>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Server status */}
        <div className="px-2 py-1.5 border-t border-border">
          <Tooltip label={isAuth ? 'Connected' : 'Disconnected'} show={effectiveCollapsed && !sidebarHidden}>
            <div
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
                effectiveCollapsed && !sidebarHidden ? 'justify-center' : ''
              }`}
            >
              <div className={`p-1 rounded-full ${isAuth ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                <Server size={18} className={isAuth ? 'text-green-500' : 'text-red-500'} />
              </div>
              {(!effectiveCollapsed || sidebarHidden) && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary truncate leading-tight">
                    {isAuth ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              )}
            </div>
          </Tooltip>
        </div>
      </aside>

      {/* Main area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarHidden ? 'ml-0 pt-14' : effectiveCollapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        {/* Top bar */}
        {showSearch && (
          <header className="h-14 bg-bg-secondary/80 backdrop-blur-sm border-b border-border flex items-center px-6 sticky top-0 z-30">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-colors"
                />
              </div>
            </div>
          </header>
        )}

        {/* Content area */}
        <main
          className={`flex-1 overflow-y-auto scrollbar-thin p-4 ${
            miniPlayerVisible ? 'pb-20' : ''
          }`}
        >
          {children}
        </main>

        {/* Mini player */}
        {miniPlayerVisible && localPlayback && (
          <div
            onClick={handleMiniPlayerClick}
            className="fixed bottom-0 left-0 right-0 h-18 bg-bg-secondary border-t border-border z-50 cursor-pointer transition-all duration-300"
            style={{ marginLeft: sidebarHidden ? '0' : effectiveCollapsed ? '64px' : '240px' }}
          >
            <div className="h-full flex items-center px-4 gap-4">
              {/* Poster */}
              <div className="w-12 h-12 bg-bg-hover rounded overflow-hidden flex-shrink-0">
                {localPlayback.posterUrl ? (
                  <img
                    src={localPlayback.posterUrl}
                    alt={localPlayback.itemName || 'Now playing'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play size={20} className="text-text-secondary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-medium truncate">
                  {localPlayback.itemName || 'Unknown'}
                </p>
                {localPlayback.seriesName && (
                  <p className="text-text-secondary text-sm truncate">
                    {localPlayback.seriesName}
                  </p>
                )}
              </div>

              {/* Progress */}
              <div className="hidden sm:flex items-center gap-2 text-text-secondary text-sm">
                <span>{formatTime(localPlayback.position)}</span>
                <div className="w-32 h-1 bg-bg-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-primary rounded-full"
                    style={{
                      width: `${
                        localPlayback.duration > 0
                          ? (localPlayback.position / localPlayback.duration) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span>{formatTime(localPlayback.duration)}</span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayPause}
                  className="p-2 rounded-full bg-accent-primary hover:bg-accent-hover text-white transition-colors"
                >
                  {localPlayback.isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <SkipForward size={20} />
                </button>
              </div>
            </div>

            {/* Progress bar at top of mini player */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-bg-hover">
              <div
                className="h-full bg-accent-primary"
                style={{
                  width: `${
                    localPlayback.duration > 0
                      ? (localPlayback.position / localPlayback.duration) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
