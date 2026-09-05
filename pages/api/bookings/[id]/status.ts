import { NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { sendNotification } from '../../../../lib/notify';
import { withAuth, AuthenticatedNextApiRequest } from '../../../../lib/apiAuth';
import { UpdateBookingStatusSchema, validateBody } from '../../../../lib/validations';

async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).end();

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid booking ID' });

  const validation = validateBody(UpdateBookingStatusSchema, req.body);
  if (validation.success === false) {
    return res.status(400).json({ error: (validation as any).error });
  }

  const { status, actual_weight_quintals, quality_grade, quality_notes, accepted_quantity_quintals, moisture_percent, admixture_percent, rejection_reason } = (validation as any).data;
  const isStaff = ['officer', 'admin'].includes(req.user.role);

  // Farmers can cancel their own bookings
  if (status === 'cancelled' && !isStaff) {
    const { data: booking } = await supabaseAdmin.from('bookings').select('farmer_id, status').eq('id', id).single();
    if (!booking || booking.farmer_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    if (booking.status !== 'booked') return res.status(400).json({ error: 'Can only cancel bookings in booked status' });
  } else if (!isStaff) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const updateObj: any = { status };
  if (status === 'weighed' && actual_weight_quintals) {
    updateObj.actual_weight_quintals = parseFloat(actual_weight_quintals as string);
  }
  if (status === 'quality_checked') {
    if (quality_grade) updateObj.quality_grade = quality_grade;
    if (quality_notes) updateObj.quality_notes = quality_notes;
    if (moisture_percent) updateObj.moisture_percent = parseFloat(moisture_percent as string);
    if (admixture_percent) updateObj.admixture_percent = parseFloat(admixture_percent as string);
    if (rejection_reason) updateObj.rejection_reason = rejection_reason;
  }
  if (status === 'accepted' && accepted_quantity_quintals) {
    updateObj.accepted_quantity_quintals = parseFloat(accepted_quantity_quintals as string);
  }

  const { data, error } = await supabaseAdmin.from('bookings').update(updateObj).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (status === 'checked_in') {
    await supabaseAdmin.from('queue_entries').update({ check_in_time: new Date().toISOString() }).eq('booking_id', id);
  }

  // On acceptance: create payment record + gate pass
  if (status === 'accepted') {
    const acceptedQty = parseFloat(accepted_quantity_quintals as string) || parseFloat(actual_weight_quintals as string) || parseFloat(data.actual_weight_quintals as string) || 0;

    const { data: commodity } = await supabaseAdmin
      .from('commodities')
      .select('msp_rate_per_quintal')
      .eq('id', data.commodity_id)
      .single();

    const amount = acceptedQty * (commodity?.msp_rate_per_quintal || 0);

    const utr = `UTR${Date.now()}${Math.floor(Math.random() * 10000)}`;
    await supabaseAdmin.from('payments').insert({
      booking_id: id,
      accepted_quantity_quintals: acceptedQty,
      amount,
      utr_reference: utr,
      status: 'initiated',
    });

    const qrData = JSON.stringify({
      booking_id: id,
      farmer_id: data.farmer_id,
      centre_id: data.centre_id,
      slot_date: data.slot_date,
      accepted_at: new Date().toISOString(),
    });

    await supabaseAdmin.from('gate_passes').insert({
      booking_id: id,
      qr_code: qrData,
    });
  }

  // Recalculate queue positions
  if (['weighed', 'quality_checked', 'accepted', 'rejected', 'paid', 'cancelled'].includes(status)) {
    const { data: remaining } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('centre_id', data.centre_id)
      .eq('slot_date', data.slot_date)
      .in('status', ['booked', 'checked_in'])
      .order('created_at', { ascending: true });

    if (remaining) {
      for (let i = 0; i < remaining.length; i++) {
        await supabaseAdmin
          .from('queue_entries')
          .update({
            queue_position: i + 1,
            estimated_wait_minutes: (i + 1) * 10,
          })
          .eq('booking_id', remaining[i].id);
      }
    }
  }

  sendNotification({
    bookingId: id,
    message: `Your booking status changed to: ${status.replace(/_/g, ' ')}.${status === 'accepted' ? ' Gate pass and payment record created.' : ''}`,
  });

  return res.status(200).json({ booking: data });
}

export default withAuth(handler);
