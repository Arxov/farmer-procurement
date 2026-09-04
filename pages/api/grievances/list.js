import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// GET: Returns all grievances for the authenticated farmer's bookings.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) return res.status(401).json({ error: 'Invalid session' });

  // Get farmer's booking IDs
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('farmer_id', userData.user.id);

  const bookingIds = (bookings || []).map(b => b.id);
  if (bookingIds.length === 0) return res.status(200).json({ grievances: [] });

  // Get grievances for those bookings
  const { data: grievances, error: fetchError } = await supabaseAdmin
    .from('grievances')
    .select('id, booking_id, issue_type, description, status, created_at, bookings(slot_date, centres(name))')
    .in('booking_id', bookingIds)
    .order('created_at', { ascending: false });

  if (fetchError) return res.status(500).json({ error: fetchError.message });

  // Flatten for easier frontend use
  const formatted = (grievances || []).map(g => ({
    id: g.id,
    booking_id: g.booking_id,
    issue_type: g.issue_type,
    description: g.description,
    status: g.status,
    created_at: g.created_at,
    slot_date: g.bookings?.slot_date,
    centre_name: g.bookings?.centres?.name,
  }));

  return res.status(200).json({ grievances: formatted });
}
