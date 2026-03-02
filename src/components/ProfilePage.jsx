import { useCallback, useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import QrScanner from './QrScanner'

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const [driverTrips, setDriverTrips] = useState([])
  const [bookings, setBookings] = useState([])
  const [scanOpen, setScanOpen] = useState(false)
  const [scanMessage, setScanMessage] = useState('')

  const fetchData = useCallback(async () => {
    if (!profile) return

    if (profile.role === 'conducteur') {
      const { data } = await supabase
        .from('trips')
        .select('id,departure_point,destination,zone,price_tokens,status,departure_time,seats_available')
        .eq('driver_id', profile.id)
        .order('departure_time', { ascending: false })
      setDriverTrips(data || [])
      setBookings([])
      return
    }

    const { data } = await supabase
      .from('bookings')
      .select('id,status,created_at,trips!inner(id,driver_id,departure_point,destination,price_tokens,departure_time)')
      .eq('passenger_id', profile.id)
      .order('created_at', { ascending: false })

    setBookings(data || [])
    setDriverTrips([])
  }, [profile])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const pendingBookings = useMemo(() => bookings.filter((item) => item.status === 'en_attente'), [bookings])

  const handleScanDetected = async (rawValue) => {
    const scannedDriverId = rawValue.trim()
    const booking = pendingBookings.find((item) => item.trips.driver_id === scannedDriverId)

    if (!booking) {
      setScanMessage('QR invalide pour vos réservations en attente.')
      return
    }

    const { error } = await supabase.rpc('validate_booking_scan', {
      p_booking_id: booking.id,
      p_scanned_driver_id: scannedDriverId,
    })

    if (error) {
      setScanMessage(error.message)
      return
    }

    setScanOpen(false)
    setScanMessage('Trajet validé et conducteur crédité.')
    await Promise.all([fetchData(), refreshProfile()])
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-2xl font-bold text-slate-900">Mon Profil</h2>
        <p className="text-sm text-slate-500">Nom: {profile?.full_name}</p>
        <p className="text-sm text-slate-500">Rôle: {profile?.role}</p>
        <p className="text-sm text-slate-500">Solde: {profile?.token_balance || 0} jetons</p>
      </section>

      {profile?.role === 'conducteur' ? (
        <>
          <section className="bg-white border border-slate-200 rounded-2xl p-5 text-center space-y-3">
            <button className="mx-auto inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm">
              <QrCode size={16} /> Mon QR Code
            </button>
            <div className="inline-block p-3 border rounded-2xl bg-slate-50">
              <QRCodeSVG value={profile.id} size={220} />
            </div>
            <p className="text-xs text-slate-400 break-all">{profile.id}</p>
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-slate-900">Historique des trajets publiés</h3>
            {driverTrips.length === 0 && <div className="bg-white border rounded-2xl p-4 text-sm text-slate-500">Aucun trajet publié.</div>}
            {driverTrips.map((trip) => (
              <div key={trip.id} className="bg-white border rounded-2xl p-4 text-sm space-y-1">
                <p className="font-semibold">{trip.departure_point} → {trip.destination}</p>
                <p className="text-slate-500">Zone {trip.zone} | {trip.price_tokens} jetons | {trip.seats_available} places</p>
                <p className="text-slate-500">{new Date(trip.departure_time).toLocaleString()} | {trip.status}</p>
              </div>
            ))}
          </section>
        </>
      ) : (
        <>
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <button
              onClick={() => setScanOpen((prev) => !prev)}
              disabled={pendingBookings.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm disabled:opacity-50"
            >
              <QrCode size={16} /> Scanner pour valider
            </button>
            <p className="text-xs text-slate-500">Réservations en attente: {pendingBookings.length}</p>
            {scanMessage && <p className="text-sm text-blue-900">{scanMessage}</p>}
            {scanOpen && <QrScanner onDetected={handleScanDetected} onClose={() => setScanOpen(false)} />}
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-slate-900">Historique de mes réservations</h3>
            {bookings.length === 0 && <div className="bg-white border rounded-2xl p-4 text-sm text-slate-500">Aucune réservation.</div>}
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white border rounded-2xl p-4 text-sm space-y-1">
                <p className="font-semibold">{booking.trips.departure_point} → {booking.trips.destination}</p>
                <p className="text-slate-500">{new Date(booking.trips.departure_time).toLocaleString()} | {booking.trips.price_tokens} jetons</p>
                <p className="text-slate-500">Statut: {booking.status}</p>
              </div>
            ))}
          </section>
        </>
      )}

      <button
        onClick={() => {
          fetchData()
          refreshProfile()
        }}
        className="inline-flex items-center gap-2 text-sm px-3 py-2 border rounded-xl bg-white"
      >
        <RefreshCw size={15} /> Actualiser
      </button>
    </div>
  )
}
