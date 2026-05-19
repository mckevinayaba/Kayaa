-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2: Following feed + owner updates
--
-- 1. Fix venue_updates RLS policies to also allow venues.owner_user_id path
--    (onboarding sets owner_user_id directly on venues; the old policies only
--    checked the venue_owners join table, which was never written by onboarding)
--
-- 2. business_follows table already created in 20260519_business_follows.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── venue_updates: extend INSERT policy ──────────────────────────────────────

DROP POLICY IF EXISTS "vu_owner_insert" ON venue_updates;

CREATE POLICY "vu_owner_insert" ON venue_updates FOR INSERT
  WITH CHECK (
    venue_id IN (
      SELECT venue_id FROM venue_owners WHERE user_id = auth.uid()
    )
    OR
    venue_id IN (
      SELECT id FROM venues WHERE owner_user_id = auth.uid()
    )
  );

-- ── venue_updates: extend UPDATE policy ──────────────────────────────────────

DROP POLICY IF EXISTS "vu_owner_update" ON venue_updates;

CREATE POLICY "vu_owner_update" ON venue_updates FOR UPDATE
  USING (
    venue_id IN (
      SELECT venue_id FROM venue_owners WHERE user_id = auth.uid()
    )
    OR
    venue_id IN (
      SELECT id FROM venues WHERE owner_user_id = auth.uid()
    )
  );

-- ── venue_updates: extend DELETE policy ──────────────────────────────────────

DROP POLICY IF EXISTS "vu_owner_delete" ON venue_updates;

CREATE POLICY "vu_owner_delete" ON venue_updates FOR DELETE
  USING (
    venue_id IN (
      SELECT venue_id FROM venue_owners WHERE user_id = auth.uid()
    )
    OR
    venue_id IN (
      SELECT id FROM venues WHERE owner_user_id = auth.uid()
    )
  );
