-- LBS Carpooling PWA - Prompt Aligned Single SQL File
-- WARNING: resets project tables

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT UNIQUE NOT NULL,
  mot_de_passe TEXT,
  role TEXT NOT NULL DEFAULT 'passager' CHECK (role IN ('passager', 'conducteur')),
  token_balance INTEGER NOT NULL DEFAULT 0 CHECK (token_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  departure_point TEXT NOT NULL,
  destination TEXT NOT NULL DEFAULT 'LBS',
  zone INTEGER NOT NULL CHECK (zone IN (1,2,3)),
  price_tokens INTEGER NOT NULL CHECK (price_tokens > 0),
  departure_time TIMESTAMPTZ NOT NULL,
  seats_available INTEGER NOT NULL CHECK (seats_available >= 0),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'valide')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, passenger_id)
);

CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_zone_status ON trips(zone, status);
CREATE INDEX idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX idx_bookings_passenger_id ON bookings(passenger_id);

CREATE OR REPLACE FUNCTION public.zone_price_tokens(p_zone INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_zone = 1 THEN
    RETURN 2;
  ELSIF p_zone = 2 THEN
    RETURN 4;
  ELSIF p_zone = 3 THEN
    RETURN 7;
  END IF;

  RAISE EXCEPTION 'Zone inconnue: %', p_zone;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_trip_price_tokens()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.price_tokens := public.zone_price_tokens(NEW.zone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_trip_price_tokens ON trips;
CREATE TRIGGER trg_apply_trip_price_tokens
BEFORE INSERT OR UPDATE OF zone
ON trips
FOR EACH ROW
EXECUTE FUNCTION public.apply_trip_price_tokens();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    CASE WHEN COALESCE(NEW.raw_user_meta_data ->> 'role', 'passager') = 'conducteur' THEN 'conducteur' ELSE 'passager' END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.book_trip_secure(p_trip_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_trip RECORD;
  v_booking_id UUID;
  v_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT role, token_balance INTO v_user_role, v_balance
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil passager introuvable';
  END IF;

  IF v_user_role <> 'passager' THEN
    RAISE EXCEPTION 'Seuls les passagers peuvent réserver';
  END IF;

  SELECT id, driver_id, price_tokens, seats_available, status
  INTO v_trip
  FROM trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND OR v_trip.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Trajet indisponible';
  END IF;

  IF v_trip.driver_id = v_user_id THEN
    RAISE EXCEPTION 'Le conducteur ne peut pas réserver son propre trajet';
  END IF;

  IF v_trip.seats_available <= 0 THEN
    RAISE EXCEPTION 'Plus de places disponibles';
  END IF;

  IF v_balance < v_trip.price_tokens THEN
    RAISE EXCEPTION 'Solde insuffisant, contactez l''admin pour recharger';
  END IF;

  INSERT INTO bookings (trip_id, passenger_id, status)
  VALUES (p_trip_id, v_user_id, 'en_attente')
  RETURNING id INTO v_booking_id;

  UPDATE profiles
  SET token_balance = token_balance - v_trip.price_tokens
  WHERE id = v_user_id;

  UPDATE trips
  SET seats_available = seats_available - 1
  WHERE id = p_trip_id;

  RETURN v_booking_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Réservation déjà existante pour ce trajet';
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_booking_scan(
  p_booking_id UUID,
  p_scanned_driver_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_booking RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT b.id, b.passenger_id, b.status, t.driver_id, t.price_tokens
  INTO v_booking
  FROM bookings b
  JOIN trips t ON t.id = b.trip_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réservation introuvable';
  END IF;

  IF v_booking.passenger_id <> v_user_id THEN
    RAISE EXCEPTION 'Action interdite';
  END IF;

  IF v_booking.status <> 'en_attente' THEN
    RAISE EXCEPTION 'Réservation déjà validée';
  END IF;

  IF v_booking.driver_id <> p_scanned_driver_id THEN
    RAISE EXCEPTION 'Le QR code ne correspond pas au conducteur du trajet';
  END IF;

  UPDATE bookings
  SET status = 'valide'
  WHERE id = p_booking_id;

  UPDATE profiles
  SET token_balance = token_balance + v_booking.price_tokens
  WHERE id = v_booking.driver_id;
END;
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_authenticated ON profiles;
DROP POLICY IF EXISTS profiles_insert_self ON profiles;
DROP POLICY IF EXISTS profiles_update_self ON profiles;
DROP POLICY IF EXISTS trips_select_authenticated ON trips;
DROP POLICY IF EXISTS trips_insert_driver_only ON trips;
DROP POLICY IF EXISTS trips_update_driver_only ON trips;
DROP POLICY IF EXISTS bookings_select_own_or_driver ON bookings;
DROP POLICY IF EXISTS bookings_insert_self ON bookings;

CREATE POLICY profiles_select_authenticated
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY profiles_insert_self
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_self
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY trips_select_authenticated
  ON trips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY trips_insert_driver_only
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = driver_id
    AND EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'conducteur'
    )
  );

CREATE POLICY trips_update_driver_only
  ON trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY bookings_select_own_or_driver
  ON bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = passenger_id
    OR EXISTS (
      SELECT 1
      FROM trips t
      WHERE t.id = bookings.trip_id
        AND t.driver_id = auth.uid()
    )
  );

CREATE POLICY bookings_insert_self
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = passenger_id);

GRANT EXECUTE ON FUNCTION public.book_trip_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_booking_scan(UUID, UUID) TO authenticated;

-- Backfill existing users to profiles
INSERT INTO public.profiles (id, full_name, email, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'full_name', ''),
  u.email,
  CASE WHEN COALESCE(u.raw_user_meta_data ->> 'role', 'passager') = 'conducteur' THEN 'conducteur' ELSE 'passager' END
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
