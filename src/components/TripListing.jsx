import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Users, ArrowRight, Filter, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Mocked data pour l'aperçu UI s'il n'y a pas encore de connexion à la base
const MOCK_TRIPS = [
    { id: '1', destination: 'Campus LBS', departure_city: 'Adidogomé', zone: 1, price: 2, seats_available: 3, departure_time: '2023-11-20T07:30:00Z', driver: { full_name: 'Komlan D.' } },
    { id: '2', destination: 'Campus LBS', departure_city: 'Agoè', zone: 2, price: 4, seats_available: 1, departure_time: '2023-11-20T08:00:00Z', driver: { full_name: 'Amélie K.' } },
    { id: '3', destination: 'Lomé Centre', departure_city: 'Campus LBS', zone: 3, price: 7, seats_available: 4, departure_time: '2023-11-20T17:30:00Z', driver: { full_name: 'Jean P.' } },
];

export default function TripListing() {
    const [trips, setTrips] = useState<any[]>(MOCK_TRIPS);
    const [zoneFilter, setZoneFilter] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bookingStatus, setBookingStatus] = useState<{ id: string, status: 'loading' | 'success' | 'error' } | null>(null);

    // Exemple: Récupération depuis Supabase (commenté pour avoir des données statiques dans l'aperçu)
    /*
    useEffect(() => {
      const fetchTrips = async () => {
        setLoading(true);
        let query = supabase.from('trips').select(`*, driver:profiles(full_name)`).eq('status', 'scheduled');
        if (zoneFilter) query = query.eq('zone', zoneFilter);
        
        const { data, error } = await query;
        if (error) setError(error.message);
        else if (data) setTrips(data);
        setLoading(false);
      };
      fetchTrips();
    }, [zoneFilter]);
    */

    const handleBook = async (trip: any) => {
        setBookingStatus({ id: trip.id, status: 'loading' });
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // Simuler un achat pour la démo UI
                setTimeout(() => {
                    setBookingStatus({ id: trip.id, status: 'success' });
                }, 1000);
                return;
            }

            // 1. Vérifier le solde de l'utilisateur
            const { data: profile } = await supabase.from('profiles').select('token_balance').eq('id', user.id).single();

            if (!profile || profile.token_balance < trip.price) {
                throw new Error('Solde insuffisant pour ce trajet.');
            }

            // 2. Créer la réservation et déduire via une RPC (Stored Procedure Supabase)
            // Ou une transaction basique côté client:
            const { error: insertError } = await supabase.from('bookings').insert({
                trip_id: trip.id,
                passenger_id: user.id,
                status: 'pending'
            });

            if (insertError) throw insertError;

            // Déduction du solde (Idéalement fait via un TRIGGER en base ou RPC)
            await supabase.from('profiles').update({
                token_balance: profile.token_balance - trip.price
            }).eq('id', user.id);

            setBookingStatus({ id: trip.id, status: 'success' });

        } catch (err: any) {
            console.error(err);
            setBookingStatus({ id: trip.id, status: 'error' });
            alert(err.message || "Erreur lors de la réservation");
        }
    };

    const filteredTrips = zoneFilter ? trips.filter(t => t.zone === zoneFilter) : trips;

    return (
        <div className="p-4 md:p-6 lg:max-w-4xl mx-auto space-y-6">

            {/* Header & Filtres */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Trajets disponibles</h2>
                    <p className="text-slate-500 text-sm mt-1">Trouvez le covoiturage parfait pour votre trajet.</p>
                </div>

                <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-full sm:w-auto">
                    <button
                        onClick={() => setZoneFilter(null)}
                        className={`flex-1 sm:px-4 py-2 text-sm font-medium rounded-lg transition ${!zoneFilter ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Toutes
                    </button>
                    {[1, 2, 3].map(zone => (
                        <button
                            key={zone}
                            onClick={() => setZoneFilter(zone)}
                            className={`flex-1 sm:px-4 py-2 text-sm font-medium rounded-lg transition ${zoneFilter === zone ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            Zone {zone}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}

            {/* Liste des Trajets */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                    </div>
                ) : filteredTrips.length === 0 ? (
                    <div className="text-center p-10 bg-white border border-slate-200 rounded-2xl">
                        <p className="text-slate-500">Aucun trajet disponible pour cette zone actuellement.</p>
                    </div>
                ) : (
                    filteredTrips.map((trip) => (
                        <div key={trip.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow group flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">

                            <div className="space-y-4 flex-1 w-full">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-1 rounded w-max mb-2">
                                            Zone {trip.zone}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <div className="font-semibold text-slate-900 text-lg">{trip.departure_city}</div>
                                            <ArrowRight size={16} className="text-slate-300" />
                                            <div className="font-semibold text-brand-900 text-lg">{trip.destination}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-slate-800">{trip.price}</span>
                                        <span className="text-sm text-slate-500 ml-1">jetons</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                        <MapPin size={16} className="text-slate-400" />
                                        <span className="font-medium">{trip.driver?.full_name || 'Conducteur'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                        <Clock size={16} className="text-slate-400" />
                                        <span>{new Date(trip.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                        <Users size={16} className={trip.seats_available > 0 ? 'text-green-500' : 'text-red-500'} />
                                        <span className={trip.seats_available > 0 ? 'text-slate-700' : 'text-red-600 font-medium'}>
                                            {trip.seats_available} {trip.seats_available > 1 ? 'places' : 'place'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full sm:w-auto mt-2 sm:mt-0">
                                <button
                                    disabled={trip.seats_available === 0 || bookingStatus?.id === trip.id}
                                    onClick={() => handleBook(trip)}
                                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm transition focus:ring-2 focus:ring-offset-2 ${bookingStatus?.id === trip.id && bookingStatus.status === 'success'
                                            ? 'bg-green-500 text-white'
                                            : trip.seats_available === 0
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm focus:ring-brand-500'
                                        }`}
                                >
                                    {bookingStatus?.id === trip.id ? (
                                        bookingStatus.status === 'loading' ? 'En cours...' :
                                            bookingStatus.status === 'success' ? 'Réservé !' : 'Réserver'
                                    ) : trip.seats_available === 0 ? (
                                        'Complet'
                                    ) : (
                                        'Réserver'
                                    )}
                                </button>
                            </div>

                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
