import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Clock, MapPin, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function TripListing() {
  const { profile, refreshProfile } = useAuth()
  const [trips, setTrips] = useState([])
  const [zoneFilter, setZoneFilter] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookingTripId, setBookingTripId] = useState('')

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    setError('')

    let query = supabase
      .from('trips')
      .select('id,driver_id,departure_city,destination,zone,price,seats,departure_time,status,driver:profiles!trips_driver_id_fkey(full_name)')
      .eq('status', 'scheduled')
      .gt('seats', 0)
      .order('departure_time', { ascending: true })

    if (zoneFilter > 0) {
      query = query.eq('zone', zoneFilter)
    }

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

  const statusByZone = useMemo(() => {
    return zoneFilter === 0 ? 'Toutes zones' : `Zone ${zoneFilter}`
  }, [zoneFilter])

  const handleBook = async (tripId) => {
    if (!profile) return

    setBookingTripId(tripId)
    setError('')

    const { error: rpcError } = await supabase.rpc('book_trip', {
      p_trip_id: tripId,
    })

    if (rpcError) {
      setError(rpcError.message)
      setBookingTripId('')
      return
    }

    await Promise.all([fetchTrips(), refreshProfile()])
    setBookingTripId('')
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trajets disponibles</h2>
          <p className="text-sm text-slate-500">Filtre actif: {statusByZone}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-1 flex">
          <button
            onClick={() => setZoneFilter(0)}
            className={`px-3 py-2 text-sm rounded-lg ${zoneFilter === 0 ? 'bg-brand-100 text-brand-700' : 'text-slate-600'}`}
          >
            Toutes
          </button>
          {[1, 2, 3].map((zone) => (
            <button
              key={zone}
              onClick={() => setZoneFilter(zone)}
              className={`px-3 py-2 text-sm rounded-lg ${zoneFilter === zone ? 'bg-brand-100 text-brand-700' : 'text-slate-600'}`}
            >
              Zone {zone}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <section className="space-y-3">
        {loading && <div className="text-sm text-slate-500">Chargement des trajets...</div>}

        {!loading && trips.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-500">
            Aucun trajet disponible pour ce filtre.
          </div>
        )}

        {trips.map((trip) => (
          <article key={trip.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-brand-700 font-semibold bg-brand-50 inline-flex px-2 py-1 rounded-full">
                  Zone {trip.zone}
                </div>
                <h3 className="font-bold text-slate-900 mt-2">
                  {trip.departure_city} → {trip.destination}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-slate-900">{trip.price}</p>
                <p className="text-xs text-slate-500">tokens</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-2"><MapPin size={15} /> {trip.driver?.full_name || 'Conducteur'}</div>
              <div className="flex items-center gap-2"><Clock size={15} /> {new Date(trip.departure_time).toLocaleString()}</div>
              <div className="flex items-center gap-2"><Users size={15} /> {trip.seats} place(s)</div>
            </div>

            <button
              disabled={bookingTripId === trip.id || profile?.role === 'driver'}
              onClick={() => handleBook(trip.id)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              {profile?.role === 'driver'
                ? 'Mode conducteur'
                : bookingTripId === trip.id
                  ? 'Réservation...'
                  : 'Réserver'}
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}
