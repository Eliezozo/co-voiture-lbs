-- Incremental migration: add admin role support and admin bookings visibility

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'driver', 'admin'));

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "bookings_select_owner_or_driver" ON bookings;

CREATE POLICY "bookings_select_owner_or_driver"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    auth.uid() = passenger_id OR
    EXISTS (
      SELECT 1
      FROM trips t
      WHERE t.id = bookings.trip_id
        AND t.driver_id = auth.uid()
    )
  );
