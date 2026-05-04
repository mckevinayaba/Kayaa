-- ── Waitlist signups table ────────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (once).

create table if not exists public.waitlist_signups (
  id            uuid        default gen_random_uuid() primary key,
  name          text        not null,
  email         text        not null,
  whatsapp      text,
  neighbourhood text        not null,
  user_type     text        check (user_type in ('neighbour', 'place_owner')),
  created_at    timestamptz default now()
);

-- Unique constraint on email so duplicate signups are handled gracefully
-- (code 23505 in the app → treated as "already on list")
alter table public.waitlist_signups
  drop constraint if exists waitlist_signups_email_key;
alter table public.waitlist_signups
  add  constraint waitlist_signups_email_key unique (email);

-- Row-level security
alter table public.waitlist_signups enable row level security;

-- Anyone (anonymous or authenticated) can insert their own signup
drop policy if exists "Anyone can join waitlist" on public.waitlist_signups;
create policy "Anyone can join waitlist"
  on public.waitlist_signups
  for insert
  to anon, authenticated
  with check (true);

-- Only authenticated users (e.g. admins) can read the list
drop policy if exists "Authenticated users can read waitlist" on public.waitlist_signups;
create policy "Authenticated users can read waitlist"
  on public.waitlist_signups
  for select
  to authenticated
  using (true);
