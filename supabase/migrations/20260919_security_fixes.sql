-- 1. FIX: Profiles Table RLS Vulnerability
-- Prevent users from updating their own role to 'admin' or 'officer'
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own non-role fields"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  -- Cannot change role during update
  -- We don't have column-level UPDATE policies in basic Supabase UI without triggers,
  -- but we can restrict updates by checking if the role changed, or we can use a trigger.
);

-- Actually, a trigger is safer for column restriction, or revoking update on role.
REVOKE UPDATE (role) ON profiles FROM authenticated;
REVOKE UPDATE (role) ON profiles FROM anon;
GRANT UPDATE (role) ON profiles TO service_role;

-- Recreate a safe update policy for the rest of the columns
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- 2. FIX: RPC Public Exposure
-- book_slot_atomic and recalculate_queue_for_date are publicly callable.
REVOKE EXECUTE ON FUNCTION book_slot_atomic(uuid, uuid, uuid, date, text, decimal, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION book_slot_atomic(uuid, uuid, uuid, date, text, decimal, boolean) TO service_role;
ALTER FUNCTION book_slot_atomic(uuid, uuid, uuid, date, text, decimal, boolean) SET search_path = public;

REVOKE EXECUTE ON FUNCTION recalculate_queue_for_date(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION recalculate_queue_for_date(uuid, date) TO service_role;
ALTER FUNCTION recalculate_queue_for_date(uuid, date) SET search_path = public;

-- 3. FIX: Drop the unsafe insert policy on bookings
DROP POLICY IF EXISTS "Farmers create own bookings" ON bookings;

-- The backend API (service_role) will handle inserting bookings safely via the RPC.
