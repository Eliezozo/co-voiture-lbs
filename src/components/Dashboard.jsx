import React, { useEffect, useState } from 'react';
import { Wallet, Car, History, QrCode, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Dans une version complète, l'utilisateur connecté serait récupéré via le contexte d'authentification
        // Pour cet exemple de code, on simule un utilisateur (soit via fetch, soit via props)
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

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    // Fallback si pas connecté
    const displayProfile = profile || {
        full_name: 'Étudiant LBS',
        role: 'student',
        token_balance: 15
    };

    return (
        <div className="p-4 md:p-6 lg:max-w-4xl mx-auto space-y-6">
            {/* En-tête de bienvenue */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Bonjour, {displayProfile.full_name}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {displayProfile.role === 'driver' ? 'Conducteur' : 'Passager LBS'}
                    </p>
                </div>
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-lg">
                    {displayProfile.full_name.substring(0, 2).toUpperCase()}
                </div>
            </div>

            {/* Cartes principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Solde de jetons */}
                <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <Wallet size={80} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-brand-100 text-sm font-medium">Solde actuel</p>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-4xl font-extrabold tracking-tight">{displayProfile.token_balance}</span>
                            <span className="text-lg font-medium opacity-80">Jetons</span>
                        </div>
                        <button className="mt-6 bg-white/20 hover:bg-white/30 transition shadow-sm rounded-lg px-4 py-2 text-sm font-medium backdrop-blur-sm flex items-center gap-2">
                            Recharger
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Action rapide selon le rôle */}
                {displayProfile.role === 'driver' ? (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 mb-4">
                                <QrCode size={20} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800">Mon QR Code</h3>
                            <p className="text-slate-500 text-sm mt-1">Faites scanner ce code aux passagers pour valider le trajet.</p>
                        </div>
                        <button className="mt-4 w-full bg-slate-50 hover:bg-slate-100 text-brand-600 border border-slate-200 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
                            Afficher le QR Code
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 mb-4">
                                <Car size={20} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800">Réserver un trajet</h3>
                            <p className="text-slate-500 text-sm mt-1">Trouvez un covoiturage vers ou depuis le campus.</p>
                        </div>
                        <button className="mt-4 w-full bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 shadow-sm">
                            Voir les trajets
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Historique Récent */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <History size={18} className="text-slate-400" />
                        Trajets récents
                    </h3>
                    <button className="text-sm text-brand-600 hover:text-brand-800 font-medium">Voir tout</button>
                </div>
                <div className="p-6 text-center text-slate-500 text-sm">
                    Aucun trajet récent à afficher.
                </div>
            </div>
        </div>
    );
}
