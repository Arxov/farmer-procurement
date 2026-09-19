-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION recalculate_queue_for_date(p_centre_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update queue positions atomically using ROW_NUMBER()
  WITH ranked_bookings AS (
    SELECT 
      id AS booking_id,
      ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_position
    FROM bookings
    WHERE centre_id = p_centre_id
      AND slot_date = p_date
      AND status IN ('booked', 'checked_in')
  )
  UPDATE queue_entries qe
  SET 
    queue_position = rb.new_position,
    estimated_wait_minutes = rb.new_position * 10
  FROM ranked_bookings rb
  WHERE qe.booking_id = rb.booking_id;
END;
$$;
