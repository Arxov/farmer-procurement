import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Creates a gate pass for an accepted booking.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) return res.status(401).json({ error: 'Invalid session' });

  const { bookingId, vehicleNumber } = req.body;
  if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });

  // Verify booking exists and belongs to this farmer
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*, centres(name), commodities(name)')
    .eq('id', bookingId)
    .single();

  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Check if gate pass already exists
  const { data: existing } = await supabaseAdmin
    .from('gate_passes')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (existing) return res.status(400).json({ error: 'Gate pass already issued for this booking' });

  const qrData = JSON.stringify({
    booking_id: bookingId,
    farmer_id: booking.farmer_id,
    centre: booking.centres?.name,
    commodity: booking.commodities?.name,
    slot_date: booking.slot_date,
    slot_window: booking.slot_window,
    vehicle_number: vehicleNumber || '',
    issued_at: new Date().toISOString(),
  });

  const { data: gatePass, error: insertError } = await supabaseAdmin
    .from('gate_passes')
    .insert({
      booking_id: bookingId,
      vehicle_number: vehicleNumber || null,
      qr_code: qrData,
    })
    .select()
    .single();

  if (insertError) return res.status(500).json({ error: insertError.message });

  return res.status(200).json({ gatePass });
}
