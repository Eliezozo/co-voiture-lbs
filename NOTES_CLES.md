# Notes Clés - Version alignée au prompt

## Stack
- React + Vite + Tailwind + Lucide-react
- Supabase Auth + PostgreSQL
- Navigation: react-router-dom
- QR: qrcode.react (génération) + html5-qrcode (scan)

## Routes
- `/login`
- `/`
- `/publier`
- `/profil`
- `/admin`

## Rôles
- `passager`
- `conducteur`
- `admin`

## Tables (script unique)
- `profiles(id, full_name, email, mot_de_passe, role, token_balance)`
- `trips(id, driver_id, departure_point, destination, zone, price_tokens, departure_time, seats_available, status)`
- `bookings(id, trip_id, passenger_id, status)`

## Logique métier sécurisée
- Prix automatique par zone via trigger SQL:
  - zone 1 => 2
  - zone 2 => 4
  - zone 3 => 7
- Réservation via RPC `book_trip_secure`:
  - vérifie solde passager
  - crée booking `en_attente`
  - débite immédiatement le passager
- Validation QR via RPC `validate_booking_scan`:
  - vérifie `driver_id`
  - met booking à `valide`
  - crédite le conducteur

## SQL unique
- `supabase/migrations/20250302_full_schema.sql`
- migration incrémentale admin: `supabase/migrations/20260305_enable_admin_panel.sql`
