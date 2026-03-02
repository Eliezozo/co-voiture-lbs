import { Link } from 'react-router-dom'
import { Wallet, Car, QrCode, UserRound, Percent } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { profile } = useAuth()

  if (!profile) {
    return <div className="p-6 text-slate-600">Profil introuvable.</div>
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <section className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Bienvenue</p>
          <h2 className="text-xl font-bold text-slate-900">{profile.full_name || profile.email}</h2>
          <p className="text-xs text-slate-500 mt-1">Rôle: {profile.role === 'driver' ? 'Conducteur' : profile.role === 'admin' ? 'Administrateur' : 'Étudiant / Passager'}</p>
        </div>
        <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
          <UserRound size={20} />
        </div>
      </section>

      <section className="bg-gradient-to-br from-brand-600 to-brand-800 text-white rounded-2xl p-6 shadow-md">
        <p className="text-sm text-brand-100">Solde actuel</p>
        <div className="flex items-end gap-2 mt-2">
          <span className="text-4xl font-black">{profile.token_balance}</span>
          <span className="text-sm">tokens</span>
        </div>
        <div className="mt-4 text-xs bg-white/20 inline-flex px-3 py-1 rounded-full items-center gap-1">
          <Percent size={14} /> Commission plateforme: 20%
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/trips" className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition">
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center mb-3">
            <Car size={20} />
          </div>
          <h3 className="font-semibold text-slate-900">Trajets disponibles</h3>
          <p className="text-sm text-slate-500 mt-1">Filtre par zone et réservation instantanée.</p>
        </Link>

        <Link to="/validator" className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition">
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center mb-3">
            <QrCode size={20} />
          </div>
          <h3 className="font-semibold text-slate-900">Validation QR</h3>
          <p className="text-sm text-slate-500 mt-1">
            {profile.role === 'driver'
              ? 'Affiche ton QR code pour validation.'
              : 'Scanne le QR du conducteur pour confirmer le trajet.'}
          </p>
        </Link>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700">
          <Wallet size={18} />
          <span className="text-sm">Compte tokens prêt pour réservation et validation.</span>
        </div>
      </section>

      {profile.role === 'driver' && (
        <section className="bg-brand-50 border border-brand-100 rounded-2xl p-4 text-sm text-brand-900">
          Conseil: publie ton itinéraire dans l’onglet <strong>Trajets</strong> pour recevoir des réservations.
        </section>
      )}
    </div>
  )
}
