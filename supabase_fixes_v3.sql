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
