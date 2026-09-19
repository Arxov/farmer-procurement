-- PHASE 1: DATABASE HARDENING SCRIPT

-- 1. ADD MISSING COLUMNS FOR RATING
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rating INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS feedback_tags TEXT[];

-- 2. ADD UNIQUE CONSTRAINTS FOR PAYMENTS AND GATE PASSES
ALTER TABLE payments ADD CONSTRAINT unique_payment_per_booking UNIQUE (booking_id);
ALTER TABLE gate_passes ADD CONSTRAINT unique_gatepass_per_booking UNIQUE (booking_id);

-- 3. THE book_slot_atomic RPC FUNCTION
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

    -- 2. Check for duplicate bookings on the same day
    SELECT COUNT(*) INTO v_duplicate_count
    FROM bookings
    WHERE farmer_id = p_farmer_id
      AND slot_date = p_slot_date
      AND status != 'cancelled';

    IF v_duplicate_count > 0 THEN
        RETURN json_build_object('error', 'You already have a booking for this date.');
    END IF;

    -- 3. Check weekly limit (unless overridden)
    IF NOT p_ignore_weekly_limit THEN
        SELECT COUNT(*) INTO v_weekly_count
        FROM bookings
        WHERE farmer_id = p_farmer_id
          AND slot_date >= p_slot_date - INTERVAL '7 days'
          AND slot_date <= p_slot_date + INTERVAL '7 days'
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
    INSERT INTO bookings (
        farmer_id, centre_id, commodity_id, slot_date, slot_window, 
        expected_quantity_quintals, status
    ) VALUES (
        p_farmer_id, p_centre_id, p_commodity_id, p_slot_date, p_slot_window, 
        p_quantity, 'booked'
    ) RETURNING id INTO v_booking_id;

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
-- PHASE 2: FIXES FOR ISSUES FOUND IN THE SECOND REVIEW PASS
-- Run this in the Supabase SQL Editor after supabase_fixes.sql

-- =============================================================
-- 1. FIX: payments table is missing timestamp columns
-- =============================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE payments SET created_at = paid_at WHERE paid_at IS NOT NULL AND created_at = updated_at;


-- =============================================================
-- 2. FIX: close the residual cross-centre duplicate-booking race
-- =============================================================
CREATE UNIQUE INDEX IF NOT EXISTS unique_farmer_date_active
  ON bookings (farmer_id, slot_date)
  WHERE status != 'cancelled';

DROP INDEX IF EXISTS unique_farmer_slot;


-- =============================================================
-- 3. FIX: make book_slot_atomic handle the new unique index
-- =============================================================
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

    -- 3. Check weekly limit (unless overridden)
    IF NOT p_ignore_weekly_limit THEN
        SELECT COUNT(*) INTO v_weekly_count
        FROM bookings
        WHERE farmer_id = p_farmer_id
          AND slot_date >= p_slot_date - INTERVAL '7 days'
          AND slot_date <= p_slot_date + INTERVAL '7 days'
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
-- PHASE 3: FIXES FOR GEOLOCATION & DYNAMIC PRICING
-- Run this in the Supabase SQL Editor

-- =============================================================
-- 1. ADD GEOLOCATION COORDINATES TO CENTRES AND PROFILES
-- =============================================================
ALTER TABLE centres ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE centres ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Seed some dummy coordinates for the centres (around Maharashtra / Pune area)
-- to ensure distance calculation works immediately in the UI.
UPDATE centres SET latitude = 18.5204 + (random() * 0.5 - 0.25), longitude = 73.8567 + (random() * 0.5 - 0.25) WHERE latitude IS NULL;

-- =============================================================
-- 2. ADD LOCAL BONUS PRICING TO CENTRE COMMODITIES
-- =============================================================
-- This allows specific mandis to offer a bonus over the standard MSP
ALTER TABLE centre_commodities ADD COLUMN IF NOT EXISTS local_bonus_per_quintal DECIMAL(10, 2) DEFAULT 0.00;

-- Seed random bonuses (e.g. 50, 100, 150) for testing the Smart Suggestion UI
UPDATE centre_commodities 
SET local_bonus_per_quintal = (floor(random() * 4) * 50) 
WHERE local_bonus_per_quintal = 0.00 OR local_bonus_per_quintal IS NULL;

-- =============================================================
-- 3. HAVERSINE DISTANCE POSTGRES FUNCTION (OPTIONAL FAST COMPUTE)
-- =============================================================
-- Creates a function to calculate distance in Kilometers
CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
    radius float = 6371; -- Earth radius in kilometers
    dlat float;
    dlon float;
    a float;
    c float;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;

    dlat = radians(lat2 - lat1);
    dlon = radians(lon2 - lon1);
    
    a = sin(dlat/2) * sin(dlat/2) +
        cos(radians(lat1)) * cos(radians(lat2)) *
        sin(dlon/2) * sin(dlon/2);
        
    c = 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN radius * c;
END;
$$;
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
