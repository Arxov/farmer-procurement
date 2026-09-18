const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
  const centres = [
    { name: 'Sector 12 Mandi', district: 'Pune', daily_capacity: 150 },
    { name: 'Baramati Procurement Centre', district: 'Pune', daily_capacity: 100 },
    { name: 'Nashik APMC Yard', district: 'Nashik', daily_capacity: 200 }
  ];

  const commodities = [
    { name: 'Wheat', msp_rate_per_quintal: 2425, season: 'Rabi' },
    { name: 'Paddy (Common)', msp_rate_per_quintal: 2300, season: 'Kharif' },
    { name: 'Tur (Arhar)', msp_rate_per_quintal: 7550, season: 'Kharif' }
  ];

  console.log("Seeding centres...");
  const { data: cData, error: cErr } = await supabase.from('centres').insert(centres).select();
  if (cErr) console.error("Error seeding centres:", cErr);
  else console.log("Added centres:", cData.length);

  console.log("Seeding commodities...");
  const { data: comData, error: comErr } = await supabase.from('commodities').insert(commodities).select();
  if (comErr) console.error("Error seeding commodities:", comErr);
  else console.log("Added commodities:", comData.length);
}
seed();
