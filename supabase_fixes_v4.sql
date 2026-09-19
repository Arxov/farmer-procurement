-- PHASE 4: FIX WEEKLY LIMIT BOUNDARY BUG IN RPC
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION book_slot_atomic(
    p_farmer_id UUID,
    p_centre_id UUID,
    p_commodity_id UUID,
    p_slot_date DATE,
    p_slot_window TEXT,
    p_quantity DECIMAL,
    p_ignore_weekly_limit BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_centre RECORD;
    v_current_count INT;
    v_weekly_count INT;
    v_duplicate_count INT;
    v_booking_id UUID;
    v_queue_position INT;
    v_wait_minutes INT;
    v_booking_record JSON;
BEGIN
    -- 1. Lock the centre row to prevent concurrent capacity race conditions
    SELECT * INTO v_centre
    FROM centres
    WHERE id = p_centre_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Centre not found');
    END IF;

    -- 2. Fast-path duplicate check
    SELECT COUNT(*) INTO v_duplicate_count
    FROM bookings
    WHERE farmer_id = p_farmer_id
      AND slot_date = p_slot_date
      AND status != 'cancelled';

    IF v_duplicate_count > 0 THEN
        RETURN json_build_object('error', 'You already have a booking for this date.');
    END IF;

    -- 3. Check weekly limit (unless overridden). Using Calendar week.
    IF NOT p_ignore_weekly_limit THEN
        SELECT COUNT(*) INTO v_weekly_count
        FROM bookings
        WHERE farmer_id = p_farmer_id
          AND date_trunc('week', slot_date) = date_trunc('week', p_slot_date)
          AND status != 'cancelled';

        IF v_weekly_count >= 2 THEN
            RETURN json_build_object('error', 'weekly booking limit exceeded');
        END IF;
    END IF;

    -- 4. Check daily capacity
    SELECT COUNT(*) INTO v_current_count
    FROM bookings
    WHERE centre_id = p_centre_id
      AND slot_date = p_slot_date
      AND status != 'cancelled';

    IF v_current_count >= v_centre.daily_capacity THEN
        RETURN json_build_object('error', 'Daily capacity reached for this centre on the selected date.');
    END IF;

    -- 5. Insert the booking safely
    BEGIN
        INSERT INTO bookings (
            farmer_id, centre_id, commodity_id, slot_date, slot_window,
            expected_quantity_quintals, status
        ) VALUES (
            p_farmer_id, p_centre_id, p_commodity_id, p_slot_date, p_slot_window,
            p_quantity, 'booked'
        ) RETURNING id INTO v_booking_id;
    EXCEPTION WHEN unique_violation THEN
        RETURN json_build_object('error', 'You already have a booking for this date.');
    END;

    -- 6. Generate Queue Entry (estimated position based on count + 1)
    v_queue_position := v_current_count + 1;
    v_wait_minutes := v_queue_position * 10;

    INSERT INTO queue_entries (
        booking_id, queue_position, estimated_wait_minutes
    ) VALUES (
        v_booking_id, v_queue_position, v_wait_minutes
    );

    -- 7. Return successful booking object
    SELECT row_to_json(b) INTO v_booking_record FROM bookings b WHERE id = v_booking_id;

    RETURN json_build_object(
        'booking', v_booking_record,
        'queue_position', v_queue_position,
        'estimated_wait_minutes', v_wait_minutes
    );
END;
$$;
