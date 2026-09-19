import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth } from '../../../lib/apiAuth';

// Returns the least busy centre + date + slot combination.
// GET /api/bookings/suggest
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; 
  const dLat = (lat2-lat1) * (Math.PI/180);
  const dLon = (lon2-lon1) * (Math.PI/180); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

// GET /api/bookings/suggest?lat=...&lng=...&commodityId=...&qty=...
async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const { lat, lng, commodityId, qty } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const quantity = parseFloat(qty) || 50; // Default 50 quintals if not provided
    const TRANSPORT_RATE_PER_KM_PER_QUINTAL = 10; // ₹10 per km per quintal

    const SLOT_WINDOWS = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];

    // Get all centres and their local bonuses
    const { data: centres } = await supabaseAdmin
      .from('centres')
      .select('*, centre_commodities(commodity_id, local_bonus_per_quintal)');

    if (!centres || centres.length === 0) return res.status(200).json({ suggestion: null });

    // Check next 3 days
    const dates = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      dates.push(d.toISOString().split('T')[0]);
    }

    const { data: activeBookings, error } = await supabaseAdmin
      .from('bookings')
      .select('centre_id, slot_date, slot_window')
      .in('slot_date', dates)
      .not('status', 'eq', 'cancelled');

    if (error) throw error;

    const usage = {};
    activeBookings?.forEach(b => {
      if (!usage[b.centre_id]) usage[b.centre_id] = {};
      if (!usage[b.centre_id][b.slot_date]) usage[b.centre_id][b.slot_date] = { total: 0 };
      usage[b.centre_id][b.slot_date].total++;
      usage[b.centre_id][b.slot_date][b.slot_window] = (usage[b.centre_id][b.slot_date][b.slot_window] || 0) + 1;
    });

    let bestOption = null;
    let bestScore = -Infinity;

    for (const centre of centres) {
      // Calculate distance
      const distance = getDistanceFromLatLonInKm(userLat, userLng, centre.latitude, centre.longitude);
      
      // Calculate financial benefit if commodity is provided
      let localBonus = 0;
      if (commodityId) {
        const cc = centre.centre_commodities?.find(c => c.commodity_id === commodityId);
        if (cc && cc.local_bonus_per_quintal) {
          localBonus = parseFloat(cc.local_bonus_per_quintal);
        }
      }

      let financialScore = 0;
      let transportCost = 0;
      if (distance !== null) {
        transportCost = distance * TRANSPORT_RATE_PER_KM_PER_QUINTAL * quantity;
        const totalBonus = localBonus * quantity;
        financialScore = totalBonus - transportCost; // Net benefit
      } else {
        // If no GPS, fallback to just rewarding local bonuses and penalizing heavily busy centres
        financialScore = (localBonus * quantity); 
      }

      for (const date of dates) {
        const dateUsage = usage[centre.id]?.[date] || { total: 0 };
        const remaining = centre.daily_capacity - dateUsage.total;

        if (remaining > 0) {
          // Find least busy window
          let bestWindow = SLOT_WINDOWS[0];
          let minWindowCount = Infinity;
          const windowCapacity = Math.ceil(centre.daily_capacity / SLOT_WINDOWS.length);
          for (const sw of SLOT_WINDOWS) {
            const windowCount = dateUsage[sw] || 0;
            if (windowCount < windowCapacity && windowCount < minWindowCount) {
              minWindowCount = windowCount;
              bestWindow = sw;
            }
          }
          
          if (minWindowCount === Infinity) continue; // All windows full despite total capacity appearing open

          // Combine financial score with capacity availability (so we don't send to a full centre)
          // Weight: 1 remaining spot = +50 score (to break financial ties)
          const totalScore = financialScore + (remaining * 50);

          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestOption = {
              centreId: centre.id,
              centreName: centre.name,
              district: centre.district,
              date,
              slotWindow: bestWindow,
              currentBookings: dateUsage.total,
              dailyCapacity: centre.daily_capacity,
              remainingCapacity: remaining,
              distanceKm: distance ? Math.round(distance * 10) / 10 : null,
              localBonus: localBonus,
              transportCost: Math.round(transportCost),
              netBenefit: Math.round(financialScore)
            };
          }
        }
      }
    }

    return res.status(200).json({ suggestion: bestOption });
  } catch (err) {
    console.error('Suggest API error:', err);
    return res.status(500).json({ error: 'Failed to generate suggestion' });
  }
}

export default withAuth(handler);
