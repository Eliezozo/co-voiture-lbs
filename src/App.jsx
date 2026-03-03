import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Home, LogOut, PlusSquare, UserRound } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './components/LoginPage'
import DashboardPage from './components/DashboardPage'
import PublishPage from './components/PublishPage'
import ProfilePage from './components/ProfilePage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="p-8 text-center">Chargement...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function Shell() {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  const navItems = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/publier', label: 'Publier', icon: PlusSquare },
    { to: '/profil', label: 'Profil', icon: UserRound },
  ]

  return (
    <div className="min-h-screen bg-slate-100 pb-20 md:pb-0">
      <header className="hidden md:block bg-blue-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="font-bold text-lg">LBS Covoiturage</h1>
            <p className="text-xs text-blue-100">{profile?.email}</p>
          </div>
          <button onClick={signOut} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-blue-950 text-sm">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto"><Outlet /></main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden">
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.to
            return (
              <Link key={item.to} to={item.to} className={`py-3 text-xs flex flex-col items-center ${active ? 'text-blue-900' : 'text-slate-500'}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
          <button onClick={signOut} className="py-3 text-xs flex flex-col items-center text-slate-500">
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
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={(
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        )}
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/publier" element={<PublishPage />} />
        <Route path="/profil" element={<ProfilePage />} />
      </Route>
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
