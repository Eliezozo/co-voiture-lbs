import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import TripListing from './components/TripListing'
import { Home, List } from 'lucide-react'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 font-sans text-slate-800">
        <main className="pt-4 pb-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trips" element={<TripListing />} />
          </Routes>
        </main>

        {/* Bottom Navigation for Mobile First approach */}
        <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 md:hidden">
          <div className="flex justify-around items-center p-3">
            <Link to="/" className="flex flex-col items-center gap-1 text-slate-500 hover:text-brand-600 focus:text-brand-600">
              <Home size={24} />
              <span className="text-[10px] font-medium">Accueil</span>
            </Link>
            <Link to="/trips" className="flex flex-col items-center gap-1 text-slate-500 hover:text-brand-600 focus:text-brand-600">
              <List size={24} />
              <span className="text-[10px] font-medium">Trajets</span>
            </Link>
          </div>
        </nav>

        {/* Side/Top Navigation for Desktop */}
        <nav className="hidden md:flex fixed top-0 w-full bg-white border-b border-slate-200 shadow-sm z-50">
          <div className="max-w-4xl mx-auto w-full px-6 py-4 flex justify-between items-center">
            <div className="font-bold text-xl text-brand-700 tracking-tight">Covoiturage LBS</div>
            <div className="flex gap-6">
              <Link to="/" className="font-medium text-slate-600 hover:text-brand-600 transition flex items-center gap-2">
                <Home size={18} /> Accueil
              </Link>
              <Link to="/trips" className="font-medium text-slate-600 hover:text-brand-600 transition flex items-center gap-2">
                <List size={18} /> Trajets
              </Link>
            </div>
          </div>
        </nav>

        {/* Spacer for desktop nav */}
        <div className="hidden md:block h-16"></div>
      </div>
    </BrowserRouter>
  )
}

export default App
