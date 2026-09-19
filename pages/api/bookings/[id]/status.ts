import { NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { sendNotification } from '../../../../lib/notify';
import { withAuth, AuthenticatedNextApiRequest } from '../../../../lib/apiAuth';
import { UpdateBookingStatusSchema, validateBody } from '../../../../lib/validations';

const VALID_TRANSITIONS: Record<string, string[]> = {
  'booked': ['checked_in', 'cancelled'],
  'checked_in': ['weighed', 'cancelled'],
  'weighed': ['quality_checked', 'cancelled'],
  'quality_checked': ['accepted', 'rejected'],
  'accepted': ['paid'],
  'rejected': [], // Terminal
  'paid': [], // Terminal
  'cancelled': [] // Terminal
};

async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).end();

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid booking ID' });

  const validation = validateBody(UpdateBookingStatusSchema, req.body);
  if (validation.success === false) {
    return res.status(400).json({ error: (validation as any).error });
  }

  const { status: targetStatus, actual_weight_quintals, quality_grade, quality_notes, accepted_quantity_quintals, moisture_percent, admixture_percent, rejection_reason } = (validation as any).data;
  const isStaff = ['officer', 'admin'].includes(req.user.role);

  // Fetch current booking state
  const { data: currentBooking } = await supabaseAdmin.from('bookings').select('farmer_id, status, centre_id, slot_date').eq('id', id).single();
  if (!currentBooking) return res.status(404).json({ error: 'Booking not found' });

  // 1. Enforce State Machine (Chronological transitions)
  const allowedNextStates = VALID_TRANSITIONS[currentBooking.status] || [];
  if (!allowedNextStates.includes(targetStatus)) {
    return res.status(400).json({ 
      error: `Invalid transition from '${currentBooking.status}' to '${targetStatus}'. Allowed: ${allowedNextStates.join(', ') || 'none'}` 
    });
  }

  // 2. Enforce Role Auth
  if (targetStatus === 'cancelled' && !isStaff) {
    if (currentBooking.farmer_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  } else if (!isStaff) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  let finalTargetStatus = targetStatus;
  if (targetStatus === 'quality_checked' && quality_grade === 'Rejected') {
    finalTargetStatus = 'rejected'; // Skip to rejected if grade is Rejected
  }

  const updateObj: any = { status: finalTargetStatus };
  if (targetStatus === 'weighed') {
    const parsedWeight = parseFloat(actual_weight_quintals as string);
    if (Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      return res.status(400).json({ error: 'Valid actual weight is required for weighing step.' });
    }
    updateObj.actual_weight_quintals = parsedWeight;
  }
  // Store quality fields even if we transition straight to rejected
  if (targetStatus === 'quality_checked' || finalTargetStatus === 'rejected') {
    if (quality_grade) updateObj.quality_grade = quality_grade;
    if (quality_notes) updateObj.quality_notes = quality_notes;
    if (moisture_percent != null) updateObj.moisture_percent = parseFloat(moisture_percent as string);
    if (admixture_percent != null) updateObj.admixture_percent = parseFloat(admixture_percent as string);
    if (rejection_reason) updateObj.rejection_reason = rejection_reason;
  }
  if (targetStatus === 'accepted' && accepted_quantity_quintals != null) {
    updateObj.accepted_quantity_quintals = parseFloat(accepted_quantity_quintals as string);
  }

  // Use optimistic concurrency control (check status matches what we fetched)
  const { data, error } = await supabaseAdmin.from('bookings')
    .update(updateObj)
    .eq('id', id)
    .eq('status', currentBooking.status)
    .select().single();
    
  if (error) {
    if (error.code === 'PGRST116') return res.status(409).json({ error: 'Concurrency error: status was modified by another request.' });
    return res.status(500).json({ error: error.message });
  }

  if (finalTargetStatus === 'checked_in') {
    await supabaseAdmin.from('queue_entries').update({ check_in_time: new Date().toISOString() }).eq('booking_id', id);
  }

  // On acceptance: create payment record + gate pass
  if (finalTargetStatus === 'accepted') {
    const acceptedQty = parseFloat(accepted_quantity_quintals as string) || parseFloat(actual_weight_quintals as string) || parseFloat(data.actual_weight_quintals as string) || 0;

    const { data: commodity } = await supabaseAdmin
      .from('commodities')
      .select('msp_rate_per_quintal')
      .eq('id', data.commodity_id)
      .single();

    const amount = acceptedQty * (commodity?.msp_rate_per_quintal || 0);
    const utr = `UTR${Date.now()}${Math.floor(Math.random() * 10000)}`;
    
    if (amount > 0) {
      const { error: payError } = await supabaseAdmin.from('payments').insert({
        booking_id: id,
        accepted_quantity_quintals: acceptedQty,
        amount,
        utr_reference: utr,
        status: 'initiated',
      });
      if (payError) console.error('Payment insert error:', payError);
    }

    const qrData = JSON.stringify({
      booking_id: id,
      farmer_id: data.farmer_id,
      centre_id: data.centre_id,
      slot_date: data.slot_date,
      accepted_at: new Date().toISOString(),
    });

    const { error: gpError } = await supabaseAdmin.from('gate_passes').insert({
      booking_id: id,
      qr_code: qrData,
    });
    if (gpError) console.error('Gate pass insert error:', gpError);
  }

  // Update payment status if marked paid via this generic status endpoint
  if (finalTargetStatus === 'paid') {
    await supabaseAdmin.from('payments').update({
      status: 'completed',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('booking_id', id);
  }

  // Recalculate queue positions efficiently via RPC instead of Promise.all loops
  if (['weighed', 'quality_checked', 'accepted', 'rejected', 'paid', 'cancelled'].includes(finalTargetStatus)) {
    const { error: rpcError } = await supabaseAdmin.rpc('recalculate_queue_for_date', { 
      p_centre_id: currentBooking.centre_id, 
      p_date: currentBooking.slot_date 
    });
    if (rpcError) console.error('RPC Queue Recalc Failed:', rpcError);
  }

  sendNotification({
    bookingId: id,
    message: `Your booking status changed to: ${finalTargetStatus.replace(/_/g, ' ')}.${finalTargetStatus === 'accepted' ? ' Gate pass and payment record created.' : ''}`,
  }).catch(err => console.error('Notification failed:', err));

  return res.status(200).json({ booking: data });
}

export default withAuth(handler);
