-- LBS Carpooling PWA schema
-- Run in Supabase SQL editor or via migration tooling.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'driver')),
  token_balance INTEGER NOT NULL DEFAULT 0 CHECK (token_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  departure_city TEXT NOT NULL,
  destination TEXT NOT NULL,
  zone INTEGER NOT NULL CHECK (zone IN (1, 2, 3)),
  price INTEGER NOT NULL CHECK (price > 0),
  seats INTEGER NOT NULL CHECK (seats >= 0),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  departure_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, passenger_id)
);

CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_zone_status ON trips(zone, status);
CREATE INDEX idx_bookings_trip ON bookings(trip_id);
CREATE INDEX idx_bookings_passenger_status ON bookings(passenger_id, status);

CREATE OR REPLACE FUNCTION public.zone_price(p_zone INTEGER)
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

  RAISE EXCEPTION 'Unknown zone: %', p_zone;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_trip_price_from_zone()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.price := public.zone_price(NEW.zone);
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_trip_price_before_write
BEFORE INSERT OR UPDATE OF zone
ON trips
FOR EACH ROW
EXECUTE FUNCTION public.set_trip_price_from_zone();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'role', 'student') = 'driver' THEN 'driver'
      ELSE 'student'
    END
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

CREATE OR REPLACE FUNCTION public.book_trip(p_trip_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_trip trips%ROWTYPE;
  v_balance INTEGER;
  v_booking_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_trip
  FROM trips
  WHERE id = p_trip_id
    AND status = 'scheduled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip unavailable';
  END IF;

  IF v_trip.driver_id = v_user_id THEN
    RAISE EXCEPTION 'Driver cannot book own trip';
  END IF;

  IF v_trip.seats <= 0 THEN
    RAISE EXCEPTION 'No seat available';
  END IF;

  SELECT token_balance INTO v_balance
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Passenger profile not found';
  END IF;

  IF v_balance < v_trip.price THEN
    RAISE EXCEPTION 'Insufficient token balance';
  END IF;

  INSERT INTO bookings (trip_id, passenger_id, status)
  VALUES (p_trip_id, v_user_id, 'pending')
  RETURNING id INTO v_booking_id;

  UPDATE profiles
  SET token_balance = token_balance - v_trip.price
  WHERE id = v_user_id;

  UPDATE trips
  SET seats = seats - 1
  WHERE id = p_trip_id;

  RETURN v_booking_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Booking already exists for this trip';
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_booking_by_qr(
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
  v_trip_id UUID;
  v_driver_id UUID;
  v_price INTEGER;
  v_credit INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT b.trip_id, t.driver_id, t.price
    INTO v_trip_id, v_driver_id, v_price
  FROM bookings b
  JOIN trips t ON t.id = b.trip_id
  WHERE b.id = p_booking_id
    AND b.passenger_id = v_user_id
    AND b.status = 'pending'
  FOR UPDATE OF b;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending booking not found';
  END IF;

  IF v_driver_id <> p_scanned_driver_id THEN
    RAISE EXCEPTION 'QR does not match trip driver';
  END IF;

  UPDATE bookings
  SET status = 'completed'
  WHERE id = p_booking_id;

  v_credit := FLOOR(v_price * 0.8);

  UPDATE profiles
  SET token_balance = token_balance + v_credit
  WHERE id = v_driver_id;
END;
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_self"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "trips_select_authenticated"
  ON trips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "trips_insert_by_driver"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "trips_update_owner"
  ON trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "bookings_select_owner_or_driver"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = passenger_id OR
    EXISTS (
      SELECT 1
      FROM trips t
      WHERE t.id = bookings.trip_id
        AND t.driver_id = auth.uid()
    )
  );

CREATE POLICY "bookings_insert_self"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = passenger_id);

GRANT EXECUTE ON FUNCTION public.book_trip(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking_by_qr(UUID, UUID) TO authenticated;
