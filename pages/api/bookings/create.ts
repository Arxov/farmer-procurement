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
      p_ignore_weekly_limit: false // Always enforce normal limit
    });

    if (rpcError) {
      return res.status(500).json({ error: rpcError.message });
    }

    if (result?.error) {
      return res.status(400).json({ error: result.error });
    }

    // Cancel old booking ONLY AFTER new one successfully books (reschedule logic)
    if ((validation as any).data.rescheduleId) {
      await supabaseAdmin.from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', (validation as any).data.rescheduleId)
        .eq('farmer_id', req.user.id);
    }

    return processSuccessfulBooking(res, result.booking, result.queue_position, result.estimated_wait_minutes, date, slotWindow);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

function processSuccessfulBooking(res: NextApiResponse, booking: any, position: any, waitMinutes: any, date: string, slotWindow: string) {
  sendNotification({
    bookingId: booking?.id,
    message: `Your slot is booked for ${date} (${slotWindow}). Position: ${position ?? '?'}. Estimated wait: ~${waitMinutes ?? '?'} minutes.`,
  }).catch(err => console.error('Notification failed:', err));

  return res.status(200).json({ booking, queue_position: position, estimated_wait_minutes: waitMinutes });
}

export default withAuth(handler, { roles: ['farmer', 'admin'] });
