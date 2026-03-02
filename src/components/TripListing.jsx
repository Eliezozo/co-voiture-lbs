import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Clock, MapPin, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ZONE_PRICING } from '../lib/constants'

export default function TripListing() {
  const { profile, refreshProfile } = useAuth()
  const [trips, setTrips] = useState([])
  const [driverTrips, setDriverTrips] = useState([])
  const [zoneFilter, setZoneFilter] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [bookingTripId, setBookingTripId] = useState('')
  const [creatingTrip, setCreatingTrip] = useState(false)
  const [createForm, setCreateForm] = useState({
    departure_city: '',
    destination: '',
    zone: 1,
    seats: 1,
    departure_time: '',
  })

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

  const fetchDriverTrips = useCallback(async () => {
    if (profile?.role !== 'driver') {
      setDriverTrips([])
      return
    }

    const { data } = await supabase
      .from('trips')
      .select('id,departure_city,destination,zone,price,seats,status,departure_time')
      .eq('driver_id', profile.id)
      .order('departure_time', { ascending: true })

    setDriverTrips(data || [])
  }, [profile])

  useEffect(() => {
    fetchDriverTrips()
  }, [fetchDriverTrips])

  const statusByZone = useMemo(() => {
    return zoneFilter === 0 ? 'Toutes zones' : `Zone ${zoneFilter}`
  }, [zoneFilter])

  const handleBook = async (tripId) => {
    if (!profile) return

    setBookingTripId(tripId)
    setError('')
    setSuccess('')

    const { error: rpcError } = await supabase.rpc('book_trip', {
      p_trip_id: tripId,
    })

    if (rpcError) {
      setError(rpcError.message)
      setBookingTripId('')
      return
    }

    await Promise.all([fetchTrips(), refreshProfile()])
    setSuccess('Réservation effectuée avec succès.')
    setBookingTripId('')
  }

  const handleCreateChange = (e) => {
    const { name, value } = e.target
    setCreateForm((prev) => ({
      ...prev,
      [name]: name === 'zone' || name === 'seats' ? Number(value) : value,
    }))
  }

  const handleCreateTrip = async (e) => {
    e.preventDefault()
    if (!profile || profile.role !== 'driver') return

    setCreatingTrip(true)
    setError('')
    setSuccess('')

    if (new Date(createForm.departure_time) <= new Date()) {
      setError('L’heure de départ doit être dans le futur.')
      setCreatingTrip(false)
      return
    }

    const departureIso = new Date(createForm.departure_time).toISOString()
    const { error: insertError } = await supabase.from('trips').insert({
      driver_id: profile.id,
      departure_city: createForm.departure_city.trim(),
      destination: createForm.destination.trim(),
      zone: createForm.zone,
      seats: createForm.seats,
      departure_time: departureIso,
      status: 'scheduled',
    })

    if (insertError) {
      setError(insertError.message)
      setCreatingTrip(false)
      return
    }

    setCreateForm({
      departure_city: '',
      destination: '',
      zone: 1,
      seats: 1,
      departure_time: '',
    })
    await Promise.all([fetchTrips(), fetchDriverTrips()])
    setSuccess('Itinéraire publié avec succès.')
    setCreatingTrip(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {profile?.role === 'driver' && (
        <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Publier mon itinéraire</h3>
          <form onSubmit={handleCreateTrip} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              name="departure_city"
              value={createForm.departure_city}
              onChange={handleCreateChange}
              placeholder="Ville de départ"
              required
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              name="destination"
              value={createForm.destination}
              onChange={handleCreateChange}
              placeholder="Destination"
              required
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              name="zone"
              value={createForm.zone}
              onChange={handleCreateChange}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value={1}>Zone 1 (2 tokens)</option>
              <option value={2}>Zone 2 (4 tokens)</option>
              <option value={3}>Zone 3 (7 tokens)</option>
            </select>
            <input
              type="number"
              name="seats"
              min={1}
              value={createForm.seats}
              onChange={handleCreateChange}
              required
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              name="departure_time"
              value={createForm.departure_time}
              onChange={handleCreateChange}
              required
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            />
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Prix appliqué automatiquement: {ZONE_PRICING[createForm.zone]} tokens.
              </p>
              <button
                type="submit"
                disabled={creatingTrip}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {creatingTrip ? 'Publication...' : 'Publier le trajet'}
              </button>
            </div>
          </form>
        </section>
      )}

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

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">
          {success}
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

      {profile?.role === 'driver' && (
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900">Mes itinéraires publiés</h3>
          {driverTrips.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-500">
              Aucun itinéraire publié pour le moment.
            </div>
          )}
          {driverTrips.map((trip) => (
            <article key={trip.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-slate-900">
                    {trip.departure_city} → {trip.destination}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(trip.departure_time).toLocaleString()}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">{trip.status}</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Zone {trip.zone} | {trip.price} tokens | {trip.seats} place(s) restantes
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
