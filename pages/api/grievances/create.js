import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth } from '../../../lib/apiAuth';
import { CreateGrievanceSchema, validateBody } from '../../../lib/validations';

// Creates a grievance for a booking owned by the authenticated farmer.
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const validation = validateBody(CreateGrievanceSchema, req.body);
  if (validation.success === false) {
    return res.status(400).json({ error: validation.error });
  }

  const { bookingId, issueType, description } = validation.data;

  // Verify booking belongs to this farmer
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('farmer_id')
    .eq('id', bookingId)
    .single();

  if (!booking || booking.farmer_id !== req.user.id) {
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

export default withAuth(handler, { roles: ['farmer'] });
