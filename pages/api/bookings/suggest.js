import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Returns the least busy centre + date + slot combination.
// GET /api/bookings/suggest?centreId=xxx&date=yyyy-mm-dd
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) return res.status(401).json({ error: 'Invalid session' });

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

  let bestOption = null;
  let maxRemaining = -1;

  for (const centre of centres) {
    for (const date of dates) {
      // Count existing bookings for this centre + date
      const { count } = await supabaseAdmin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('centre_id', centre.id)
        .eq('slot_date', date)
        .not('status', 'eq', 'cancelled');

      const remaining = centre.daily_capacity - (count || 0);

      if (remaining > maxRemaining) {
        // Find the least busy slot window
        let bestWindow = SLOT_WINDOWS[0];
        let minWindowCount = Infinity;

        for (const sw of SLOT_WINDOWS) {
          const { count: windowCount } = await supabaseAdmin
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('centre_id', centre.id)
            .eq('slot_date', date)
            .eq('slot_window', sw)
            .not('status', 'eq', 'cancelled');

          if ((windowCount || 0) < minWindowCount) {
            minWindowCount = windowCount || 0;
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
          currentBookings: count || 0,
          dailyCapacity: centre.daily_capacity,
          remainingCapacity: remaining,
        };
      }
    }
  }

  return res.status(200).json({ suggestion: bestOption });
}
