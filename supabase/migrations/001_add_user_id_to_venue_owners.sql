-- Add user_id to venue_owners if it doesn't exist
ALTER TABLE venue_owners
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
