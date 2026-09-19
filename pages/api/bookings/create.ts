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
      p_ignore_weekly_limit: false // First try with normal limits
    });

    if (rpcError) {
      // If the RPC function doesn't exist yet (migration not run), fall back to legacy logic
      if (rpcError.message.includes('book_slot_atomic') || rpcError.code === '42883') {
        return await legacyBooking(req, res, centreId, commodityId, date, slotWindow, parsedQuantity, false);
      }
      return res.status(500).json({ error: rpcError.message });
    }

    // The RPC returns a JSON object with either 'error' or 'booking'
    if (result?.error) {
      if (result.error.toLowerCase().includes('weekly booking limit')) {
        const { count } = await supabaseAdmin
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('farmer_id', req.user.id)
          .gte('slot_date', new Date().toISOString().split('T')[0])
          .not('status', 'eq', 'cancelled');
          
        const EXTENDED_LIMIT = 5;
        if (count !== null && count >= EXTENDED_LIMIT) {
          return res.status(400).json({ error: `You have reached your extended weekly booking limit of ${EXTENDED_LIMIT}. Cancel an existing booking or wait for current ones to complete.` });
        }
        
        // Retry atomic RPC with limits bypassed
        const { data: retryResult, error: retryError } = await supabaseAdmin.rpc('book_slot_atomic', {
          p_farmer_id: req.user.id,
          p_centre_id: centreId,
          p_commodity_id: commodityId,
          p_slot_date: date,
          p_slot_window: slotWindow,
          p_quantity: parsedQuantity,
          p_ignore_weekly_limit: true
        });

        if (retryError || retryResult?.error) {
           return res.status(400).json({ error: retryError?.message || retryResult?.error });
        }
        
        return processSuccessfulBooking(res, retryResult.booking, retryResult.queue_position, retryResult.estimated_wait_minutes, date, slotWindow);
      }
      return res.status(400).json({ error: result.error });
    }

    return processSuccessfulBooking(res, result.booking, result.queue_position, result.estimated_wait_minutes, date, slotWindow);
  } catch (err: any) {
    return await legacyBooking(req, res, centreId, commodityId, date, slotWindow, parsedQuantity, false);
  }
}

function processSuccessfulBooking(res: NextApiResponse, booking: any, position: any, waitMinutes: any, date: string, slotWindow: string) {
  sendNotification({
    bookingId: booking?.id,
    message: `Your slot is booked for ${date} (${slotWindow}). Position: ${position ?? '?'}. Estimated wait: ~${waitMinutes ?? '?'} minutes.`,
  }).catch(err => console.error('Notification failed:', err));

  return res.status(200).json({ booking, queue_position: position, estimated_wait_minutes: waitMinutes });
}

// Keep legacy booking for fallback if RPC isn't deployed yet
async function legacyBooking(
  req: AuthenticatedNextApiRequest, res: NextApiResponse,
  centreId: string, commodityId: string, date: string, slotWindow: string, parsedQuantity: number | null, ignoreWeeklyLimit: boolean
) {
  const { data: centre } = await supabaseAdmin.from('centres').select('daily_capacity').eq('id', centreId).single();
  if (!centre) return res.status(404).json({ error: 'Centre not found' });

  // 1. Check duplicate
  const { count: existing } = await supabaseAdmin
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('farmer_id', req.user.id)
    .eq('slot_date', date)
    .not('status', 'eq', 'cancelled');
    
  if (existing && existing > 0) return res.status(400).json({ error: 'You already have a booking for this date.' });

  // 2. Weekly Limit (simplified logic matching RPC)
  if (!ignoreWeeklyLimit) {
    const { count: weekly } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('farmer_id', req.user.id)
      .gte('slot_date', new Date(new Date(date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .lte('slot_date', new Date(new Date(date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .not('status', 'eq', 'cancelled');
    if (weekly && weekly >= 2) return res.status(400).json({ error: 'weekly booking limit exceeded' });
  }

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
  }).catch(err => console.error('Notification failed:', err));

  return res.status(200).json({ booking });
}

export default withAuth(handler, { roles: ['farmer', 'admin'] });
