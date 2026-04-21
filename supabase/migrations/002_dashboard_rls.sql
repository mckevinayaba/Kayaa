-- ─── Venue settings columns ────────────────────────────────────────────────────
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS is_public              BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_regulars_publicly BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_quiet_checkins   BOOLEAN DEFAULT true;

-- ─── Allow authenticated owner to read their venue's check-ins ─────────────────
-- (in addition to the existing policy that uses venues.owner_id)
CREATE POLICY "Owner can read check-ins via venue_owners"
  ON check_ins FOR SELECT
  USING (
    venue_id IN (
      SELECT venue_id FROM venue_owners WHERE user_id = auth.uid()
    )
  );

-- ─── Allow authenticated user to claim an unclaimed venue_owner record ──────────
CREATE POLICY "Authenticated user can claim unclaimed venue owner"
  ON venue_owners FOR UPDATE
  USING (user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- ─── Allow owner to update their venue settings via venue_owners lookup ─────────
CREATE POLICY "Owner can update venue via venue_owners"
  ON venues FOR UPDATE
  USING (
    id IN (
      SELECT venue_id FROM venue_owners WHERE user_id = auth.uid()
    )
  );

-- ─── Allow owner to insert posts via venue_owners lookup ────────────────────────
CREATE POLICY "Owner can insert posts via venue_owners"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM venue_owners
      WHERE venue_owners.venue_id = posts.venue_id
        AND venue_owners.user_id = auth.uid()
    )
  );

-- ─── Allow owner to insert events via venue_owners lookup ───────────────────────
CREATE POLICY "Owner can insert events via venue_owners"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM venue_owners
      WHERE venue_owners.venue_id = events.venue_id
        AND venue_owners.user_id = auth.uid()
    )
  );
