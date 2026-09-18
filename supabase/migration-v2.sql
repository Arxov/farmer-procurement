-- 1. Create Regional Crop Mapping Table
create table centre_commodities (
  id uuid primary key default uuid_generate_v4(),
  centre_id uuid references centres(id) on delete cascade not null,
  commodity_id uuid references commodities(id) on delete cascade not null,
  procurement_start_month int not null check (procurement_start_month between 1 and 12),
  procurement_end_month int not null check (procurement_end_month between 1 and 12),
  unique(centre_id, commodity_id)
);

-- 2. Add Advisory and Demand columns to commodities
alter table commodities 
add column if not exists demand_status text default 'normal' check (demand_status in ('high', 'normal', 'oversupply')),
add column if not exists market_advisory text;

-- 3. Add Performance Indexes (Tech Scalability)
create index if not exists idx_bookings_farmer_id on bookings(farmer_id);
create index if not exists idx_bookings_centre_id on bookings(centre_id);
create index if not exists idx_bookings_slot_date on bookings(slot_date);
create index if not exists idx_bookings_status on bookings(status);

-- 4. Enable RLS on centre_commodities
alter table centre_commodities enable row level security;
create policy "Anyone signed in can view centre_commodities" on centre_commodities for select using (auth.role() = 'authenticated');
