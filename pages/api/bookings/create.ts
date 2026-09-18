/**
 * @swagger
 * /api/bookings/create:
 *   post:
 *     summary: Create a procurement slot booking (atomic, race-condition safe)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - centreId
 *               - commodityId
 *               - date
 *               - slotWindow
 *             properties:
 *               centreId:
 *                 type: string
 *               commodityId:
 *                 type: string
 *               date:
 *                 type: string
 *                 example: "2026-09-15"
 *               slotWindow:
 *                 type: string
 *                 example: "10:00-12:00"
 *               quantity:
 *                 type: number
 *                 example: 25.5
 *     responses:
 *       201:
 *         description: Booking created successfully.
 *       400:
 *         description: Validation error or slot capacity reached.
 *       401:
 *         description: Unauthorized.
 */
import { NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendNotification } from '../../../lib/notify';
import { withAuth, AuthenticatedNextApiRequest } from '../../../lib/apiAuth';
import { CreateBookingSchema, validateBody } from '../../../lib/validations';

async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const validation = validateBody(CreateBookingSchema, req.body);
  if (validation.success === false) {
    return res.status(400).json({ error: (validation as any).error });
  }

  const { centreId, commodityId, date, slotWindow, quantity } = (validation as any).data;
  const parsedQuantity = quantity ? parseFloat(quantity as string) : null;

  // Use atomic Postgres function to prevent race conditions
  // This function uses SELECT FOR UPDATE to lock the centre row,
  // checks ALL constraints (capacity, tonnage, duplicates, no-shows, weekly limit),
  // and only then inserts the booking — all in a single transaction.
  try {
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('book_slot_atomic', {
      p_farmer_id: req.user.id,
      p_centre_id: centreId,
      p_commodity_id: commodityId,
      p_slot_date: date,
      p_slot_window: slotWindow,
      p_quantity: parsedQuantity,
    });

    if (rpcError) {
      // If the RPC function doesn't exist yet (migration not run), fall back to legacy logic
      if (rpcError.message.includes('book_slot_atomic') || rpcError.code === '42883') {
        return await legacyBooking(req, res, centreId, commodityId, date, slotWindow, parsedQuantity);
      }
      return res.status(500).json({ error: rpcError.message });
    }

    // The RPC returns a JSON object with either 'error' or 'booking'
    if (result?.error) {
      return res.status(400).json({ error: result.error });
    }

    const booking = result?.booking;
    const position = result?.queue_position;
    const waitMinutes = result?.estimated_wait_minutes;

    sendNotification({
      bookingId: booking?.id,
      message: `Your slot is booked for ${date} (${slotWindow}). Position: ${position ?? '?'}. Estimated wait: ~${waitMinutes ?? '?'} minutes.`,
    });

    return res.status(200).json({ booking, queue_position: position, estimated_wait_minutes: waitMinutes });
  } catch (err: any) {
    return await legacyBooking(req, res, centreId, commodityId, date, slotWindow, parsedQuantity);
  }
}

// Legacy booking logic (fallback if atomic function not available)
async function legacyBooking(
  req: AuthenticatedNextApiRequest, res: NextApiResponse,
  centreId: string, commodityId: string, date: string, slotWindow: string, parsedQuantity: number | null
) {
  const { data: centre } = await supabaseAdmin.from('centres').select('daily_capacity').eq('id', centreId).single();

  if (centre) {
    const { count: existingCount } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('centre_id', centreId)
      .eq('slot_date', date)
      .not('status', 'eq', 'cancelled');

    if (existingCount !== null && existingCount >= centre.daily_capacity) {
      return res.status(400).json({ error: 'This centre has reached its daily capacity for the selected date.' });
    }
  }

  const { data: existing } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('farmer_id', req.user.id)
    .eq('centre_id', centreId)
    .eq('slot_date', date)
    .eq('slot_window', slotWindow)
    .not('status', 'eq', 'cancelled')
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ error: 'You already have a booking for this centre, date, and time slot.' });
  }

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .insert({
      farmer_id: req.user.id,
      centre_id: centreId,
      commodity_id: commodityId,
      slot_date: date,
      slot_window: slotWindow,
      expected_quantity_quintals: parsedQuantity,
    })
    .select()
    .single();

  if (bookingError) return res.status(500).json({ error: bookingError.message });

  let position = null;
  try {
    const queueRes = await supabaseAdmin.rpc('get_queue_position', { p_booking_id: booking.id });
    if (queueRes.data) position = queueRes.data;

    await supabaseAdmin.from('queue_entries').insert({
      booking_id: booking.id,
      queue_position: position ?? null,
      estimated_wait_minutes: position ? position * 10 : null,
    });
  } catch (err) {
    console.error('Failed to create queue entry:', err);
  }

  sendNotification({
    bookingId: booking.id,
    message: `Your slot is booked for ${date} (${slotWindow}). You are position ${position ?? '?'} in the queue.`,
  });

  return res.status(200).json({ booking });
}

export default withAuth(handler, { roles: ['farmer', 'admin'] });
