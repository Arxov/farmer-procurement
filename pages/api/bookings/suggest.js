import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth } from '../../../lib/apiAuth';

// Returns the least busy centre + date + slot combination.
// GET /api/bookings/suggest
async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const SLOT_WINDOWS = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];

    // Get all centres
    const { data: centres } = await supabaseAdmin.from('centres').select('*');
    if (!centres || centres.length === 0) return res.status(200).json({ suggestion: null });

    // Check next 3 days
    const dates = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Single query to get all relevant active bookings grouped by js below
    const { data: activeBookings, error } = await supabaseAdmin
      .from('bookings')
      .select('centre_id, slot_date, slot_window')
      .in('slot_date', dates)
      .not('status', 'eq', 'cancelled');

    if (error) throw error;

    // Build frequency map
    // map[centre_id][slot_date][slot_window] = count
    const usage = {};
    activeBookings?.forEach(b => {
      if (!usage[b.centre_id]) usage[b.centre_id] = {};
      if (!usage[b.centre_id][b.slot_date]) usage[b.centre_id][b.slot_date] = { total: 0 };
      usage[b.centre_id][b.slot_date].total++;
      usage[b.centre_id][b.slot_date][b.slot_window] = (usage[b.centre_id][b.slot_date][b.slot_window] || 0) + 1;
    });

    let bestOption = null;
    let maxRemaining = -1;

    for (const centre of centres) {
      for (const date of dates) {
        const dateUsage = usage[centre.id]?.[date] || { total: 0 };
        const remaining = centre.daily_capacity - dateUsage.total;

        if (remaining > maxRemaining) {
          // Find least busy window
          let bestWindow = SLOT_WINDOWS[0];
          let minWindowCount = Infinity;

          for (const sw of SLOT_WINDOWS) {
            const windowCount = dateUsage[sw] || 0;
            if (windowCount < minWindowCount) {
              minWindowCount = windowCount;
              bestWindow = sw;
            }
          }

          maxRemaining = remaining;
          bestOption = {
            centreId: centre.id,
            centreName: centre.name,
            district: centre.district,
            date,
            slotWindow: bestWindow,
            currentBookings: dateUsage.total,
            dailyCapacity: centre.daily_capacity,
            remainingCapacity: remaining,
          };
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
