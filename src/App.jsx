import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Home, List, QrCode, LogOut } from 'lucide-react'
import Dashboard from './components/Dashboard'
import TripListing from './components/TripListing'
import QRCodeValidator from './components/QRCodeValidator'
import AuthPage from './components/AuthPage'
import { AuthProvider, useAuth } from './context/AuthContext'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Chargement...</div>
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return children
}

function AppShell({ children }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/trips', label: 'Trajets', icon: List },
    { to: '/validator', label: 'Validation', icon: QrCode },
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <header className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-brand-700">LBS Covoiturage</h1>
            <p className="text-xs text-slate-500">{profile?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center gap-2"
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-50">
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`py-3 flex flex-col items-center text-xs ${active ? 'text-brand-700' : 'text-slate-500'}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
          <button onClick={signOut} className="py-3 flex flex-col items-center text-xs text-slate-500">
            <LogOut size={18} />
            <span>Sortir</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/trips" element={<TripListing />} />
                <Route path="/validator" element={<QRCodeValidator />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
