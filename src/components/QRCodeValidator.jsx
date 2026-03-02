import { useCallback, useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { CheckCircle2, QrCode, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function QRCodeValidator() {
  const { profile, refreshProfile } = useAuth()
  const [cameraOpen, setCameraOpen] = useState(false)
  const [pendingBookings, setPendingBookings] = useState([])
  const [result, setResult] = useState(null)

  const isPassenger = profile?.role === 'student'

  const fetchPendingBookings = useCallback(async () => {
    if (!profile || !isPassenger) return

    const { data } = await supabase
      .from('bookings')
      .select('id,status,trips!inner(driver_id,price,destination,departure_city)')
      .eq('passenger_id', profile.id)
      .eq('status', 'pending')

    setPendingBookings(data || [])
  }, [isPassenger, profile])

  useEffect(() => {
    fetchPendingBookings()
  }, [fetchPendingBookings])

  const handleScan = async (value) => {
    if (!value) return

    const scannedDriverId = value.trim()

    const targetBooking = pendingBookings.find(
      (booking) => booking.trips.driver_id === scannedDriverId,
    )

    if (!targetBooking) {
      setResult({ ok: false, text: 'QR invalide: aucune réservation en attente pour ce conducteur.' })
      return
    }

    const { error } = await supabase.rpc('confirm_booking_by_qr', {
      p_booking_id: targetBooking.id,
      p_scanned_driver_id: scannedDriverId,
    })

    if (error) {
      setResult({ ok: false, text: error.message })
      return
    }

    setResult({ ok: true, text: 'Trajet confirmé. Le conducteur a reçu 80% du prix.' })
    setCameraOpen(false)
    await Promise.all([fetchPendingBookings(), refreshProfile()])
  }

  const hasPending = useMemo(() => pendingBookings.length > 0, [pendingBookings])

  if (!profile) {
    return <div className="p-6 text-slate-600">Profil introuvable.</div>
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-xl">
      <h2 className="text-2xl font-bold text-slate-900">Validation QR</h2>

      {profile.role === 'driver' ? (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4">
          <p className="text-sm text-slate-600">Montre ce QR code aux passagers pour validation.</p>
          <div className="inline-block p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <QRCodeSVG value={profile.id} size={220} />
          </div>
          <p className="text-xs text-slate-400 break-all">ID conducteur: {profile.id}</p>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <p className="text-sm text-slate-600">Scanne le QR du conducteur pour confirmer ton trajet.</p>
            {hasPending && (
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-xs text-brand-800">
                {pendingBookings.length} réservation(s) en attente de confirmation.
              </div>
            )}
            <button
              onClick={() => setCameraOpen((v) => !v)}
              disabled={!hasPending}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                <QrCode size={16} />
                {cameraOpen ? 'Fermer la caméra' : 'Scan to Confirm'}
              </span>
            </button>
            {!hasPending && (
              <p className="text-xs text-amber-600">Aucune réservation en attente à confirmer.</p>
            )}
          </div>

          {hasPending && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-900">Réservations en attente</p>
              {pendingBookings.map((booking) => (
                <div key={booking.id} className="text-xs text-slate-600 border border-slate-100 rounded-lg p-2">
                  {booking.trips.departure_city} → {booking.trips.destination} | {booking.trips.price} tokens
                </div>
              ))}
            </div>
          )}

          {cameraOpen && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
              <Scanner
                onScan={(codes) => {
                  const code = codes?.[0]?.rawValue
                  if (code) {
                    handleScan(code)
                  }
                }}
                onError={(err) => setResult({ ok: false, text: err?.message || 'Erreur caméra.' })}
                components={{
                  audio: false,
                  finder: true,
                  onOff: true,
                }}
              />
            </div>
          )}

          {result && (
            <div className={`rounded-xl p-3 text-sm border ${result.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <span className="inline-flex items-center gap-2">
                {result.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {result.text}
              </span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
