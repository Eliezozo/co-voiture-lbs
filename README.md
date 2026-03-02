# LBS Covoiturage PWA

Application mobile-first de co-voiturage pour **Lomé Business School (LBS)**.

## Stack

- Frontend: React + Tailwind CSS
- UI Icons: lucide-react
- Auth + DB: Supabase (PostgreSQL)
- PWA: Vite + vite-plugin-pwa

## Fonctionnalités implémentées

- Authentification Supabase (inscription/connexion)
- Réinitialisation et mise à jour du mot de passe via Supabase Auth
- Restriction email LBS (`@lomebs.com`)
- Profil utilisateur avec `role` (`student`/`driver`) et `token_balance`
- Dashboard avec affichage du solde
- Conducteur: formulaire pour publier son itinéraire (ville départ, destination, zone, places, heure)
- Listing de trajets avec filtre par zone (1/2/3)
- Réservation transactionnelle:
  - vérification solde
  - création `booking` en `pending`
  - déduction de tokens
- Validation QR:
  - QR unique conducteur basé sur `profile.id`
  - scan passager via caméra (bouton `Scan to Confirm`)
  - passage `booking` en `completed`
  - crédit conducteur à 80% (commission plateforme 20%)
- PWA installable (manifest + service worker)
- Page Admin (réservée au rôle `admin`) pour visualiser utilisateurs, trajets et réservations

## Structure principale

- `src/components/Dashboard.jsx`
- `src/components/TripListing.jsx`
- `src/components/QRCodeValidator.jsx`
- `src/components/AuthPage.jsx`
- `src/context/AuthContext.jsx`
- `src/lib/supabase.js`
- `supabase/migrations/20250302_initial_schema.sql`

## Configuration locale

1. Installer les dépendances:

```bash
npm install
```

2. Créer `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

3. Appliquer la migration SQL dans Supabase:

- fichier: `supabase/migrations/20250302_initial_schema.sql`
- inclut tables, RLS, triggers, et fonctions RPC (`book_trip`, `confirm_booking_by_qr`)
- si des comptes existent déjà sans profil dans `public.profiles`, exécuter aussi:
  - `supabase/migrations/20250302_fix_profile_creation.sql`

4. Lancer en dev:

```bash
npm run dev
```

## Scripts

- `npm run dev` : mode développement
- `npm run lint` : lint ESLint
- `npm run build` : build production + génération SW PWA
- `npm run preview` : preview du build

## Schéma DB (résumé)

Note sécurité: le mot de passe n'est pas stocké dans `profiles`. Il est géré et hashé par Supabase dans `auth.users`.

- `profiles(id, email, full_name, role, token_balance)`
- `trips(id, driver_id, zone, price, seats, status, departure_city, destination, departure_time)`
- `bookings(id, trip_id, passenger_id, status)`

## Notes métier

- Tarification zones imposée en base:
  - Zone 1: 2 tokens
  - Zone 2: 4 tokens
  - Zone 3: 7 tokens
- Les opérations sensibles sont gérées côté SQL pour rester atomiques.
- Le rôle `admin` doit être attribué en base (ex: `update profiles set role='admin' where email='admin@lomebs.com';`).
