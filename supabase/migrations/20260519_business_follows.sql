-- ─── business_follows ────────────────────────────────────────────────────────
-- Tracks which users follow which venues ("businesses").
-- A follow is the lightweight version of being a regular — it means
-- "I want updates from this place in my feed".
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.business_follows (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  venue_id   uuid not null references public.venues(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint business_follows_unique unique (user_id, venue_id)
);

-- Fast lookup: does user X follow venue Y?
create index if not exists business_follows_user_venue_idx
  on public.business_follows (user_id, venue_id);

-- Fast count of followers per venue
create index if not exists business_follows_venue_idx
  on public.business_follows (venue_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.business_follows enable row level security;

-- Anyone can see how many followers a venue has (count queries)
create policy "follows_select_all" on public.business_follows
  for select using (true);

-- Users can only insert their own follow rows
create policy "follows_insert_own" on public.business_follows
  for insert with check (auth.uid() = user_id);

-- Users can only delete their own follow rows
create policy "follows_delete_own" on public.business_follows
  for delete using (auth.uid() = user_id);
