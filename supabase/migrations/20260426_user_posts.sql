-- ─── user_posts: neighbourhood feed posts by users ──────────────────────────
-- Users share stories, news, alerts, spotted moments, recommendations,
-- events, and questions to their neighbourhood feed.

CREATE TABLE IF NOT EXISTS user_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE,
  neighbourhood text NOT NULL,
  country_code  text DEFAULT 'ZA',
  category      text CHECK (category IN (
    'story', 'news', 'alert', 'question',
    'recommendation', 'event', 'spotted'
  )),
  content       text NOT NULL,
  image_url     text,
  expires_at    timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_posts_neighbourhood_idx ON user_posts (neighbourhood);
CREATE INDEX IF NOT EXISTS user_posts_created_at_idx   ON user_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS user_posts_category_idx     ON user_posts (category);

ALTER TABLE user_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read all posts
CREATE POLICY "user_posts_select"
  ON user_posts FOR SELECT
  USING (true);

-- Authenticated users can insert their own posts
CREATE POLICY "user_posts_insert"
  ON user_posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "user_posts_delete"
  ON user_posts FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Seed content ────────────────────────────────────────────────────────────
-- user_id = NULL handled gracefully in UI (shown as "kayaa team")

INSERT INTO user_posts (neighbourhood, country_code, category, content, created_at)
VALUES
  (
    'Soweto', 'ZA', 'story',
    'The barber on Vilakazi Street has been cutting hair in the same spot for 22 years. He knows every regular by name and by cut. That kind of memory deserves more than word of mouth. 💈',
    now() - interval '2 hours'
  ),
  (
    'Alexandra', 'ZA', 'spotted',
    'The corner car wash on London Road was absolutely packed this morning. Guys coming from church, stopping for a wash and a chat. That place is more than a car wash — it is Saturday morning in Alex. 🚗',
    now() - interval '4 hours'
  ),
  (
    'Tembisa', 'ZA', 'recommendation',
    'If you haven''t been to the shisanyama behind the taxi rank on Rabie Street, you are missing out. The pap alone is worth the trip. Fridays after 6 are the best. 🔥',
    now() - interval '6 hours'
  ),
  (
    'Rosebank', 'ZA', 'news',
    'The small bookshop that everyone thought closed down is actually still operating — they just moved to the basement of the Rosebank Mall. Two people found out by accident this week. These places need to be on kayaa. 📚',
    now() - interval '8 hours'
  ),
  (
    'Khayelitsha', 'ZA', 'story',
    'My mother''s salon has been in Site B for 19 years. She has done hair for three generations of the same family. Her clients don''t book. They just show up because they know she''s always there. This is what a regular looks like. 💅',
    now() - interval '12 hours'
  ),
  (
    'Sandton', 'ZA', 'recommendation',
    'There''s a small café tucked behind Sandton City that most people walk past. No sign, no Instagram, just the best coffee in the area. One of those places that only regulars know about. Someone should add it to kayaa.',
    now() - interval '1 day'
  ),
  (
    'Mamelodi', 'ZA', 'alert',
    '🚨 Load shedding Stage 4 hitting Mamelodi East from 2pm today. The spaza shops near the stadium close early when this happens — go before 1pm if you need anything.',
    now() - interval '30 minutes'
  ),
  (
    'Meadowlands', 'ZA', 'event',
    'The community hall on Mooki Street is hosting a youth event this Saturday from 3pm. Free entry. Local DJ. Bring your appetite — there''s going to be a braai. Tell your people. 🎵',
    now() - interval '3 hours'
  );
