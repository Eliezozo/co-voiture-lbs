# LBS Covoiturage PWA

PWA mobile-first de covoiturage pour Lomé Business School (LBS).

## Stack imposée
- React.js (Vite)
- Tailwind CSS
- Lucide-react
- Supabase (Auth + PostgreSQL)
- React-router-dom
- QR: `qrcode.react` (génération) + `html5-qrcode` (scan)

## Routes
- `/login` : authentification Supabase
- `/` : dashboard (solde + trajets + filtre zone)
- `/publier` : publication de trajet (conducteur)
- `/profil` : historique + QR code / scanner validation
- `/admin` : gestion des utilisateurs (rôle + jetons), réservé au rôle `admin`

## Fichiers livrables
- `src/lib/supabaseClient.js`
- `src/App.jsx`
- `supabase/migrations/20250302_full_schema.sql`

## Configuration
1. Installer:
```bash
npm install
```
2. `.env.local`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```
3. Exécuter SQL unique dans Supabase SQL Editor:
- `supabase/migrations/20250302_full_schema.sql`
- si la base est déjà en place sans rôle admin: `supabase/migrations/20260305_enable_admin_panel.sql`

## Logique métier implémentée
- Zone 1 => 2 jetons
- Zone 2 => 4 jetons
- Zone 3 => 7 jetons
- Prix auto en base via trigger
- Réservation sécurisée via RPC `book_trip_secure`
  - vérifie solde
  - crée booking `en_attente`
  - débite passager immédiatement
- Validation scan QR via RPC `validate_booking_scan`
  - vérifie `driver_id`
  - passe booking à `valide`
  - crédite conducteur
