import { NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { withAuth, AuthenticatedNextApiRequest } from '../../../../lib/apiAuth';

async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { id, dates } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid centre ID' });
  
  if (!dates || typeof dates !== 'string') {
    return res.status(400).json({ error: 'Missing dates query parameter' });
  }

  const dateList = dates.split(',');

  const { data: centre } = await supabaseAdmin
    .from('centres')
    .select('daily_capacity')
    .eq('id', id)
    .single();

  if (!centre) return res.status(404).json({ error: 'Centre not found' });
  const capacity = centre.daily_capacity || 100;

  const { data: bookingsData, error } = await supabaseAdmin
    .from('bookings')
    .select('slot_date')
    .eq('centre_id', id)
    .in('slot_date', dateList)
    .neq('status', 'cancelled');

  if (error) return res.status(500).json({ error: error.message });

  const countMap: Record<string, number> = {};
  (bookingsData || []).forEach(b => {
    countMap[b.slot_date] = (countMap[b.slot_date] || 0) + 1;
  });

  const list = dateList.map(dStr => {
    const booked = countMap[dStr] || 0;
    const available = Math.max(0, capacity - booked);
    const percent = Math.min(100, Math.round((booked / capacity) * 100));
    return {
      date: dStr,
      booked,
      capacity,
      available,
      percent,
    };
  });

  return res.status(200).json({ availability: list });
}

export default withAuth(handler);
