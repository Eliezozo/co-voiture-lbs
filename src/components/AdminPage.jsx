import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profiles, setProfiles] = useState([])
  const [trips, setTrips] = useState([])
  const [bookings, setBookings] = useState([])

  const fetchAdminData = useCallback(async () => {
    setLoading(true)
    setError('')

    const [profilesRes, tripsRes, bookingsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,email,full_name,role,token_balance,created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('trips')
        .select('id,departure_city,destination,zone,price,seats,status,departure_time,driver:profiles!trips_driver_id_fkey(full_name,email)')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('bookings')
        .select('id,status,created_at,passenger:profiles!bookings_passenger_id_fkey(full_name,email),trip:trips!bookings_trip_id_fkey(departure_city,destination,price,driver:profiles!trips_driver_id_fkey(full_name,email))')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const firstError = profilesRes.error || tripsRes.error || bookingsRes.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    setProfiles(profilesRes.data || [])
    setTrips(tripsRes.data || [])
    setBookings(bookingsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAdminData()
  }, [fetchAdminData])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-2xl font-bold text-slate-900">Administration</h2>
        <p className="text-sm text-slate-500 mt-1">Vue globale utilisateurs, trajets et réservations.</p>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-slate-500">Chargement des données admin...</div>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Utilisateurs</p>
              <p className="text-2xl font-black text-slate-900">{profiles.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Trajets</p>
              <p className="text-2xl font-black text-slate-900">{trips.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Réservations</p>
              <p className="text-2xl font-black text-slate-900">{bookings.length}</p>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-900">Derniers utilisateurs</h3>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Nom</th>
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Rôle</th>
                    <th className="text-left px-3 py-2">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((user) => (
                    <tr key={user.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{user.full_name || '-'}</td>
                      <td className="px-3 py-2">{user.email}</td>
                      <td className="px-3 py-2">{user.role}</td>
                      <td className="px-3 py-2">{user.token_balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-900">Derniers trajets</h3>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Itinéraire</th>
                    <th className="text-left px-3 py-2">Conducteur</th>
                    <th className="text-left px-3 py-2">Zone/Prix</th>
                    <th className="text-left px-3 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => (
                    <tr key={trip.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{trip.departure_city} → {trip.destination}</td>
                      <td className="px-3 py-2">{trip.driver?.full_name || trip.driver?.email || '-'}</td>
                      <td className="px-3 py-2">Zone {trip.zone} / {trip.price}</td>
                      <td className="px-3 py-2">{trip.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-900">Dernières réservations</h3>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Passager</th>
                    <th className="text-left px-3 py-2">Trajet</th>
                    <th className="text-left px-3 py-2">Conducteur</th>
                    <th className="text-left px-3 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{booking.passenger?.full_name || booking.passenger?.email || '-'}</td>
                      <td className="px-3 py-2">{booking.trip?.departure_city} → {booking.trip?.destination}</td>
                      <td className="px-3 py-2">{booking.trip?.driver?.full_name || booking.trip?.driver?.email || '-'}</td>
                      <td className="px-3 py-2">{booking.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
