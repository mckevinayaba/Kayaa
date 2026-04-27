-- ─── Post likes + alert expiry + profile fields ──────────────────────────────

-- 1. likes_count column on user_posts
ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

-- 2. Profiles: avatar_url + bio
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio       text;

-- 3. Auto-set expires_at = +24h for alert posts on INSERT
CREATE OR REPLACE FUNCTION set_alert_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.category = 'alert' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := COALESCE(NEW.created_at, now()) + INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alert_expiry ON user_posts;
CREATE TRIGGER trg_alert_expiry
  BEFORE INSERT ON user_posts
  FOR EACH ROW EXECUTE FUNCTION set_alert_expiry();

-- 4. post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx    ON post_likes (post_id);
CREATE INDEX IF NOT EXISTS post_likes_user_post_idx  ON post_likes (user_id, post_id);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_likes_select"
  ON post_likes FOR SELECT USING (true);

CREATE POLICY "post_likes_insert"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "post_likes_delete"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Trigger: auto-increment likes_count on like insert
CREATE OR REPLACE FUNCTION fn_inc_post_likes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE user_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inc_post_likes ON post_likes;
CREATE TRIGGER trg_inc_post_likes
  AFTER INSERT ON post_likes
  FOR EACH ROW EXECUTE FUNCTION fn_inc_post_likes();

-- 6. Trigger: auto-decrement likes_count on like delete
CREATE OR REPLACE FUNCTION fn_dec_post_likes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE user_posts
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_dec_post_likes ON post_likes;
CREATE TRIGGER trg_dec_post_likes
  AFTER DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION fn_dec_post_likes();
