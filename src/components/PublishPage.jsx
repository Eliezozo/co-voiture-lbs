import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ZONE_PRICES } from '../lib/constants'

const initialForm = {
  departure_point: '',
  zone: 1,
  departure_time: '',
  seats_available: 1,
}

export default function PublishPage() {
  const { profile } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (profile?.role !== 'conducteur') {
    return <div className="p-6 text-sm text-slate-600">Cette page est réservée aux conducteurs.</div>
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'zone' || name === 'seats_available' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    if (new Date(form.departure_time) <= new Date()) {
      setError('L\'heure de départ doit être dans le futur.')
      setSubmitting(false)
      return
    }

    const payload = {
      driver_id: profile.id,
      departure_point: form.departure_point.trim(),
      destination: 'LBS',
      zone: form.zone,
      departure_time: new Date(form.departure_time).toISOString(),
      seats_available: form.seats_available,
      status: 'scheduled',
    }

    const { error: insertError } = await supabase.from('trips').insert(payload)
    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setSuccess('Trajet publié avec succès.')
    setForm(initialForm)
    setSubmitting(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-2xl font-bold text-slate-900">Publier un trajet</h2>
        <p className="text-sm text-slate-500">Propose tes places vers LBS.</p>
      </section>

      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertTriangle size={16} />{error}</div>}
      {success && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">{success}</div>}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <input
          name="departure_point"
          value={form.departure_point}
          onChange={handleChange}
          placeholder="Point de départ"
          required
          className="w-full px-4 py-3 border rounded-xl text-sm"
        />

        <div className="grid sm:grid-cols-2 gap-3">
          <select
            name="zone"
            value={form.zone}
            onChange={handleChange}
            className="px-4 py-3 border rounded-xl text-sm"
          >
            <option value={1}>Zone 1 (2 jetons)</option>
            <option value={2}>Zone 2 (4 jetons)</option>
            <option value={3}>Zone 3 (7 jetons)</option>
          </select>

          <input
            type="number"
            name="seats_available"
            value={form.seats_available}
            onChange={handleChange}
            min={1}
            required
            className="px-4 py-3 border rounded-xl text-sm"
          />
        </div>

        <input
          type="datetime-local"
          name="departure_time"
          value={form.departure_time}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border rounded-xl text-sm"
        />

        <p className="text-xs text-slate-500">Prix automatique appliqué: {ZONE_PRICES[form.zone]} jetons.</p>

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold disabled:opacity-60"
        >
          {submitting ? 'Publication...' : 'Publier'}
        </button>
      </form>
    </div>
  )
}
