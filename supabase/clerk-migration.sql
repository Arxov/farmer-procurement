-- Migration script for Clerk Authentication integration
-- Drops the Supabase auth.users constraint and changes ID columns to text to support Clerk user IDs (e.g., 'user_2...')

BEGIN;

-- 1. Drop foreign key constraints that depend on profiles.id
ALTER TABLE bookings DROP CONSTRAINT bookings_farmer_id_fkey;
ALTER TABLE queue_entries DROP CONSTRAINT queue_entries_booking_id_fkey;
ALTER TABLE gate_passes DROP CONSTRAINT gate_passes_booking_id_fkey;
ALTER TABLE payments DROP CONSTRAINT payments_booking_id_fkey;
ALTER TABLE grievances DROP CONSTRAINT grievances_booking_id_fkey;

-- We actually only need to change `profiles.id` and `bookings.farmer_id` because `bookings.id` remains a UUID, 
-- but let's drop the auth.users constraint first.
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;

-- 2. Alter the data types of the ID columns
ALTER TABLE profiles ALTER COLUMN id TYPE text;
ALTER TABLE bookings ALTER COLUMN farmer_id TYPE text;

-- 3. Re-add the foreign key constraint between bookings and profiles
ALTER TABLE bookings ADD CONSTRAINT bookings_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES profiles(id);

-- 4. Re-add the other foreign key constraints (they reference bookings.id which is still a UUID)
ALTER TABLE queue_entries ADD CONSTRAINT queue_entries_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id);
ALTER TABLE gate_passes ADD CONSTRAINT gate_passes_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id);
ALTER TABLE payments ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id);
ALTER TABLE grievances ADD CONSTRAINT grievances_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id);

COMMIT;
