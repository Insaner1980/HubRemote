import { AuthProvider, ProtectedRoute, Layout, PageTransition, ToastContainer, ErrorBoundary } from './components'
import { NavigationProvider, useNavigation } from './contexts/NavigationContext'
import { useWindowSize } from './hooks/useWindowSize'
import HomePage from './pages/Home'
import LibraryPage from './pages/Library'
import PlayerPage from './pages/Player'
import RemotePage from './pages/Remote'
import SettingsPage from './pages/Settings'
import ItemDetailPage from './pages/ItemDetail'

function AppContent() {
  // Persist window size across sessions
  useWindowSize()
  const { state } = useNavigation()

  // Player page is fullscreen, no layout, no transition
  if (state.page === 'player') {
    return (
      <ProtectedRoute>
        <PlayerPage />
      </ProtectedRoute>
    )
  }

  // Item detail page - fullscreen with own back button
  if (state.page === 'item' && state.itemId) {
    return (
      <ProtectedRoute>
        <PageTransition>
          <ItemDetailPage itemId={state.itemId} />
        </PageTransition>
      </ProtectedRoute>
    )
  }

  // Settings page doesn't need auth protection
  if (state.page === 'settings') {
    return (
      <Layout>
        <PageTransition>
          <SettingsPage />
        </PageTransition>
      </Layout>
    )
  }

  // All other pages use Layout and are protected
  return (
    <ProtectedRoute>
      <Layout>
        <PageTransition>
          {state.page === 'home' && <HomePage />}
          {state.page === 'library' && <LibraryPage />}
          {state.page === 'remote' && <RemotePage />}
        </PageTransition>
      </Layout>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <NavigationProvider>
        <AuthProvider>
          <AppContent />
          <ToastContainer />
        </AuthProvider>
      </NavigationProvider>
    </ErrorBoundary>
  )
}

export default App
