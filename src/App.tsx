import { Home as HomeIcon, Library, Play, Tv, Settings as SettingsIcon } from 'lucide-react'
import { AuthProvider, ProtectedRoute } from './components'
import { NavigationProvider, useNavigation } from './contexts/NavigationContext'
import HomePage from './pages/Home'
import LibraryPage from './pages/Library'
import PlayerPage from './pages/Player'
import RemotePage from './pages/Remote'
import SettingsPage from './pages/Settings'
import ItemDetailPage from './pages/ItemDetail'

type NavPage = 'home' | 'library' | 'player' | 'remote' | 'settings'

const navItems: { id: NavPage; label: string; icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'player', label: 'Player', icon: Play },
  { id: 'remote', label: 'Remote', icon: Tv },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

function AppContent() {
  const { state, navigate } = useNavigation()

  const renderPage = () => {
    // Item detail page
    if (state.page === 'item' && state.itemId) {
      return (
        <ProtectedRoute>
          <ItemDetailPage itemId={state.itemId} />
        </ProtectedRoute>
      )
    }

    // Settings page doesn't need protection
    if (state.page === 'settings') {
      return <SettingsPage />
    }

    // All other pages are protected
    return (
      <ProtectedRoute>
        {state.page === 'home' && <HomePage />}
        {state.page === 'library' && <LibraryPage />}
        {state.page === 'player' && <PlayerPage />}
        {state.page === 'remote' && <RemotePage />}
      </ProtectedRoute>
    )
  }

  // Hide nav bar on item detail page
  const showNavBar = state.page !== 'item'

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <main className={`flex-1 overflow-y-auto scrollbar-thin ${showNavBar ? 'pb-16' : ''}`}>
        {renderPage()}
      </main>

      {showNavBar && (
        <nav className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border z-50">
          <div className="flex justify-around items-center max-w-lg mx-auto">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`flex flex-col items-center gap-1 px-3 py-3 transition-colors min-w-0 ${
                  state.page === id
                    ? 'text-accent-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon size={20} strokeWidth={state.page === id ? 2.5 : 2} />
                <span className="text-xs truncate">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

function App() {
  return (
    <NavigationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NavigationProvider>
  )
}

export default App
