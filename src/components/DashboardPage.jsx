import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock, MapPin, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { profile, refreshProfile } = useAuth()
  const [zoneFilter, setZoneFilter] = useState(0)
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookingTripId, setBookingTripId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    setError('')

    let query = supabase
      .from('trips')
      .select('id,driver_id,departure_point,destination,zone,price_tokens,departure_time,seats_available,status,driver:profiles!trips_driver_id_fkey(full_name)')
      .eq('status', 'scheduled')
      .gt('seats_available', 0)
      .order('departure_time', { ascending: true })

    if (zoneFilter > 0) query = query.eq('zone', zoneFilter)

    const { data, error: queryError } = await query
    if (queryError) {
      setError(queryError.message)
      setTrips([])
    } else {
      setTrips(data || [])
    }

    setLoading(false)
  }, [zoneFilter])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  const handleBook = async (tripId) => {
    setBookingTripId(tripId)
    setError('')
    setSuccess('')

    const { error: rpcError } = await supabase.rpc('book_trip_secure', { p_trip_id: tripId })
    if (rpcError) {
      if (rpcError.message.toLowerCase().includes('solde')) {
        setError('Solde insuffisant, contactez l\'admin pour recharger')
      } else {
        setError(rpcError.message)
      }
      setBookingTripId('')
      return
    }

    setSuccess('Réservation effectuée. Passe au scan QR pour valider.')
    setBookingTripId('')
    await Promise.all([fetchTrips(), refreshProfile()])
  }

  const activeZoneLabel = useMemo(() => (zoneFilter === 0 ? 'Toutes zones' : `Zone ${zoneFilter}`), [zoneFilter])

  return (
    <div className="p-4 md:p-6 space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-sm text-slate-500">Tableau de bord</p>
        <h2 className="text-2xl font-bold text-slate-900">Bonjour {profile?.full_name || 'LBS'}</h2>
        <p className="mt-2 text-sm text-slate-600">Solde actuel: <strong>{profile?.token_balance || 0} jetons</strong></p>
      </section>

      <section className="flex flex-wrap gap-2">
        <button onClick={() => setZoneFilter(0)} className={`px-3 py-2 rounded-xl text-sm ${zoneFilter === 0 ? 'bg-blue-900 text-white' : 'bg-white border'}`}>Toutes</button>
        <button onClick={() => setZoneFilter(1)} className={`px-3 py-2 rounded-xl text-sm ${zoneFilter === 1 ? 'bg-blue-900 text-white' : 'bg-white border'}`}>Zone 1</button>
        <button onClick={() => setZoneFilter(2)} className={`px-3 py-2 rounded-xl text-sm ${zoneFilter === 2 ? 'bg-blue-900 text-white' : 'bg-white border'}`}>Zone 2</button>
        <button onClick={() => setZoneFilter(3)} className={`px-3 py-2 rounded-xl text-sm ${zoneFilter === 3 ? 'bg-blue-900 text-white' : 'bg-white border'}`}>Zone 3</button>
        <span className="text-xs self-center text-slate-500 ml-2">Filtre: {activeZoneLabel}</span>
      </section>

      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertTriangle size={16} />{error}</div>}
      {success && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">{success}</div>}

      <section className="space-y-3">
        {loading && <p className="text-sm text-slate-500">Chargement des trajets...</p>}
        {!loading && trips.length === 0 && (
          <div className="bg-white border rounded-2xl p-5 text-sm text-slate-500">Aucun trajet disponible.</div>
        )}

        {trips.map((trip) => (
          <article key={trip.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs bg-blue-100 text-blue-900 px-2 py-1 rounded-full">Zone {trip.zone}</span>
                <h3 className="font-bold text-slate-900 mt-2">{trip.departure_point} → {trip.destination}</h3>
                <p className="text-xs text-slate-500 mt-1">Conducteur: {trip.driver?.full_name || 'LBS Driver'}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-blue-900">{trip.price_tokens}</p>
                <p className="text-xs text-slate-500">jetons</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600">
              <div className="inline-flex items-center gap-2"><Clock size={15} /> {new Date(trip.departure_time).toLocaleString()}</div>
              <div className="inline-flex items-center gap-2"><Users size={15} /> {trip.seats_available} place(s)</div>
              <div className="inline-flex items-center gap-2 sm:col-span-2"><MapPin size={15} /> Départ: {trip.departure_point}</div>
            </div>

            <button
              onClick={() => handleBook(trip.id)}
              disabled={profile?.role !== 'passager' || bookingTripId === trip.id}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold disabled:opacity-60"
            >
              {profile?.role !== 'passager' ? 'Réservé aux passagers' : bookingTripId === trip.id ? 'Réservation...' : 'Réserver'}
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}
