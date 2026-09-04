-- Sample data so the booking form has something to show immediately.
-- Run this AFTER schema.sql, in the Supabase SQL editor.

insert into centres (name, district, daily_capacity) values
  ('Sector 12 Mandi', 'Pune', 150),
  ('Baramati Procurement Centre', 'Pune', 100),
  ('Nashik APMC Yard', 'Nashik', 200);

insert into commodities (name, msp_rate_per_quintal, season) values
  ('Wheat', 2425, 'Rabi'),
  ('Paddy (Common)', 2300, 'Kharif'),
  ('Tur (Arhar)', 7550, 'Kharif');

-- Note: officer/admin accounts should be created by first signing up normally,
-- then manually updating their role in the `profiles` table, e.g.:
-- update profiles set role = 'officer' where phone = '+91XXXXXXXXXX';
