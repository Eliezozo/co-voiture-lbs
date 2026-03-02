import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { CheckCircle2, XCircle, AlertCircle, Camera, Smartphone } from 'lucide-react';

export default function QRCodeValidator() {
    const [profile, setProfile] = useState < any > (null);
    const [loading, setLoading] = useState(true);
    const [scanResult, setScanResult] = useState < { status: 'success' | 'error', message: string } | null > (null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (!error && data) {
                        setProfile(data);
                    }
                }
            } catch (error) {
                console.error('Error fetching profile', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleScan = async (scannedData: string) => {
        try {
            if (!profile || profile.role !== 'student') return;

            // Ensure data is structured (e.g., JSON containing driver_id and trip_id)
            // For simplicity in this PWA draft, let's assume raw text is directly the driver_id
            // In reality, it should include trip_id for exactly matching the booking
            const driverId = scannedData;

            // 1. Find passenger's pending booking for a trip with this driver_id
            const { data: booking, error: bookingErr } = await supabase
                .from('bookings')
                .select(`
          id, 
          trip_id,
          trips!inner(driver_id, price)
        `)
                .eq('passenger_id', profile.id)
                .eq('status', 'pending')
                .eq('trips.driver_id', driverId)
                .single();

            if (bookingErr || !booking) {
                throw new Error("Aucune réservation en attente trouvée pour ce conducteur.");
            }

            // 2. Validate booking status to 'completed'
            const { error: updateErr } = await supabase
                .from('bookings')
                .update({ status: 'completed' })
                .eq('id', booking.id);

            if (updateErr) throw updateErr;

            // 3. Credit tokens to driver (minus 20% platform commission)
            const commission = Math.round(booking.trips.price * 0.2); // Commission LBS
            const amountToCredit = booking.trips.price - commission;

            // Normally via RPC to be atomic. For UI mock:
            const { data: driverProfile } = await supabase
                .from('profiles')
                .select('token_balance')
                .eq('id', driverId)
                .single();

            if (driverProfile) {
                await supabase
                    .from('profiles')
                    .update({ token_balance: driverProfile.token_balance + amountToCredit })
                    .eq('id', driverId);
            }

            setScanResult({ status: 'success', message: "Trajet validé avec succès ! Jetons transférés." });

        } catch (err: any) {
            setScanResult({ status: 'error', message: err.message || "Erreur lors de la validation." });
        }
    };

    const handleReset = () => {
        setScanResult(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    // Fallback dev si non connecté ou requêtes en échec
    const activeProfile = profile || { id: 'mock-driver-123', role: 'driver', full_name: 'Dev Local' };

    return (
        <div className="p-4 md:p-6 lg:max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Validation Trajet</h2>
                <p className="text-slate-500 text-sm">
                    {activeProfile.role === 'driver'
                        ? "Faites scanner ce QR code par votre passager"
                        : "Scannez le QR code du conducteur pour valider"}
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm text-center flex flex-col items-center">
                {activeProfile.role === 'driver' ? (
                    // Vue Conducteur: Afficher le QR Code
                    <div className="space-y-6 flex flex-col items-center justify-center py-6 w-full">
                        <div className="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-inner">
                            <QRCodeSVG
                                value={activeProfile.id}
                                size={220}
                                bgColor="#ffffff"
                                fgColor="#1e293b" // slate-800
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 text-lg">Votre Code de Validation</p>
                            <p className="text-slate-400 text-sm mt-1">{activeProfile.id.split('-')[0]}•••</p>
                        </div>
                    </div>
                ) : (
                    // Vue Passager: Scanner le QR Code
                    <div className="w-full space-y-6 flex flex-col items-center">
                        {scanResult ? (
                            <div className="w-full py-8 fade-in space-y-4">
                                <div className="flex justify-center">
                                    {scanResult.status === 'success' ? (
                                        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
                                            <CheckCircle2 size={40} />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                                            <XCircle size={40} />
                                        </div>
                                    )}
                                </div>
                                <h3 className={`text-xl font-bold ${scanResult.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {scanResult.status === 'success' ? 'Validation réussie' : 'Échec de validation'}
                                </h3>
                                <p className="text-slate-600 text-sm">{scanResult.message}</p>
                                <button
                                    onClick={handleReset}
                                    className="mt-6 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-3 rounded-xl transition"
                                >
                                    Scanner un autre code
                                </button>
                            </div>
                        ) : (
                            <div className="w-full aspect-square max-w-[300px] rounded-3xl overflow-hidden shadow-inner border-2 border-slate-100 relative bg-slate-900 group">
                                <Scanner
                                    onScan={(result) => handleScan(result[0].rawValue)}
                                    onError={(error) => console.log(error?.message)}
                                    components={{
                                        audio: false,
                                        onOff: true,
                                        torch: true,
                                        zoom: true,
                                        finder: true
                                    }}
                                    styles={{
                                        container: { width: '100%', height: '100%' },
                                    }}
                                />
                                <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white/90 text-xs font-medium border border-white/10 z-10">
                                    <Camera size={14} />
                                    Caméra active
                                </div>
                            </div>
                        )}

                        {!scanResult && (
                            <div className="flex bg-blue-50/50 p-4 rounded-xl border border-blue-100 items-start gap-3 w-full text-left">
                                <AlertCircle size={20} className="text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 leading-relaxed font-medium">
                                    Le système déduira les jetons de votre compte après confirmation et reversera les fonds au conducteur (-20% de commission).
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
