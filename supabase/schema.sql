-- SIH26032 Farmer Procurement Platform - Database Schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)

create extension if not exists "uuid-ossp";

-- Profiles extend Supabase's built-in auth.users
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text unique,
  role text check (role in ('farmer','officer','admin')) not null default 'farmer',
  land_holding_acres numeric,
  village text,
  created_at timestamptz default now()
);

create table centres (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  district text,
  state text default 'Maharashtra',
  daily_capacity int not null default 100,
  created_at timestamptz default now()
);

create table commodities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  msp_rate_per_quintal numeric not null,
  season text,
  created_at timestamptz default now()
);

create table bookings (
  id uuid primary key default uuid_generate_v4(),
  farmer_id uuid references profiles(id) not null,
  centre_id uuid references centres(id) not null,
  commodity_id uuid references commodities(id) not null,
  slot_date date not null,
  slot_window text not null,
  expected_quantity_quintals numeric,
  actual_weight_quintals numeric,
  quality_grade text,
  quality_notes text,
  accepted_quantity_quintals numeric,
  status text check (status in (
    'booked','checked_in','weighed','quality_checked','accepted','rejected','paid','cancelled'
  )) not null default 'booked',
  created_at timestamptz default now()
);

create table queue_entries (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings(id) not null,
  check_in_time timestamptz,
  queue_position int,
  estimated_wait_minutes int,
  served_at timestamptz,
  created_at timestamptz default now()
);

create table gate_passes (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings(id) not null,
  vehicle_number text,
  qr_code text,
  issued_at timestamptz default now()
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings(id) not null,
  accepted_quantity_quintals numeric,
  amount numeric,
  utr_reference text,
  status text check (status in ('pending','initiated','paid','failed')) default 'pending',
  paid_at timestamptz
);

create table grievances (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings(id) not null,
  issue_type text,
  description text,
  status text check (status in ('open','in_review','resolved')) default 'open',
  created_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table bookings enable row level security;
alter table queue_entries enable row level security;
alter table payments enable row level security;
alter table grievances enable row level security;
alter table gate_passes enable row level security;
alter table centres enable row level security;
alter table commodities enable row level security;

create policy "Anyone signed in can view centres" on centres for select using (auth.role() = 'authenticated');
create policy "Anyone signed in can view commodities" on commodities for select using (auth.role() = 'authenticated');

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Farmers view own bookings" on bookings for select using (auth.uid() = farmer_id);
create policy "Farmers create own bookings" on bookings for insert with check (auth.uid() = farmer_id);
create policy "Staff view all bookings" on bookings for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('officer','admin'))
);
create policy "Staff update all bookings" on bookings for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('officer','admin'))
);

create policy "View own queue entries" on queue_entries for select using (
  exists (select 1 from bookings b where b.id = booking_id and (b.farmer_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('officer','admin'))))
);
create policy "Staff manage queue entries" on queue_entries for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('officer','admin'))
);

create policy "View own payments" on payments for select using (
  exists (select 1 from bookings b where b.id = booking_id and (b.farmer_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('officer','admin'))))
);
create policy "Staff manage payments" on payments for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('officer','admin'))
);

create policy "View own gate passes" on gate_passes for select using (
  exists (select 1 from bookings b where b.id = booking_id and (b.farmer_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('officer','admin'))))
);
create policy "Staff manage gate passes" on gate_passes for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('officer','admin'))
);

create policy "View own grievances" on grievances for select using (
  exists (select 1 from bookings b where b.id = booking_id and (b.farmer_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('officer','admin'))))
);
create policy "Farmers create grievances" on grievances for insert with check (
  exists (select 1 from bookings b where b.id = booking_id and b.farmer_id = auth.uid())
);
create policy "Staff manage grievances" on grievances for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('officer','admin'))
);

-- Prevent duplicate bookings for the same farmer, centre, date, and slot window
-- (cancelled bookings are excluded via a partial index)
create unique index unique_farmer_slot
  on bookings (farmer_id, centre_id, slot_date, slot_window)
  where status != 'cancelled';

-- Live queue position: counts earlier not-yet-served bookings at the same centre & date
create or replace function get_queue_position(p_booking_id uuid)
returns int as $$
  select count(*)::int
  from bookings b
  where b.centre_id = (select centre_id from bookings where id = p_booking_id)
    and b.slot_date = (select slot_date from bookings where id = p_booking_id)
    and b.status in ('booked','checked_in')
    and b.created_at <= (select created_at from bookings where id = p_booking_id);
$$ language sql stable;
