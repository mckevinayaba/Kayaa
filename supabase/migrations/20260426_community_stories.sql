-- Community stories submitted from the landing page
CREATE TABLE IF NOT EXISTS community_stories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_name  text NOT NULL,
  place_type  text,
  story       text,
  contact     text,
  source      text DEFAULT 'landing_page',
  created_at  timestamptz DEFAULT now()
);

-- Public insert, admin read only via Supabase dashboard
ALTER TABLE community_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit a community story"
  ON community_stories FOR INSERT
  WITH CHECK (true);
