import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Car, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'student',
}

export default function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError('')

    try {
      if (isSignUp) {
        await signUp({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
        })
        setMessage('Compte créé. Vérifie ton email LBS pour confirmer le compte si nécessaire.')
      } else {
        await signIn(form.email, form.password)
      }
    } catch (err) {
      setError(err.message || 'Erreur authentification.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-3xl border border-brand-100 shadow-lg p-6 space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-600 text-white flex items-center justify-center mb-3">
            <Car size={26} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Covoiturage LBS</h1>
          <p className="text-sm text-slate-500 mt-1">Accès réservé aux emails LBS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              name="fullName"
              required
              value={form.fullName}
              onChange={handleChange}
              placeholder="Nom complet"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}

          <input
            type="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="prenom.nom@lomebs.com"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <input
            type="password"
            name="password"
            required
            minLength={6}
            value={form.password}
            onChange={handleChange}
            placeholder="Mot de passe"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {isSignUp && (
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="student">Étudiant / Passager</option>
              <option value="driver">Conducteur</option>
            </select>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3 text-sm font-semibold flex justify-center items-center gap-2 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {isSignUp ? 'Créer un compte' : 'Se connecter'}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp((v) => !v)}
          className="w-full text-sm text-brand-700 font-medium"
        >
          {isSignUp ? 'J’ai déjà un compte' : 'Créer un compte LBS'}
        </button>
      </div>
    </div>
  )
}
