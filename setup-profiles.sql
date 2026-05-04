-- ─── Kayaa: user profiles table ───────────────────────────────────────────────
-- Run this in Supabase SQL Editor (once).
-- Stores home neighbourhood + identity per authenticated user.

create table if not exists public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  display_name           text,
  home_suburb            text,
  home_city              text,
  latitude               double precision,
  longitude              double precision,
  location_source        text check (location_source in ('gps', 'manual', 'home')),
  location_confirmed_at  timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- Row Level Security — users can only read/write their own row
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using  ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Auto-create an empty profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
