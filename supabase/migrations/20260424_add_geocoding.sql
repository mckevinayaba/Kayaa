-- Add geocoding columns to venues table
-- Run this migration in the Supabase SQL editor

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Sparse index for spatial queries (only indexes rows that have coords)
CREATE INDEX IF NOT EXISTS venues_lat_lng_idx
  ON venues (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comment for future reference
COMMENT ON COLUMN venues.latitude  IS 'WGS-84 latitude — populated by Nominatim geocoding on place creation';
COMMENT ON COLUMN venues.longitude IS 'WGS-84 longitude — populated by Nominatim geocoding on place creation';
