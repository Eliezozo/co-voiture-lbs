-- Migration script for LBS Carpooling PWA

-- Drop existing tables to avoid conflict if rerun
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS profiles;

-- Create profiles table linked to Supabase Auth
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('student', 'driver')) NOT NULL DEFAULT 'student',
  token_balance INTEGER NOT NULL DEFAULT 0
);

-- Create trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  departure_city TEXT NOT NULL,
  destination TEXT NOT NULL,
  zone INTEGER NOT NULL CHECK (zone IN (1, 2, 3)),
  price INTEGER NOT NULL, -- Zone 1: 2 tokens, Zone 2: 4 tokens, Zone 3: 7 tokens
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  seats_available INTEGER NOT NULL CHECK (seats_available >= 0),
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Basic indexes (optional but recommended)
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX idx_bookings_passenger_id ON bookings(passenger_id);

-- Optional: Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be added here depending on precise app requirements.
-- For example, allowing public read of trips, but only drivers can create them.
CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING ( auth.uid() = id );

CREATE POLICY "Trips are viewable by everyone."
  ON trips FOR SELECT
  USING ( true );

CREATE POLICY "Drivers can insert their own trips."
  ON trips FOR INSERT
  WITH CHECK ( auth.uid() = driver_id );

CREATE POLICY "Drivers can update their own trips."
  ON trips FOR UPDATE
  USING ( auth.uid() = driver_id );

CREATE POLICY "Users can view their own bookings."
  ON bookings FOR SELECT
  USING ( auth.uid() = passenger_id );

CREATE POLICY "Passengers can insert their own bookings."
  ON bookings FOR INSERT
  WITH CHECK ( auth.uid() = passenger_id );
