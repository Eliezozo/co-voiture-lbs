import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Car, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'passager',
}

export default function LoginPage() {
  const { user, loading, signIn, signUp, authError } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    setError('')
    setMessage('')

    try {
      if (isRegister) {
        await signUp({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role: form.role,
        })
        setMessage('Compte créé. Connecte-toi avec tes identifiants.')
        setIsRegister(false)
      } else {
        await signIn(form.email, form.password)
      }
    } catch (err) {
      setError(err.message || 'Erreur authentification')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-blue-900 text-white px-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-xl p-6 space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-blue-900 text-white mx-auto flex items-center justify-center mb-3">
            <Car size={28} />
          </div>
          <h1 className="text-2xl font-bold">LBS Covoiturage</h1>
          <p className="text-sm text-slate-500">Accès exclusif LBS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Nom complet"
              required
              className="w-full px-4 py-3 border rounded-xl text-sm"
            />
          )}

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="prenom.nom@lomebs.com"
            required
            className="w-full px-4 py-3 border rounded-xl text-sm"
          />

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Mot de passe"
            minLength={6}
            required
            className="w-full px-4 py-3 border rounded-xl text-sm"
          />

          {isRegister && (
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-xl text-sm"
            >
              <option value="passager">Passager</option>
              <option value="conducteur">Conducteur</option>
            </select>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && authError && <p className="text-sm text-red-600">{authError}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-xl font-semibold text-sm flex justify-center items-center gap-2 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {isRegister ? 'Créer un compte' : 'Se connecter'}
          </button>
        </form>

        <button
          onClick={() => {
            setIsRegister((prev) => !prev)
            setError('')
            setMessage('')
          }}
          className="text-sm text-blue-900 font-medium w-full"
        >
          {isRegister ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S’inscrire'}
        </button>
      </div>
    </div>
  )
}
