-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 5: Board post comments + likes
-- Uses visitor_id (TEXT, anonymous localStorage UUID) — no FK to auth users.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. likes_count / comments_count columns ───────────────────────────────────

ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS likes_count    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;

-- ── 2. Anonymous board post likes ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS board_post_likes (
  post_id    UUID  NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  visitor_id TEXT  NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS board_post_likes_post_id_idx ON board_post_likes(post_id);

ALTER TABLE board_post_likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bpl_select" ON board_post_likes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bpl_insert" ON board_post_likes FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bpl_delete" ON board_post_likes FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Anonymous board post comments ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS board_post_comments (
  id           UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id      UUID  NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  visitor_id   TEXT  NOT NULL,
  visitor_name TEXT,                          -- display name from kayaa_profile
  content      TEXT  NOT NULL
                CHECK (char_length(content) >= 1 AND char_length(content) <= 300),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS board_post_comments_post_id_idx ON board_post_comments(post_id);
CREATE INDEX IF NOT EXISTS board_post_comments_created_at_idx ON board_post_comments(created_at DESC);

ALTER TABLE board_post_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bpc_select" ON board_post_comments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "bpc_insert" ON board_post_comments FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. Triggers: keep counts in sync ──────────────────────────────────────────

-- likes_count
CREATE OR REPLACE FUNCTION fn_board_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE board_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE board_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_board_like_count ON board_post_likes;
CREATE TRIGGER trg_board_like_count
AFTER INSERT OR DELETE ON board_post_likes
FOR EACH ROW EXECUTE FUNCTION fn_board_like_count();

-- comments_count
CREATE OR REPLACE FUNCTION fn_board_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE board_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE board_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_board_comment_count ON board_post_comments;
CREATE TRIGGER trg_board_comment_count
AFTER INSERT OR DELETE ON board_post_comments
FOR EACH ROW EXECUTE FUNCTION fn_board_comment_count();
