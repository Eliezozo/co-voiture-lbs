import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { KeyRound, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function UpdatePasswordPage() {
  const { user, loading, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (!loading && !user) {
    return <Navigate to="/auth" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    if (password !== confirmPassword) {
      setError('La confirmation du mot de passe ne correspond pas.')
      return
    }

    setSubmitting(true)
    try {
      await updatePassword(password)
      setMessage('Mot de passe mis à jour avec succès.')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message || 'Impossible de mettre à jour le mot de passe.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-3xl border border-brand-100 shadow-lg p-6 space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-600 text-white flex items-center justify-center mb-3">
            <KeyRound size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Mettre à jour le mot de passe</h1>
          <p className="text-sm text-slate-500 mt-1">Compte LBS sécurisé</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            placeholder="Nouveau mot de passe"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            placeholder="Confirmer le mot de passe"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3 text-sm font-semibold flex justify-center items-center gap-2 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Enregistrer
          </button>
        </form>

        <Link to="/" className="block text-center text-sm text-brand-700 font-medium">Retour au dashboard</Link>
      </div>
    </div>
  )
}
