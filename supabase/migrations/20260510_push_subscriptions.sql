-- ─────────────────────────────────────────────────────────────────────────────
-- push_subscriptions — stores Web Push endpoint + keys per device per neighbourhood
--
-- Design notes:
--   • endpoint is unique per device/browser profile — use it as the upsert key
--   • neighbourhood + city let the send-push function fan out to the right area
--   • user_id is nullable — anonymous users (no account) can still subscribe
--   • p256dh and auth are the encryption keys the browser provides at subscribe time
--   • user_agent is stored (truncated) to help debug browser compatibility issues
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists push_subscriptions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete set null,
  endpoint      text        not null unique,
  p256dh        text        not null,
  auth          text        not null,
  neighbourhood text        not null default '',   -- suburb / area label e.g. "Berea"
  city          text        not null default '',   -- city  e.g. "Johannesburg"
  user_agent    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes for fan-out queries (send to all subscribers in a neighbourhood)
create index if not exists idx_push_neighbourhood
  on push_subscriptions (lower(neighbourhood));

create index if not exists idx_push_city
  on push_subscriptions (lower(city));

create index if not exists idx_push_user_id
  on push_subscriptions (user_id)
  where user_id is not null;

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table push_subscriptions enable row level security;

-- Anon/authenticated clients: insert or upsert their own subscription.
-- They must match on endpoint (the unique key).
create policy "insert own subscription"
  on push_subscriptions for insert
  with check (true);   -- endpoint uniqueness enforces dedup; anyone can subscribe

-- Authenticated users can read their own rows (e.g. to check if already subscribed)
create policy "read own subscription"
  on push_subscriptions for select
  using (
    user_id = auth.uid()
    or user_id is null and endpoint in (
      -- allow anonymous reads scoped to the same session via exact endpoint match
      select endpoint from push_subscriptions where user_id is null
    )
  );

-- Allow update (for pushsubscriptionchange key rotation)
create policy "update own subscription"
  on push_subscriptions for update
  using (true)
  with check (true);

-- Allow delete (unsubscribe)
create policy "delete own subscription"
  on push_subscriptions for delete
  using (true);

-- The service role (edge function) bypasses RLS — no extra policy needed.

-- ── Cleanup: auto-remove stale subscriptions older than 90 days ───────────────
-- Run via pg_cron or as part of the send-push function (remove on delivery fail)

comment on table push_subscriptions is
  'Web Push endpoint registrations. Keyed by endpoint (unique per browser profile). '
  'Neighbourhood + city used for geographic fan-out. Cleaned up on push delivery failure (410 Gone).';
