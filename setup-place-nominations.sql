-- ── Place nominations table ───────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (once).
-- Used by the WaitlistModal when a place owner or neighbour nominates a place.

create table if not exists public.place_nominations (
  id               uuid        default gen_random_uuid() primary key,
  place_name       text        not null,
  place_type       text,
  area             text        not null,
  why              text,
  submitter_name   text,
  submitter_contact text,
  contact_type     text        check (contact_type in ('email', 'whatsapp')),
  created_at       timestamptz default now()
);

alter table public.place_nominations enable row level security;

-- Anyone (anon or authenticated) can submit a nomination
drop policy if exists "Anyone can nominate a place" on public.place_nominations;
create policy "Anyone can nominate a place"
  on public.place_nominations
  for insert
  to anon, authenticated
  with check (true);

-- Only authenticated users (admins) can read nominations
drop policy if exists "Authenticated users can read nominations" on public.place_nominations;
create policy "Authenticated users can read nominations"
  on public.place_nominations
  for select
  to authenticated
  using (true);

-- ── country_waitlist table (used by CityWaitlist section on landing page) ─────
create table if not exists public.country_waitlist (
  id           uuid        default gen_random_uuid() primary key,
  area         text        not null,
  contact      text        not null,
  contact_type text        check (contact_type in ('email', 'whatsapp', 'other')),
  country_code text        default 'ZA',
  source       text,
  created_at   timestamptz default now()
);

alter table public.country_waitlist enable row level security;

drop policy if exists "Anyone can join country waitlist" on public.country_waitlist;
create policy "Anyone can join country waitlist"
  on public.country_waitlist
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Authenticated users can read country waitlist" on public.country_waitlist;
create policy "Authenticated users can read country waitlist"
  on public.country_waitlist
  for select
  to authenticated
  using (true);
