# Notes Clés - LBS Covoiturage

## 1) Auth et profils

- Seuls les emails LBS sont autorisés.
- À la création de compte, un trigger SQL crée automatiquement la ligne `profiles`.
- Le profil stocke:
  - `role`: `student` ou `driver`
  - `token_balance`: solde des tokens

## 2) Réservation

- La réservation ne se fait pas côté client en plusieurs requêtes séparées.
- La fonction SQL `book_trip(p_trip_id uuid)` exécute la transaction de bout en bout:
  - lock du trajet
  - vérification des places
  - vérification du solde passager
  - création booking `pending`
  - déduction tokens passager
  - décrément du nombre de places

## 3) Validation QR et commission

- Le QR conducteur contient son `profile.id`.
- Le passager scanne et appelle `confirm_booking_by_qr(p_booking_id, p_scanned_driver_id)`.
- La fonction SQL:
  - vérifie la correspondance conducteur/trajet
  - passe le booking en `completed`
  - crédite le conducteur à 80% du prix
  - conserve 20% de commission plateforme

## 4) RLS

- RLS activé sur `profiles`, `trips`, `bookings`.
- Les policies limitent lecture/écriture par rôle et ownership.
- Les RPC sont `SECURITY DEFINER` + `GRANT EXECUTE` pour `authenticated`.

## 5) PWA

- Manifest généré par `vite-plugin-pwa`.
- Service worker généré en build (`generateSW`).
- Application installable sur mobile.

## 6) Composants demandés

- Dashboard complet: `src/components/Dashboard.jsx`
- Trip Listing complet: `src/components/TripListing.jsx`
- Client Supabase: `src/lib/supabase.js`
