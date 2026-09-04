import { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth, AuthenticatedNextApiRequest } from '@/lib/apiAuth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const RatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string()).max(10).optional(),
});

/**
 * @swagger
 * /api/bookings/{id}/rate:
 *   post:
 *     summary: Submit a farmer's rating for a completed procurement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Rating saved
 */
async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse) {
  const user = req.user;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const bookingId = req.query.id as string;
  if (!bookingId) {
    return res.status(400).json({ error: 'Missing booking ID' });
  }

  let payload;
  try {
    payload = RatingSchema.parse(req.body);
  } catch (err: any) {
    logger.warn('Rating validation failed', err.errors);
    return res.status(400).json({ error: 'Invalid payload', details: err.errors });
  }

  // Check if booking exists and belongs to user
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('farmer_id, status, rating')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.farmer_id !== user.id) {
    return res.status(403).json({ error: 'Forbidden. You can only rate your own bookings.' });
  }

  if (booking.rating) {
    return res.status(409).json({ error: 'Feedback already submitted for this booking.' });
  }

  if (!['paid', 'quality_approved', 'weighed', 'accepted'].includes(booking.status)) {
    return res.status(400).json({ error: 'Booking must be completed to be rated.' });
  }

  const { error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({
      rating: payload.rating,
      feedback_tags: payload.tags || [],
    })
    .eq('id', bookingId);

  if (updateError) {
    logger.error('Failed to update booking rating', updateError);
    return res.status(500).json({ error: 'Failed to save rating' });
  }

  logger.info(`Booking rated successfully`, { bookingId, rating: payload.rating });
  return res.status(200).json({ message: 'Rating saved successfully' });
}

export default withAuth(handler, { roles: ['farmer'] });
