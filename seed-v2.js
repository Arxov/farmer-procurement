require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedV2() {
  console.log('Fetching centres and commodities...');
  const { data: centres } = await supabase.from('centres').select('id, name');
  const { data: commodities } = await supabase.from('commodities').select('id, name');

  if (!centres || !commodities) {
    console.error('Missing centres or commodities data. Please seed v1 first.');
    return;
  }

  // 1. Update Commodities with Advisories
  console.log('Adding market advisories to commodities...');
  
  for (let c of commodities) {
    let update = {};
    if (c.name.toLowerCase().includes('wheat')) {
      update = { demand_status: 'oversupply', market_advisory: 'Oversupply in market. Expect longer queues and strict moisture checks.' };
    } else if (c.name.toLowerCase().includes('paddy')) {
      update = { demand_status: 'normal', market_advisory: 'Normal demand. Maintain moisture below 14%.' };
    } else if (c.name.toLowerCase().includes('soya')) {
      update = { demand_status: 'high', market_advisory: 'High demand! Open market prices are surging. Ensure no foreign matter.' };
    } else if (c.name.toLowerCase().includes('cotton')) {
      update = { demand_status: 'high', market_advisory: 'High demand for long staple cotton.' };
    } else {
      update = { demand_status: 'normal', market_advisory: null };
    }
    
    await supabase.from('commodities').update(update).eq('id', c.id);
  }

  // 2. Seed Centre-Commodities Mapping
  console.log('Mapping commodities to centres...');
  const mappings = [];
  
  for (let centre of centres) {
    for (let commodity of commodities) {
      // Randomly assign 2-3 commodities to each centre
      if (Math.random() > 0.4) {
        mappings.push({
          centre_id: centre.id,
          commodity_id: commodity.id,
          procurement_start_month: 3, // March
          procurement_end_month: 6 // June
        });
      }
    }
  }

  // Upsert mappings
  const { error } = await supabase
    .from('centre_commodities')
    .upsert(mappings, { onConflict: 'centre_id,commodity_id', ignoreDuplicates: true });

  if (error) {
    console.error('Error seeding centre_commodities:', error);
  } else {
    console.log(`Seeded ${mappings.length} regional mappings successfully!`);
  }

  console.log('V2 Seeding Complete!');
}

seedV2();
