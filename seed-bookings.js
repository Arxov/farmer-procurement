const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seedBookings() {
  console.log('Fetching reference data...');
  const { data: centres } = await supabase.from('centres').select('id, name');
  const { data: commodities } = await supabase.from('commodities').select('id, name');
  const { data: farmers } = await supabase.from('profiles').select('id').eq('role', 'farmer').limit(10);
  
  if (!centres.length || !commodities.length || !farmers.length) {
    console.error('Missing required reference data');
    return;
  }

  const statuses = ['booked', 'checked_in', 'weighed', 'quality_checked', 'accepted', 'rejected', 'paid', 'cancelled'];
  const newBookings = [];
  
  const today = new Date();
  
  for (let i = 0; i < 200; i++) {
    const centre = centres[Math.floor(Math.random() * centres.length)];
    const commodity = commodities[Math.floor(Math.random() * commodities.length)];
    const farmer = farmers[Math.floor(Math.random() * farmers.length)];
    
    // Distribute dates: 70% past (last 30 days), 30% future (next 7 days)
    const isPast = Math.random() < 0.7;
    const dateOffset = isPast ? -Math.floor(Math.random() * 30) : Math.floor(Math.random() * 7);
    
    const slotDate = new Date(today);
    slotDate.setDate(slotDate.getDate() + dateOffset);
    
    // Status logic based on time
    let status;
    if (!isPast) {
      status = Math.random() < 0.9 ? 'booked' : 'cancelled';
    } else {
      const pastStatuses = ['accepted', 'paid', 'paid', 'paid', 'rejected', 'cancelled'];
      status = pastStatuses[Math.floor(Math.random() * pastStatuses.length)];
    }
    
    // Random quantities and quality specs
    const expQty = Math.floor(Math.random() * 40) + 10;
    const actQty = status !== 'booked' && status !== 'cancelled' ? expQty * (0.95 + Math.random() * 0.05) : null;
    
    let moisture = null;
    let admixture = null;
    let reason = null;
    
    if (['quality_checked', 'accepted', 'paid', 'rejected'].includes(status)) {
      if (status === 'rejected') {
        moisture = 14 + Math.random() * 5; // high moisture
        admixture = 2 + Math.random() * 4; // high admixture
        reason = Math.random() > 0.5 ? 'EXCESS_MOISTURE' : 'POOR_QUALITY';
      } else {
        moisture = 10 + Math.random() * 4; // acceptable
        admixture = Math.random() * 2;
      }
    }
    
    newBookings.push({
      farmer_id: farmer.id,
      centre_id: centre.id,
      commodity_id: commodity.id,
      slot_date: slotDate.toISOString().split('T')[0],
      slot_window: ['09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00'][Math.floor(Math.random()*4)],
      status: status,
      expected_quantity_quintals: expQty,
      actual_weight_quintals: actQty ? parseFloat(actQty.toFixed(2)) : null,
      accepted_quantity_quintals: status === 'accepted' || status === 'paid' ? parseFloat(actQty.toFixed(2)) : null,
      moisture_percent: moisture ? parseFloat(moisture.toFixed(1)) : null,
      admixture_percent: admixture ? parseFloat(admixture.toFixed(1)) : null,
      rejection_reason: reason,
      quality_grade: status === 'accepted' || status === 'paid' ? (Math.random() > 0.3 ? 'Grade A' : 'FAQ') : null
    });
  }

  console.log(`Inserting ${newBookings.length} mock bookings...`);
  const { error } = await supabase.from('bookings').insert(newBookings);
  
  if (error) {
    console.error('Error inserting bookings:', error);
  } else {
    console.log('✅ Successfully seeded mock bookings!');
  }
}

seedBookings();
