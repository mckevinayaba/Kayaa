CREATE TABLE place_stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours'
);
ALTER TABLE place_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active stories"
ON place_stories FOR SELECT USING (expires_at > now());
CREATE POLICY "Owner can post stories"
ON place_stories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM venue_owners
    WHERE venue_owners.venue_id = place_stories.venue_id
    AND venue_owners.user_id = auth.uid()
  )
);
