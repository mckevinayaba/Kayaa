-- ─── Safety Reports ───────────────────────────────────────────────────────────
--
-- Structured table for citizen-submitted safety reports.
-- Parallel to user_posts (category='alert') which handles surface display;
-- this table preserves the full structured fields for future moderation,
-- deduplication, and analytics.
--
-- Relationship to user_posts:
--   Every safety report ALSO writes a user_posts row (category='alert').
--   The user_post_id FK links the two so either can be found from the other.

create table if not exists safety_reports (
  id              uuid        primary key default gen_random_uuid(),

  -- authorship (nullable = anonymous public display, but still linked internally)
  user_id         uuid        references auth.users(id) on delete set null,
  is_anonymous    boolean     not null default true,

  -- location
  neighbourhood   text        not null,
  country_code    text        not null default 'ZA',
  landmark        text,                        -- optional: "near KFC on Florida Rd"

  -- incident
  incident_type   text        not null,        -- crime|suspicious|violence|missing|road|fire|other
  title           text        not null,
  details         text        not null,

  -- when it happened (defaults to submission time if user selects "right now")
  happened_at     timestamptz not null default now(),

  -- media
  image_url       text,

  -- linked user_posts row (for existing surface display)
  user_post_id    uuid,                        -- soft ref, not FK (user_posts may not have uuid PK type)

  created_at      timestamptz not null default now()
);

-- ── Row-level security ─────────────────────────────────────────────────────────
alter table safety_reports enable row level security;

-- Anyone can read (public safety data)
create policy "safety_reports_public_read"
  on safety_reports for select using (true);

-- Only authenticated users can insert
create policy "safety_reports_auth_insert"
  on safety_reports for insert to authenticated with check (true);

-- Users can delete their own non-anonymous reports (rare, but correct)
create policy "safety_reports_own_delete"
  on safety_reports for delete using (
    auth.uid() = user_id and is_anonymous = false
  );

-- ── Index for neighbourhood queries ───────────────────────────────────────────
create index if not exists safety_reports_neighbourhood_idx
  on safety_reports (neighbourhood, created_at desc);

create index if not exists safety_reports_happened_at_idx
  on safety_reports (happened_at desc);
