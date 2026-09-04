import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Creates a grievance for a booking owned by the authenticated farmer.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) return res.status(401).json({ error: 'Invalid session' });

  const { bookingId, issueType, description } = req.body;
  if (!bookingId || !issueType || !description) {
    return res.status(400).json({ error: 'Missing required fields (bookingId, issueType, description)' });
  }

  // Verify booking belongs to this farmer
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('farmer_id')
    .eq('id', bookingId)
    .single();

  if (!booking || booking.farmer_id !== userData.user.id) {
    return res.status(403).json({ error: 'You can only file grievances for your own bookings' });
  }

  const { data: grievance, error: insertError } = await supabaseAdmin
    .from('grievances')
    .insert({
      booking_id: bookingId,
      issue_type: issueType,
      description,
    })
    .select()
    .single();

  if (insertError) return res.status(500).json({ error: insertError.message });

  return res.status(200).json({ grievance });
}
