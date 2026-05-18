import { supabase } from './supabase';
import type { Venue, Event, Post, Story, VenuePromotion } from '../types';
import { getAreaTier } from './areaGroups';

// ─── DB row → App type mappers ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbVenueToVenue(row: any): Venue {
  const location = (row.location as string) ?? '';
  const parts = location.split(',').map((s: string) => s.trim());
  const city = parts.length > 1 ? parts[parts.length - 1] : location;
  const neighborhood = parts.length > 1 ? parts.slice(0, parts.length - 1).join(', ') : '';

  // Parse gallery_images from jsonb
  let galleryImages: string[] = [];
  if (Array.isArray(row.gallery_images)) {
    galleryImages = row.gallery_images as string[];
  } else if (typeof row.gallery_images === 'string') {
    try { galleryImages = JSON.parse(row.gallery_images); } catch { galleryImages = []; }
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.type,
    description: row.description ?? '',
    address: row.address ?? '',
    neighborhood,
    city,
    province: row.province ?? undefined,
    // lat/lng ready for geocoding — null until DB migration adds the columns
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    coverImage: row.cover_image ?? undefined,
    galleryImages,
    introVideo: row.intro_video ?? undefined,
    checkinCount: row.checkin_count ?? row.regulars_count ?? 0,
    followerCount: row.regulars_count ?? 0,
    // Trust signal columns (Phase 1 migration)
    checkinsToday:    row.checkins_today      ?? 0,
    checkinsThisWeek: row.checkins_this_week  ?? 0,
    checkinsLastWeek: row.checkins_last_week  ?? 0,
    regularsCount:    row.regulars_count      ?? 0,
    lastCheckinAt:    row.last_checkin_at    ?? undefined,
    venueStatus:      (row.status as 'open' | 'busy' | 'quiet' | 'closed') ?? 'closed',
    isOpen: (row.status ?? 'closed') !== 'closed',
    openHours: row.opening_hours ?? undefined,
    ownerHours: row.owner_hours ?? undefined,
    ownerClaimed: row.owner_claimed ?? false,
    ownerUserId: row.owner_user_id ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    whatsappNumber: row.whatsapp_number ?? undefined,
    isVerified:       row.is_verified       ?? row.verified ?? false,
    verificationType: row.verification_type ?? undefined,
    tags: [],
    createdAt: row.created_at ?? '',
    // Phase 8: monetisation fields (nullable until migration runs)
    planTier:       (row.plan_tier as 'free' | 'starter' | 'pro') ?? 'free',
    isPromoted:     row.is_promoted     ?? false,
    promotedUntil:  row.promoted_until  ?? undefined,
    visibilityScore: row.visibility_score ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbEventToEvent(row: any): Event {
  const price = row.price ?? 0;
  return {
    id: row.id,
    venueId: row.venue_id,
    title: row.title,
    description: row.description ?? '',
    startsAt: row.event_date,
    isFree: price === 0,
    price: price > 0 ? price : undefined,
    createdAt: row.created_at ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbPostToPost(row: any): Post {
  return {
    id: row.id,
    venueId: row.venue_id,
    authorId: 'community',
    authorName: 'Community',
    content: row.content,
    likeCount: 0,
    commentCount: 0,
    createdAt: row.created_at ?? '',
    audience: (row.audience as 'public' | 'regulars_only') ?? 'public',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getAllVenues(options?: {
  countryCode?: string;
  suburb?: string;
  city?: string;
}): Promise<Venue[]> {
  let q = supabase.from('venues').select('*').eq('is_active', true);
  if (options?.countryCode) q = q.eq('country_code', options.countryCode);
  // Neighbourhood-first: filter server-side when suburb or city is known.
  // This prevents venues from unrelated cities bleeding into the feed.
  if (options?.suburb) {
    q = q.ilike('location', `%${options.suburb}%`);
  } else if (options?.city) {
    q = q.ilike('location', `%${options.city}%`);
  }
  // Sort: promoted venues (higher visibility_score) rise first.
  // All current venues have visibility_score = 0, so order is unchanged until
  // admin/purchase sets a non-zero score — no surprise reordering for users.
  const { data, error } = await q
    .order('visibility_score', { ascending: false })
    .order('created_at',       { ascending: false });
  if (error || !data) return [];
  return data.map(dbVenueToVenue);
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return dbVenueToVenue(data);
}

// ── Venue view recording ──────────────────────────────────────────────────────

/**
 * Records one view for a venue, deduplicated per session via sessionStorage.
 * Fails silently — never throws, never crashes the caller.
 */
export async function recordVenueView(venueId: string): Promise<void> {
  try {
    const key = `kayaa_viewed_${venueId}`;
    // Check if already recorded this session — storage may be blocked in
    // private-browsing environments, so guard every storage access.
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(key) === '1';
    } catch { /* storage unavailable — proceed as if unseen */ }

    if (alreadySeen) return;

    // Insert the view row
    const { error } = await supabase
      .from('venue_views')
      .insert({ venue_id: venueId });

    if (!error) {
      // Mark as seen for the rest of this session
      try { sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
    }
  } catch { /* never surface view-recording errors to the UI */ }
}

// ── Phase 8: Promotion hooks ──────────────────────────────────────────────────

/** Returns the current active promotion for a venue, or null if none. */
export async function getVenueActivePromotion(venueId: string): Promise<VenuePromotion | null> {
  const { data } = await supabase
    .from('venue_promotions')
    .select('*')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .gt('ends_at', new Date().toISOString())
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    venueId: data.venue_id,
    promotionType: data.promotion_type,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    isActive: data.is_active,
    source: data.source,
    createdAt: data.created_at,
  };
}

/**
 * Returns promoted venues for a given suburb — ready to be injected at the top
 * of the feed when at least one active promotion exists.
 * Returns [] when no promotions are live (no visible change for users).
 */
export async function getPromotedVenuesForFeed(suburb?: string): Promise<Venue[]> {
  let q = supabase
    .from('venues')
    .select('*')
    .eq('is_active', true)
    .eq('is_promoted', true)
    .gt('promoted_until', new Date().toISOString());

  if (suburb) q = q.ilike('location', `%${suburb}%`);

  const { data } = await q
    .order('visibility_score', { ascending: false })
    .limit(3);

  if (!data) return [];
  return data.map(dbVenueToVenue);
}

// ── Owner updates ─────────────────────────────────────────────────────────────

export interface VenueOwnerUpdate {
  id: string;
  title: string;
  content: string | null;
  type: 'general' | 'special' | 'menu' | 'event' | 'announcement';
  createdAt: string;
  expiresAt: string | null;
}

/** Returns the 3 most recent non-expired owner updates for a venue. */
export async function getVenueOwnerUpdates(venueId: string): Promise<VenueOwnerUpdate[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('venue_updates')
    .select('id, title, content, type, created_at, expires_at')
    .eq('venue_id', venueId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    title: r.title,
    content: r.content ?? null,
    type: (r.type as VenueOwnerUpdate['type']) ?? 'general',
    createdAt: r.created_at,
    expiresAt: r.expires_at ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────

export async function getVenueEvents(venueId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('venue_id', venueId)
    .order('event_date', { ascending: true });

  if (error || !data) return [];
  if (data.length === 0) return [];
  return data.map(dbEventToEvent);
}

export async function getVenuePosts(venueId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  if (data.length === 0) return [];
  return data.map(dbPostToPost);
}

export async function createCheckIn(data: {
  venue_id: string;
  visitor_name?: string;
  is_ghost: boolean;
  is_first_visit: boolean;
  visit_number: number;
}) {
  const { error } = await supabase
    .from('check_ins')
    .insert(data);

  if (!error) {
    await supabase.rpc('increment_regulars_count', { venue_id: data.venue_id });
  }

  return { error };
}

export async function getVisitNumber(venueId: string, visitorName: string): Promise<number> {
  const { count } = await supabase
    .from('check_ins')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .eq('visitor_name', visitorName);

  return (count ?? 0) + 1;
}

/** Upload a file to the venue-media Storage bucket. Returns the public URL. */
export async function uploadVenueFile(path: string, file: File): Promise<string> {
  const { error } = await supabase.storage
    .from('venue-media')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage
    .from('venue-media')
    .getPublicUrl(path);
  return publicUrl;
}

export async function createVenue(data: {
  name: string;
  type: string;
  slug: string;
  location: string;
  description?: string;
  opening_hours?: string;
  // address and country_code may not exist in all DB instances — stripped on retry if absent
  address?: string;
  country_code?: string;
  owner_user_id?: string;
  is_active?: boolean;
  // lat/lng: pass when live geocoding is wired up
  latitude?: number;
  longitude?: number;
  // Media
  cover_image?: string;
  gallery_images?: string[];
  intro_video?: string;
}) {
  const { data: row, error } = await supabase
    .from('venues')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('[Kayaa API] createVenue first attempt failed:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  // Retry without optional columns that may not exist in this DB instance.
  // Triggers on:
  //   42703  — column does not exist (PostgreSQL)
  //   PGRST204 — column not found in PostgREST schema cache
  // Any column mentioned by name in the error message is a candidate for stripping.
  const isColumnError = error && (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    error.message?.includes('country_code') ||
    error.message?.includes('owner_user_id') ||
    error.message?.includes('is_active') ||
    error.message?.includes('address') ||
    error.message?.includes('province')   // province column removed from payload but kept as guard
  );

  if (isColumnError) {
    console.log('[Kayaa API] Column mismatch detected. Retrying with core fields only...');
    // Keep only the columns that definitely exist in every Kayaa DB instance
    const corePayload = {
      name:        data.name,
      type:        data.type,
      slug:        data.slug,
      location:    data.location,
      description: data.description,
      cover_image: data.cover_image,
      gallery_images: data.gallery_images,
      intro_video: data.intro_video,
    };
    const { data: row2, error: error2 } = await supabase
      .from('venues')
      .insert(corePayload)
      .select()
      .single();
    if (error2) {
      console.error('[Kayaa API] createVenue core retry also failed:', {
        code: error2.code,
        message: error2.message,
        details: error2.details,
        hint: error2.hint,
      });
    }
    return { row: row2, error: error2 };
  }

  return { row, error };
}

export async function createVenueOwner(data: {
  name: string;
  phone: string;
  email?: string;
  venue_id: string;
}) {
  const { error } = await supabase
    .from('venue_owners')
    .insert(data);

  return { error };
}

export async function getVenueOwnerByUserId(
  userId: string
): Promise<{ venueId: string; ownerName: string } | null> {
  // 1) Check venue_owners table (older path — user_id may not always be set)
  const { data, error } = await supabase
    .from('venue_owners')
    .select('venue_id, name')
    .eq('user_id', userId)
    .maybeSingle();

  if (!error && data) return { venueId: data.venue_id, ownerName: data.name };

  // 2) Fallback: venues.owner_user_id (set by onboarding flow)
  const { data: vRow, error: vErr } = await supabase
    .from('venues')
    .select('id, name')
    .eq('owner_user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (vErr || !vRow) return null;
  return { venueId: vRow.id, ownerName: vRow.name };
}

export async function getVenueById(id: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return dbVenueToVenue(data);
}

export async function updateVenueCoords(venueId: string, lat: number, lng: number) {
  const { error } = await supabase
    .from('venues')
    .update({ latitude: lat, longitude: lng })
    .eq('id', venueId);
  return { error };
}

// ─── Dashboard-specific types ─────────────────────────────────────────────────

export interface DashboardCheckIn {
  id: string;
  visitorName: string;
  isGhost: boolean;
  isFirstVisit: boolean;
  visitNumber: number;
  createdAt: string;
}

export interface Regular {
  name: string;
  visits: number;
  initial: string;
}

export interface ActivityItem {
  id: string;
  text: string;
  time: string;
  initial: string;
}

// ─── Dashboard data fetchers ──────────────────────────────────────────────────

export async function getRecentCheckIns(venueId: string, limit = 30): Promise<DashboardCheckIn[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(row => ({
    id: row.id,
    visitorName: row.visitor_name ?? 'Anonymous',
    isGhost: row.is_ghost ?? false,
    isFirstVisit: row.is_first_visit ?? false,
    visitNumber: row.visit_number ?? 1,
    createdAt: row.created_at,
  }));
}

export async function getVenueRegulars(venueId: string): Promise<Regular[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('visitor_name')
    .eq('venue_id', venueId)
    .eq('is_ghost', false)
    .not('visitor_name', 'is', null);

  if (error || !data) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    const name = row.visitor_name as string;
    if (name) counts[name] = (counts[name] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([name, visits]) => ({ name, visits, initial: name[0].toUpperCase() }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 50);
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export async function getRecentActivity(venueId: string): Promise<ActivityItem[]> {
  const [ciResult, postResult] = await Promise.all([
    supabase
      .from('check_ins')
      .select('id, visitor_name, is_ghost, created_at')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('posts')
      .select('id, content, created_at')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .limit(2),
  ]);

  const items: ActivityItem[] = [];

  for (const ci of ciResult.data ?? []) {
    const name = ci.is_ghost ? 'Someone' : ((ci.visitor_name as string) ?? 'Someone');
    items.push({
      id: `ci-${ci.id}`,
      text: ci.is_ghost ? 'Someone checked in quietly' : `${name.split(' ')[0]} checked in`,
      time: formatRelativeTime(ci.created_at),
      initial: ci.is_ghost ? '?' : (name[0]?.toUpperCase() ?? '?'),
    });
  }

  for (const p of postResult.data ?? []) {
    const content = p.content as string;
    items.push({
      id: `po-${p.id}`,
      text: content.length > 55 ? content.slice(0, 55) + '…' : content,
      time: formatRelativeTime(p.created_at),
      initial: '✦',
    });
  }

  return items;
}

// ─── Internal neighbourhood venue-ID resolver ─────────────────────────────────
// Fetches active venue IDs for a suburb/city in a single indexed query.
// Used by events, stories, and activity functions to restrict to local venues.
// Returns [] if no suburb/city provided — callers treat that as "show nothing".

async function getLocalVenueIds(suburb?: string, city?: string): Promise<string[]> {
  if (!suburb && !city) return [];
  let q = supabase.from('venues').select('id').eq('is_active', true);
  if (suburb) q = q.ilike('location', `%${suburb}%`);
  else if (city) q = q.ilike('location', `%${city}%`);
  const { data } = await q;
  return (data ?? []).map((r: { id: string }) => r.id);
}

export async function getAllEvents(suburb?: string, city?: string): Promise<Event[]> {
  const venueIds = await getLocalVenueIds(suburb, city);
  // If a neighbourhood is given but has no venues, return [] honestly.
  // Only fall through to unfiltered if NEITHER suburb nor city was provided
  // (e.g. venue-detail pages calling this without location context).
  if ((suburb || city) && venueIds.length === 0) return [];

  let q = supabase
    .from('events')
    .select('*')
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(20);

  if (venueIds.length > 0) q = q.in('venue_id', venueIds);

  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(dbEventToEvent);
}

export async function createPost(data: { venue_id: string; content: string; audience?: 'public' | 'regulars_only' }) {
  const { error } = await supabase.from('posts').insert(data);
  return { error };
}

export async function createEvent(data: {
  venue_id: string;
  title: string;
  description?: string;
  event_date: string;
  price?: number;
}) {
  const { error } = await supabase.from('events').insert(data);
  return { error };
}

// ─── Feed enrichment types ────────────────────────────────────────────────────

export type TrendingVenue = Venue & { weeklyCheckins: number };

export interface TonightEvent {
  id: string;
  venueId: string;
  venueName: string;
  venueSlug: string;
  venueType: string;
  title: string;
  startsAt: string;
  isFree: boolean;
  price?: number;
}

// ─── Feed enrichment queries ──────────────────────────────────────────────────

const DEMO_NAMES = /\b(test|demo|example|setup a startup)\b/i;

function isRealVenue(v: Venue): boolean {
  return v.description.trim().length >= 10 && !DEMO_NAMES.test(v.name);
}


function localFirst<T extends Venue>(venues: T[], city: string): T[] {
  const c = city.toLowerCase();
  return [...venues].sort((a, b) => {
    const aLocal = a.city.toLowerCase().includes(c) || a.neighborhood.toLowerCase().includes(c) || c.includes(a.city.toLowerCase()) ? 1 : 0;
    const bLocal = b.city.toLowerCase().includes(c) || b.neighborhood.toLowerCase().includes(c) || c.includes(b.city.toLowerCase()) ? 1 : 0;
    return bLocal - aLocal;
  });
}

// FIX 4: Trending only shows venues with REAL check-ins in the last 7 days
// in the user's neighbourhood. Returns [] if none — section is hidden by FeedPage.
export async function getTrendingPlaces(suburb?: string, city?: string): Promise<TrendingVenue[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: cis, error } = await supabase
    .from('check_ins')
    .select('venue_id')
    .gte('created_at', sevenDaysAgo);

  // No real check-ins this week → section is hidden
  if (error || !cis || cis.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const ci of cis) counts[ci.venue_id] = (counts[ci.venue_id] ?? 0) + 1;

  const topIds = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([id]) => id);
  if (topIds.length === 0) return [];

  const { data: rows, error: ve } = await supabase
    .from('venues').select('*').in('id', topIds).eq('is_active', true);

  if (ve || !rows || rows.length === 0) return [];

  const venues = rows
    .map(r => ({ ...dbVenueToVenue(r), weeklyCheckins: counts[r.id] ?? 0 }))
    .filter(isRealVenue)
    .sort((a, b) => b.weeklyCheckins - a.weeklyCheckins);

  // Prefer suburb-match, fall back to city-match
  const area = suburb || city;
  if (!area) return venues.slice(0, 5);
  return localFirst(venues, area).slice(0, 5);
}

export async function getHappeningTonight(suburb?: string, city?: string): Promise<TonightEvent[]> {
  const venueIds = await getLocalVenueIds(suburb, city);
  if ((suburb || city) && venueIds.length === 0) return [];

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  let q = supabase
    .from('events')
    .select('*, venues(name, slug, type)')
    .gte('event_date', dayStart)
    .lt('event_date', dayEnd)
    .order('event_date', { ascending: true });

  if (venueIds.length > 0) q = q.in('venue_id', venueIds);

  const { data, error } = await q;
  if (error || !data || data.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
    id: row.id,
    venueId: row.venue_id,
    venueName: row.venues?.name ?? '',
    venueSlug: row.venues?.slug ?? '',
    venueType: row.venues?.type ?? '',
    title: row.title,
    startsAt: row.event_date,
    isFree: (row.price ?? 0) === 0,
    price: row.price > 0 ? row.price : undefined,
  }));
}

export async function getNewPlaces(suburb?: string, city?: string): Promise<Venue[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let q = supabase
    .from('venues')
    .select('*')
    .gte('created_at', sevenDaysAgo)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10);
  if (suburb) q = q.ilike('location', `%${suburb}%`);
  else if (city) q = q.ilike('location', `%${city}%`);

  const { data, error } = await q;
  if (error || !data || data.length === 0) return [];
  const venues = data.map(dbVenueToVenue).filter(isRealVenue);
  const area = suburb || city;
  if (!area) return venues.slice(0, 5);
  return localFirst(venues, area).slice(0, 5);
}

export async function getMostLovedPlaces(suburb?: string, city?: string): Promise<Venue[]> {
  let q = supabase
    .from('venues')
    .select('*')
    .gt('regulars_count', 0)
    .eq('is_active', true)
    .order('regulars_count', { ascending: false })
    .limit(10);
  if (suburb) q = q.ilike('location', `%${suburb}%`);
  else if (city) q = q.ilike('location', `%${city}%`);

  const { data, error } = await q;
  if (error || !data || data.length === 0) return [];
  const venues = data.map(dbVenueToVenue).filter(isRealVenue);
  const area = suburb || city;
  if (!area) return venues.slice(0, 5);
  return localFirst(venues, area).slice(0, 5);
}

// ── Fetch venues by ID array ──────────────────────────────────────────────────

export async function getVenuesByIds(ids: string[]): Promise<Venue[]> {
  if (ids.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .in('id', ids)
      .eq('is_active', true);
    if (error || !data) return [];
    return data.map(dbVenueToVenue).filter(isRealVenue);
  } catch {
    return [];
  }
}

// ── Most-honoured venues ──────────────────────────────────────────────────────

export interface HonouredVenueItem {
  venue: Venue;
  count: number;
}

/**
 * Returns venues sorted by honour count, optionally filtered by area.
 * Falls back gracefully if the venue_honours table is empty or missing.
 */
export async function getMostHonouredVenues(
  suburb?: string,
  city?: string,
  limit = 10,
): Promise<HonouredVenueItem[]> {
  try {
    // 1. Fetch raw honour records (up to 1 000)
    const { data: honourRows, error: hErr } = await supabase
      .from('venue_honours')
      .select('venue_id')
      .limit(1000);

    if (hErr || !honourRows || honourRows.length === 0) return [];

    // 2. Aggregate counts in JS
    const counts: Record<string, number> = {};
    for (const row of honourRows) {
      const id = row.venue_id as string;
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    }

    const ranked = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit * 3); // fetch more so we can filter by area

    if (ranked.length === 0) return [];

    // 3. Fetch venue details
    const ids = ranked.map(([id]) => id);
    const venues = await getVenuesByIds(ids);

    // 4. Area filter (loose — substring match)
    const area = suburb || city;
    const filtered = area
      ? venues.filter(v =>
          v.neighborhood?.toLowerCase().includes(area.toLowerCase()) ||
          v.city?.toLowerCase().includes(area.toLowerCase()) ||
          // If no area match at all and we have < 3 local, include anyway
          false,
        )
      : venues;

    // Use wider set if local filter returns nothing
    const source = filtered.length > 0 ? filtered : venues;

    // 5. Re-attach counts and return sorted
    return source
      .map(v => ({ venue: v, count: counts[v.id] ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getGlobalActivity(suburb?: string, city?: string): Promise<ActivityItem[]> {
  const venueIds = await getLocalVenueIds(suburb, city);
  if ((suburb || city) && venueIds.length === 0) return [];

  const [ciRes, postRes] = await Promise.all([
    (() => {
      let q = supabase
        .from('check_ins')
        .select('id, venue_id, visitor_name, is_ghost, created_at, visit_number')
        .order('created_at', { ascending: false })
        .limit(5);
      if (venueIds.length > 0) q = q.in('venue_id', venueIds);
      return q;
    })(),
    (() => {
      let q = supabase
        .from('posts')
        .select('id, venue_id, content, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      if (venueIds.length > 0) q = q.in('venue_id', venueIds);
      return q;
    })(),
  ]);

  const ciData = ciRes.data ?? [];
  const postData = postRes.data ?? [];

  // No real activity yet — return empty so the activity strip is hidden
  if (ciData.length === 0 && postData.length === 0) return [];

  const activityVenueIds = [...new Set([...ciData.map(r => r.venue_id), ...postData.map(r => r.venue_id)])];
  const { data: vRows } = await supabase.from('venues').select('id, name').in('id', activityVenueIds);
  const venueMap: Record<string, string> = {};
  for (const v of vRows ?? []) venueMap[v.id] = v.name;

  const items: ActivityItem[] = [];
  for (const ci of ciData) {
    const place = venueMap[ci.venue_id] ?? 'a place nearby';
    const first = (ci.visitor_name as string | null)?.split(' ')[0];
    const isRegular = (ci.visit_number ?? 0) >= 5 && !ci.is_ghost && first;
    items.push({
      id: `ci-${ci.id}`,
      text: isRegular
        ? `${first} became a regular at ${place}`
        : ci.is_ghost
          ? `Someone checked in at ${place}`
          : `${first ?? 'Someone'} checked in at ${place}`,
      time: formatRelativeTime(ci.created_at),
      initial: ci.is_ghost ? '👤' : ((ci.visitor_name as string)?.[0]?.toUpperCase() ?? '?'),
    });
  }
  for (const p of postData) {
    const place = venueMap[p.venue_id] ?? 'a place';
    items.push({
      id: `po-${p.id}`,
      text: `${place} just posted an update`,
      time: formatRelativeTime(p.created_at),
      initial: '✦',
    });
  }

  return items.slice(0, 5);
}

export async function getActiveStories(venueId?: string, suburb?: string, city?: string): Promise<Story[]> {
  // If fetching for the feed (no specific venueId), scope to local venues only
  let localIds: string[] = [];
  if (!venueId && (suburb || city)) {
    localIds = await getLocalVenueIds(suburb, city);
    if (localIds.length === 0) return [];
  }

  let query = supabase
    .from('place_stories')
    .select('*, venues(name, type)')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (venueId)           query = query.eq('venue_id', venueId);
  else if (localIds.length > 0) query = query.in('venue_id', localIds);

  const { data, error } = await query;
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
    id: row.id,
    venueId: row.venue_id,
    venueName: row.venues?.name ?? '',
    venueType: row.venues?.type ?? '',
    content: row.content,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

export async function createStory(venueId: string, content: string) {
  const { error } = await supabase
    .from('place_stories')
    .insert({ venue_id: venueId, content });
  return { error };
}

export async function updateVenueSettings(venueId: string, settings: {
  is_public?: boolean;
  show_regulars_publicly?: boolean;
  allow_quiet_checkins?: boolean;
}) {
  const { error } = await supabase
    .from('venues')
    .update(settings)
    .eq('id', venueId);
  return { error };
}

// ─── Venue trust data ────────────────────────────────────────────────────────

export interface VenueRecentStats {
  monthlyCheckins: number;
  weeklyCheckins: number;
}

export async function getVenueRecentStats(venueId: string): Promise<VenueRecentStats> {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const weekAgo  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000).toISOString();

  const [monthRes, weekRes] = await Promise.all([
    supabase.from('check_ins').select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId).gte('created_at', monthAgo),
    supabase.from('check_ins').select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId).gte('created_at', weekAgo),
  ]);

  return {
    monthlyCheckins: monthRes.count ?? 0,
    weeklyCheckins:  weekRes.count  ?? 0,
  };
}

// ─── Recent Check-ins ────────────────────────────────────────────────────────

export interface RecentCheckin {
  id: string;
  visitorName: string;
  createdAt: string;
}

export async function getVenueRecentCheckIns(venueId: string, limit = 5): Promise<RecentCheckin[]> {
  const { data } = await supabase
    .from('check_ins')
    .select('id, visitor_name, created_at, is_ghost')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((r: { id: string; visitor_name?: string; created_at: string; is_ghost?: boolean }) => ({
    id: r.id,
    visitorName: r.is_ghost ? 'Someone' : (r.visitor_name ?? 'Someone'),
    createdAt: r.created_at,
  }));
}

// ─── Visitor Regular Card ─────────────────────────────────────────────────────

export interface VisitorVenueCheckin {
  venueId: string;
  venueName: string;
  venueSlug: string;
  venueType: string;
  visitCount: number;
  firstVisitAt: string;
}

export async function getVisitorCheckIns(visitorName: string): Promise<VisitorVenueCheckin[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('venue_id, created_at')
    .eq('visitor_name', visitorName)
    .eq('is_ghost', false)
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) return [];

  const groups: Record<string, { count: number; firstAt: string }> = {};
  for (const row of data) {
    if (!groups[row.venue_id]) {
      groups[row.venue_id] = { count: 0, firstAt: row.created_at };
    }
    groups[row.venue_id].count++;
  }

  const venueIds = Object.keys(groups);
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, slug, type')
    .in('id', venueIds);

  if (!venues) return [];

  return venues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((v: any) => ({
      venueId: v.id,
      venueName: v.name,
      venueSlug: v.slug,
      venueType: v.type,
      visitCount: groups[v.id]?.count ?? 0,
      firstVisitAt: groups[v.id]?.firstAt ?? '',
    }))
    .sort((a, b) => b.visitCount - a.visitCount);
}

// ─── Neighbourhood Board ──────────────────────────────────────────────────────

export interface NeighbourhoodPost {
  id: string;
  authorName: string;
  content: string;
  neighbourhood: string;
  category: 'announcement' | 'lost_found' | 'question' | 'recommendation' | 'event' | 'general';
  isAnonymous: boolean;
  createdAt: string;
  title?: string;
  repliesCount?: number;
}

export async function getNeighbourhoodPosts(neighbourhood: string): Promise<NeighbourhoodPost[]> {
  const { data, error } = await supabase
    .from('neighbourhood_posts')
    .select('*')
    .eq('neighbourhood', neighbourhood)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
    id: row.id,
    authorName: row.author_name,
    content: row.content,
    neighbourhood: row.neighbourhood,
    category: row.category,
    isAnonymous: row.is_anonymous ?? false,
    createdAt: row.created_at,
  }));
}

export async function createNeighbourhoodPost(data: {
  author_name: string;
  content: string;
  neighbourhood: string;
  category: string;
  is_anonymous: boolean;
}) {
  const { error } = await supabase.from('neighbourhood_posts').insert(data);
  return { error };
}

// ─── Local Jobs Board ─────────────────────────────────────────────────────────

export interface LocalJob {
  id: string;
  title: string;
  description: string;
  neighbourhood: string;
  jobType: 'full_time' | 'part_time' | 'once_off' | 'skill_offer';
  contactInfo: string;
  isPaid: boolean;
  postedBy: string;
  createdAt: string;
  expiresAt: string;
  payLabel?: string;
}

export async function getLocalJobs(
  neighbourhood: string,
  scope: 'my_area' | 'nearby' | 'everywhere' = 'my_area',
  city = '',
): Promise<LocalJob[]> {
  try {
    let q = supabase
      .from('local_jobs')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    // For 'my_area': filter at DB level — fast exact match.
    // For 'nearby'/'everywhere': fetch all, filter client-side.
    if (scope === 'my_area') {
      q = q.eq('neighbourhood', neighbourhood);
    }

    const { data, error } = await q;
    if (error || !data) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allJobs: LocalJob[] = data.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      neighbourhood: row.neighbourhood,
      jobType: row.job_type,
      contactInfo: row.contact_info,
      isPaid: row.is_paid ?? true,
      postedBy: row.posted_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));

    if (scope === 'everywhere') return allJobs;

    // scope === 'nearby': exact suburb + tight cluster neighbours
    return allJobs.filter(job => {
      const tier = getAreaTier(job.neighbourhood, job.neighbourhood, neighbourhood, city);
      return tier === 'exact' || tier === 'cluster';
    });
  } catch {
    return [];
  }
}

export async function createLocalJob(data: {
  title: string;
  description: string;
  neighbourhood: string;
  job_type: string;
  contact_info: string;
  is_paid: boolean;
  posted_by: string;
}) {
  const { error } = await supabase.from('local_jobs').insert(data);
  return { error };
}

// ─── Check-in scoring (localStorage-first, DB best-effort) ───────────────────
//
// We use a persistent anonymous visitorId stored in localStorage.
// All scores are written locally first (instant UX), then mirrored to
// `visits` and `regular_scores` tables when they exist.
//
// ─────────────────────────────────────────────────────────────────────────────

export type BadgeTier = 'newcomer' | 'regular' | 'loyal' | 'legend';

/** Map visit count → badge tier.
 *  Thresholds match the DB is_regular flag (set at 5 visits). */
export function calcBadgeTier(visits: number): BadgeTier {
  if (visits >= 25) return 'legend';
  if (visits >= 10) return 'loyal';
  if (visits >= 5)  return 'regular';
  return 'newcomer';
}

/** Persistent anonymous visitor ID — generated once, stored in localStorage. */
export function getVisitorId(): string {
  let id = localStorage.getItem('kayaa_visitor_id');
  if (!id) {
    id = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('kayaa_visitor_id', id);
  }
  return id;
}

export interface UserVenueScore {
  visitCount: number;
  lastVisit: string;
  badgeTier: BadgeTier;
  streakDays: number;
  prevBadgeTier: BadgeTier; // used to detect badge upgrades on celebration screen
}

export interface CheckInHistoryItem {
  venueId: string;
  venueName: string;
  venueSlug: string;
  venueType: string;
  visitCount: number;
  lastVisit: string;
  badgeTier: BadgeTier;
}

// ── Internal localStorage key helpers ────────────────────────────────────────

function _scoreKey(venueId: string, userId: string) { return `ks_${userId}_${venueId}`; }
function _histKey(userId: string) { return `kh_${userId}`; }
function _lastKey(venueId: string, userId: string) { return `klv_${userId}_${venueId}`; }

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns true if the visitor already checked in at this venue within 3 hours.
 * Checks localStorage first (instant), then DB (graceful fallback).
 */
export async function isRecentDuplicate(venueId: string, visitorId: string): Promise<boolean> {
  const raw = localStorage.getItem(_lastKey(venueId, visitorId));
  if (raw && Date.now() - parseInt(raw) < 3 * 60 * 60 * 1000) return true;
  try {
    const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('visits')
      .select('id')
      .eq('venue_id', venueId)
      .eq('user_id', visitorId)
      .gte('checked_in_at', cutoff)
      .limit(1);
    if (data && data.length > 0) return true;
  } catch { /* visits table may not exist yet */ }
  return false;
}

/**
 * Save a check-in:
 * 1. Block if visitor already checked in at this venue within 3 hours
 * 2. Update localStorage score + history immediately
 * 3. Persist to `visits` and `regular_scores` DB tables (best-effort)
 * 4. Bump venue regulars_count via existing RPC
 */
export async function saveVisit(params: {
  venueId:   string;
  venueName: string;
  venueSlug: string;
  venueType: string;
  visitorId: string;
  method:    'gps' | 'qr' | 'qr_link' | 'manual';
  /** Authenticated user's Supabase UUID — undefined for anonymous visitors */
  userId?:   string;
  /** Human-readable name to show in Regulars — first name from Google profile */
  userName?: string;
  /** Private/ghost check-in — visit counted but name not shown in Regulars list */
  isGhost?:  boolean;
}): Promise<{ score: UserVenueScore; alreadyCheckedIn: boolean }> {
  const { venueId, venueName, venueSlug, venueType, visitorId, method, userId, userName, isGhost = false } = params;

  // ── Duplicate guard ──────────────────────────────────────────────────────────
  if (await isRecentDuplicate(venueId, visitorId)) {
    const stored = localStorage.getItem(_scoreKey(venueId, visitorId));
    const s = stored
      ? (JSON.parse(stored) as Omit<UserVenueScore, 'prevBadgeTier'>)
      : { visitCount: 1, lastVisit: '', badgeTier: 'newcomer' as BadgeTier, streakDays: 0 };
    return { score: { ...s, prevBadgeTier: s.badgeTier }, alreadyCheckedIn: true };
  }

  // ── Read current score ───────────────────────────────────────────────────────
  const storedRaw = localStorage.getItem(_scoreKey(venueId, visitorId));
  const prev = storedRaw ? (JSON.parse(storedRaw) as Omit<UserVenueScore, 'prevBadgeTier'>) : null;
  const prevBadge: BadgeTier = prev?.badgeTier ?? 'newcomer';
  const now = new Date().toISOString();

  // Streak: extend if last visit was ≤48 h ago
  let streak = prev?.streakDays ?? 0;
  if (prev?.lastVisit) {
    const diffH = (Date.now() - new Date(prev.lastVisit).getTime()) / 3_600_000;
    streak = diffH <= 48 ? streak + 1 : 1;
  } else {
    streak = 1;
  }

  const newCount = (prev?.visitCount ?? 0) + 1;
  const badgeTier = calcBadgeTier(newCount);
  const score: UserVenueScore = { visitCount: newCount, lastVisit: now, badgeTier, streakDays: streak, prevBadgeTier: prevBadge };

  // ── Write to localStorage ────────────────────────────────────────────────────
  localStorage.setItem(_scoreKey(venueId, visitorId), JSON.stringify({ visitCount: newCount, lastVisit: now, badgeTier, streakDays: streak }));
  localStorage.setItem(_lastKey(venueId, visitorId), String(Date.now()));

  // Update history list
  const histRaw = localStorage.getItem(_histKey(visitorId));
  const hist: CheckInHistoryItem[] = histRaw ? JSON.parse(histRaw) : [];
  const idx = hist.findIndex(h => h.venueId === venueId);
  const item: CheckInHistoryItem = { venueId, venueName, venueSlug, venueType, visitCount: newCount, lastVisit: now, badgeTier };
  if (idx >= 0) hist[idx] = item; else hist.unshift(item);
  hist.sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
  localStorage.setItem(_histKey(visitorId), JSON.stringify(hist.slice(0, 200)));

  // ── Persist to check_ins ─────────────────────────────────────────────────────
  // When the user is authenticated, save their real name + user_id.
  // Anonymous visitors still work — user_id is null, visitor_name is the UUID.
  const displayName = userName ?? null;
  try {
    await supabase.from('check_ins').insert({
      venue_id:       venueId,
      visitor_name:   isGhost  ? null : (userId ? (userName ?? visitorId) : visitorId),
      display_name:   isGhost  ? null : displayName,
      user_id:        isGhost  ? null : (userId ?? null),
      is_ghost:       isGhost,
      is_first_visit: newCount === 1,
      visit_number:   newCount,
      method,
    });
  } catch {
    // Fallback: some columns may not exist in older DB — retry with minimal fields
    try {
      await supabase.from('check_ins').insert({
        venue_id:       venueId,
        visitor_name:   isGhost ? null : (userId ? (userName ?? visitorId) : visitorId),
        is_ghost:       isGhost,
        is_first_visit: newCount === 1,
        visit_number:   newCount,
      });
    } catch { /* noop — localStorage is source of truth */ }
  }

  // ── Legacy tables (best-effort, kept for dashboard back-compat) ──────────────
  try {
    await supabase.from('visits').insert({ venue_id: venueId, user_id: visitorId, checked_in_at: now, method });
  } catch { /* visits table may not exist */ }

  try {
    await supabase.from('regular_scores').upsert(
      { venue_id: venueId, user_id: visitorId, visit_count: newCount, last_visit: now, streak_days: streak, badge_tier: badgeTier },
      { onConflict: 'venue_id,user_id' }
    );
  } catch { /* regular_scores table may not exist */ }

  return { score, alreadyCheckedIn: false };
}

/** Read a user's score for one venue from localStorage (synchronous). */
export function getUserVenueScoreLocal(venueId: string, visitorId: string): Omit<UserVenueScore, 'prevBadgeTier'> | null {
  const raw = localStorage.getItem(_scoreKey(venueId, visitorId));
  return raw ? JSON.parse(raw) : null;
}

/** All venues this visitor has checked into, sorted by most recent. */
export function getUserCheckInHistoryLocal(visitorId: string): CheckInHistoryItem[] {
  const raw = localStorage.getItem(_histKey(visitorId));
  return raw ? JSON.parse(raw) : [];
}

/**
 * Fetch an authenticated user's full check-in history from the DB.
 * Aggregates by venue so each entry shows total visit count + last visit date.
 * Falls back to [] on any error — callers should use localStorage as backup.
 */
export async function getUserCheckInsFromDB(userId: string): Promise<CheckInHistoryItem[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('venue_id, created_at, venues(name, slug, type)')
    .eq('user_id', userId)
    .eq('is_ghost', false)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) return [];

  // Aggregate rows by venue_id
  const groups: Record<string, {
    venueName: string; venueSlug: string; venueType: string;
    count: number; lastVisit: string;
  }> = {};

  for (const row of data) {
    const vid = row.venue_id as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const venue = (row as any).venues as { name?: string; slug?: string; type?: string } | null;
    if (!groups[vid]) {
      groups[vid] = {
        venueName: venue?.name ?? '',
        venueSlug: venue?.slug ?? '',
        venueType: venue?.type ?? '',
        count: 0,
        lastVisit: row.created_at,
      };
    }
    groups[vid].count++;
    if (row.created_at > groups[vid].lastVisit) groups[vid].lastVisit = row.created_at;
  }

  return Object.entries(groups)
    .map(([venueId, d]) => ({
      venueId,
      venueName: d.venueName,
      venueSlug: d.venueSlug,
      venueType: d.venueType,
      visitCount: d.count,
      lastVisit:  d.lastVisit,
      badgeTier:  calcBadgeTier(d.count),
    }))
    .sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
}

// ─── Studio Dashboard API ─────────────────────────────────────────────────────

export interface StudioStats {
  todayCount: number;
  weekCount: number;
  lapsedCount: number;    // visitors whose last visit was >14 days ago
  newFacesCount: number;  // first-time visitors this week
  dailyAvg: number;
}

export interface WeeklyBar {
  day: string;    // 'Mon' … 'Sun'
  avg: number;    // average check-ins on this weekday over last 4 weeks
  total: number;  // raw total for this weekday over 4 weeks
}

export interface StudioRegular {
  name: string;
  visitCount: number;
  lastVisit: string;
  badgeTier: BadgeTier;
  streakDays: number;
  isLapsed: boolean;
  isNew: boolean;
  isLoyal: boolean;
}

export interface CommunityReportData {
  month: string;
  totalCheckins: number;
  uniqueVisitors: number;
  loyalCount: number;
  newFaces: number;
  busiestDay: string;
  avgFrequency: number;
}

export async function getDashboardStats(venueId: string): Promise<StudioStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [todayRes, weekRes] = await Promise.all([
    supabase.from('check_ins').select('id', { count: 'exact', head: true }).eq('venue_id', venueId).gte('created_at', todayStart),
    supabase.from('check_ins').select('id, is_first_visit').eq('venue_id', venueId).gte('created_at', weekAgo),
  ]);

  const todayCount = todayRes.count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weekRows: any[] = weekRes.data ?? [];
  const weekCount = weekRows.length;
  const newFacesCount = weekRows.filter(r => r.is_first_visit).length;
  const dailyAvg = weekCount > 0 ? Math.round(weekCount / 7) : 0;

  let lapsedCount = 0;
  try {
    const { count } = await supabase
      .from('regular_scores')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .lt('last_visit', twoWeeksAgo);
    lapsedCount = count ?? 0;
  } catch { /* table may not exist */ }

  return { todayCount, weekCount, lapsedCount, newFacesCount, dailyAvg };
}

export async function getWeeklyRhythm(venueId: string): Promise<WeeklyBar[]> {
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('check_ins')
    .select('created_at')
    .eq('venue_id', venueId)
    .gte('created_at', fourWeeksAgo);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const totals = [0, 0, 0, 0, 0, 0, 0];
  if (!error && data) {
    for (const row of data) totals[new Date(row.created_at).getDay()]++;
  }
  // Return Mon–Sun order
  return [1, 2, 3, 4, 5, 6, 0].map(dow => ({
    day: dayNames[dow],
    avg: Math.round((totals[dow] / 4) * 10) / 10,
    total: totals[dow],
  }));
}

export async function getStudioRegulars(venueId: string): Promise<StudioRegular[]> {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Try regular_scores first (has structured data)
  try {
    const { data, error } = await supabase
      .from('regular_scores')
      .select('user_id, visit_count, last_visit, badge_tier, streak_days')
      .eq('venue_id', venueId)
      .order('visit_count', { ascending: false })
      .limit(100);

    if (!error && data && data.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((row: any) => ({
        name: `Visitor …${(row.user_id as string).slice(-4)}`,
        visitCount: row.visit_count ?? 1,
        lastVisit: row.last_visit ?? '',
        badgeTier: (row.badge_tier as BadgeTier) ?? calcBadgeTier(row.visit_count ?? 1),
        streakDays: row.streak_days ?? 0,
        isLapsed: row.last_visit ? new Date(row.last_visit) < new Date(twoWeeksAgo) : false,
        isNew: (row.visit_count ?? 1) === 1,
        isLoyal: (row.visit_count ?? 0) >= 10,
      }));
    }
  } catch { /* regular_scores may not exist yet */ }

  // Fallback: aggregate from check_ins by visitor_name
  const { data: ciData, error: ciErr } = await supabase
    .from('check_ins')
    .select('visitor_name, created_at')
    .eq('venue_id', venueId)
    .eq('is_ghost', false)
    .not('visitor_name', 'is', null)
    .order('created_at', { ascending: false });

  if (ciErr || !ciData) return [];

  const map: Record<string, { visits: number; last: string }> = {};
  for (const row of ciData) {
    const name = row.visitor_name as string;
    if (!map[name]) map[name] = { visits: 0, last: row.created_at };
    map[name].visits++;
    if (row.created_at > map[name].last) map[name].last = row.created_at;
  }

  return Object.entries(map)
    .map(([name, d]) => ({
      name,
      visitCount: d.visits,
      lastVisit: d.last,
      badgeTier: calcBadgeTier(d.visits),
      streakDays: 0,
      isLapsed: d.last ? new Date(d.last) < new Date(twoWeeksAgo) : false,
      isNew: d.visits === 1,
      isLoyal: d.visits >= 10,
    }))
    .sort((a, b) => b.visitCount - a.visitCount);
}

export async function getCommunityReportData(venueId: string): Promise<CommunityReportData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const month = now.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

  const { data, error } = await supabase
    .from('check_ins')
    .select('created_at, visitor_name, is_ghost, is_first_visit, visit_number')
    .eq('venue_id', venueId)
    .gte('created_at', monthStart);

  if (error || !data || data.length === 0) {
    return { month, totalCheckins: 0, uniqueVisitors: 0, loyalCount: 0, newFaces: 0, busiestDay: '—', avgFrequency: 0 };
  }

  const totalCheckins = data.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const names = new Set(data.filter((r: any) => !r.is_ghost && r.visitor_name).map((r: any) => r.visitor_name as string));
  const uniqueVisitors = names.size;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loyalCount = data.filter((r: any) => (r.visit_number ?? 0) >= 10).length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newFaces = data.filter((r: any) => r.is_first_visit).length;

  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const row of data) dowCounts[new Date(row.created_at).getDay()]++;
  const busiestDow = dowCounts.indexOf(Math.max(...dowCounts));
  const dayFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const busiestDay = dowCounts[busiestDow] > 0 ? dayFull[busiestDow] : '—';
  const avgFrequency = uniqueVisitors > 0 ? Math.round((totalCheckins / uniqueVisitors) * 10) / 10 : 0;

  return { month, totalCheckins, uniqueVisitors, loyalCount, newFaces, busiestDay, avgFrequency };
}

// ─── Interactive user ID ──────────────────────────────────────────────────────
// Prefers Supabase auth UID (logged-in users); falls back to a stable anon UUID
// stored in localStorage. DB FK may reject anon IDs — all callers try-catch.

export async function getInteractiveUserId(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch { /* not logged in */ }
  let id = localStorage.getItem('kayaa_interact_uid');
  if (!id) {
    try { id = crypto.randomUUID(); } catch { id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`; }
    localStorage.setItem('kayaa_interact_uid', id);
  }
  return id;
}

// ─── Feature 1: Heading There ─────────────────────────────────────────────────

export interface HeadingThereEntry {
  userId: string;
  createdAt: string;
}

export async function getHeadingThereCount(venueId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('heading_there')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .gt('expires_at', new Date().toISOString());
    return count ?? 0;
  } catch { return 0; }
}

export async function getHeadingThereList(venueId: string): Promise<HeadingThereEntry[]> {
  try {
    const { data } = await supabase
      .from('heading_there')
      .select('user_id, created_at')
      .eq('venue_id', venueId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    return (data ?? []).map(r => ({ userId: r.user_id, createdAt: r.created_at }));
  } catch { return []; }
}

export async function signalHeadingThere(venueId: string, userId: string): Promise<void> {
  try {
    await supabase.from('heading_there').upsert(
      { user_id: userId, venue_id: venueId },
      { onConflict: 'user_id,venue_id' }
    );
  } catch { /* FK may fail for anon users — local state handles UX */ }
}

export async function cancelHeadingThere(venueId: string, userId: string): Promise<void> {
  try {
    await supabase.from('heading_there').delete()
      .eq('venue_id', venueId).eq('user_id', userId);
  } catch { /* noop */ }
}

export async function getHeadingThereCountsBatch(venueIds: string[]): Promise<Record<string, number>> {
  if (venueIds.length === 0) return {};
  try {
    const { data } = await supabase
      .from('heading_there')
      .select('venue_id')
      .in('venue_id', venueIds)
      .gt('expires_at', new Date().toISOString());
    const counts: Record<string, number> = {};
    for (const row of data ?? []) counts[row.venue_id] = (counts[row.venue_id] ?? 0) + 1;
    return counts;
  } catch { return {}; }
}

// ─── Feature 2: Vibe Check ────────────────────────────────────────────────────

export type VibeType = 'busy' | 'chilled' | 'happening';

export interface VibeSummary {
  busy: number; chilled: number; happening: number;
  winning: VibeType | null; winningCount: number;
  userVibe: VibeType | null; userExpiresAt: string | null;
}

export async function getVibeSummary(venueId: string, userId?: string): Promise<VibeSummary> {
  const empty: VibeSummary = { busy: 0, chilled: 0, happening: 0, winning: null, winningCount: 0, userVibe: null, userExpiresAt: null };
  try {
    const { data } = await supabase
      .from('vibe_reports')
      .select('vibe, user_id, expires_at')
      .eq('venue_id', venueId)
      .gt('expires_at', new Date().toISOString());

    const counts = { busy: 0, chilled: 0, happening: 0 };
    let userVibe: VibeType | null = null;
    let userExpiresAt: string | null = null;

    for (const row of data ?? []) {
      const v = row.vibe as VibeType;
      if (v in counts) counts[v]++;
      if (userId && row.user_id === userId) { userVibe = v; userExpiresAt = row.expires_at; }
    }

    const max = Math.max(counts.busy, counts.chilled, counts.happening);
    const winning: VibeType | null = max >= 2
      ? (['busy', 'chilled', 'happening'] as VibeType[]).find(v => counts[v] === max) ?? null
      : null;

    return { ...counts, winning, winningCount: max >= 2 ? max : 0, userVibe, userExpiresAt };
  } catch { return empty; }
}

export async function reportVibe(venueId: string, userId: string, vibe: VibeType): Promise<void> {
  try {
    await supabase.from('vibe_reports').upsert(
      { user_id: userId, venue_id: venueId, vibe },
      { onConflict: 'user_id,venue_id' }
    );
  } catch { /* noop */ }
}

export async function cancelVibeReport(venueId: string, userId: string): Promise<void> {
  try {
    await supabase.from('vibe_reports').delete()
      .eq('venue_id', venueId).eq('user_id', userId);
  } catch { /* noop */ }
}

export async function getVibeWinnersBatch(venueIds: string[]): Promise<Record<string, { vibe: VibeType; count: number } | null>> {
  if (venueIds.length === 0) return {};
  try {
    const { data } = await supabase
      .from('vibe_reports')
      .select('venue_id, vibe')
      .in('venue_id', venueIds)
      .gt('expires_at', new Date().toISOString());

    const perVenue: Record<string, { busy: number; chilled: number; happening: number }> = {};
    for (const row of data ?? []) {
      if (!perVenue[row.venue_id]) perVenue[row.venue_id] = { busy: 0, chilled: 0, happening: 0 };
      const v = row.vibe as VibeType;
      if (v in perVenue[row.venue_id]) perVenue[row.venue_id][v]++;
    }

    const result: Record<string, { vibe: VibeType; count: number } | null> = {};
    for (const id of venueIds) {
      const c = perVenue[id];
      if (!c) { result[id] = null; continue; }
      const max = Math.max(c.busy, c.chilled, c.happening);
      if (max < 2) { result[id] = null; continue; }
      const vibe = (['busy', 'chilled', 'happening'] as VibeType[]).find(v => c[v] === max)!;
      result[id] = { vibe, count: max };
    }
    return result;
  } catch { return {}; }
}

// ─── Feature 3: Venue Stories 24h ────────────────────────────────────────────

export interface VenueStory24 {
  id: string;
  venueId: string;
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  caption: string | null;
  createdAt: string;
  expiresAt: string;
}

export async function getActiveVenueStory(venueId: string): Promise<VenueStory24 | null> {
  try {
    const { data } = await supabase
      .from('venue_stories')
      .select('*')
      .eq('venue_id', venueId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return { id: data.id, venueId: data.venue_id, mediaUrl: data.media_url, mediaType: data.media_type as 'photo' | 'video', caption: data.caption ?? null, createdAt: data.created_at, expiresAt: data.expires_at };
  } catch { return null; }
}

export async function createVenueStory24(data: {
  venue_id: string; media_url: string; media_type: 'photo' | 'video'; caption?: string;
}): Promise<{ error: string | null; story: VenueStory24 | null }> {
  try {
    const { data: row, error } = await supabase.from('venue_stories').insert(data).select().single();
    if (error || !row) return { error: error?.message ?? 'Failed to post story', story: null };
    return { error: null, story: { id: row.id, venueId: row.venue_id, mediaUrl: row.media_url, mediaType: row.media_type as 'photo' | 'video', caption: row.caption ?? null, createdAt: row.created_at, expiresAt: row.expires_at } };
  } catch (e) { return { error: String(e), story: null }; }
}

export async function deleteVenueStory24(storyId: string): Promise<void> {
  try { await supabase.from('venue_stories').delete().eq('id', storyId); } catch { /* noop */ }
}

export async function trackStoryView(storyId: string, userId: string): Promise<void> {
  try { await supabase.from('story_views').upsert({ story_id: storyId, user_id: userId }, { onConflict: 'story_id,user_id' }); } catch { /* noop */ }
}

export async function getStoryViewCount(storyId: string): Promise<number> {
  try {
    const { count } = await supabase.from('story_views').select('id', { count: 'exact', head: true }).eq('story_id', storyId);
    return count ?? 0;
  } catch { return 0; }
}

export async function getActiveStoryVenuesBatch(venueIds: string[]): Promise<Set<string>> {
  if (venueIds.length === 0) return new Set();
  try {
    const { data } = await supabase.from('venue_stories').select('venue_id').in('venue_id', venueIds).gt('expires_at', new Date().toISOString());
    return new Set((data ?? []).map(r => r.venue_id));
  } catch { return new Set(); }
}

// ─── Feature: Event Soft RSVP ─────────────────────────────────────────────────

export async function getEventRsvpCount(eventId: string): Promise<number> {
  try {
    const { count } = await supabase.from('event_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', eventId);
    return count ?? 0;
  } catch { return 0; }
}

export async function getEventRsvpCountsBatch(eventIds: string[]): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};
  try {
    const { data } = await supabase.from('event_rsvps').select('event_id').in('event_id', eventIds);
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
    }
    return counts;
  } catch { return {}; }
}

export async function checkUserRsvp(eventId: string, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('event_rsvps').select('id').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
    return !!data;
  } catch { return false; }
}

export async function addEventRsvp(eventId: string, userId: string): Promise<void> {
  try {
    await supabase.from('event_rsvps').upsert({ event_id: eventId, user_id: userId }, { onConflict: 'event_id,user_id' });
  } catch { /* noop */ }
}

export async function removeEventRsvp(eventId: string, userId: string): Promise<void> {
  try {
    await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', userId);
  } catch { /* noop */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOARD POSTS
// ═══════════════════════════════════════════════════════════════════════════════

export type BoardCategory =
  | 'for_sale' | 'free' | 'services' | 'jobs' | 'lost_found'
  | 'announcements' | 'announcer' | 'ask' | 'events' | 'accommodation' | 'safety';

export type BoardPostStatus = 'active' | 'resolved' | 'taken' | 'expired';

export interface BoardPost {
  id: string;
  userId?: string;
  neighbourhood: string;
  category: BoardCategory;
  title: string;
  description?: string;
  price?: number;
  contactWhatsapp?: string;
  images: string[];
  /** Phase-1 video: single short clip URL (mp4/mov/webm). Null when none. */
  videoUrl?: string;
  status: BoardPostStatus;
  createdAt: string;
  expiresAt?: string;
  likesCount: number;
  commentsCount: number;
  /** True when the poster's GPS-detected suburb matched the post's neighbourhood at creation time. */
  isLocalVerified?: boolean;
}

export function calcBoardExpiry(category: BoardCategory): string | null {
  const now = Date.now();
  switch (category) {
    case 'for_sale': case 'free': case 'accommodation':
      return new Date(now + 14 * 86400000).toISOString();
    case 'services': case 'jobs':
      return new Date(now + 30 * 86400000).toISOString();
    case 'announcements': case 'ask': case 'events':
      return new Date(now + 7 * 86400000).toISOString();
    case 'safety':
      return new Date(now + 48 * 3600000).toISOString();
    case 'lost_found':
    default:
      return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbBoardPost(row: any): BoardPost {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    neighbourhood: row.neighbourhood ?? '',
    // prod DB uses 'announcer'; normalise to 'announcements' for display
    category: ((row.category === 'announcer' ? 'announcements' : row.category) as BoardCategory) ?? 'ask',
    title: row.title ?? '',
    description: row.description ?? undefined,
    price: row.price ?? undefined,
    contactWhatsapp: row.contact_whatsapp
      ?? (row.contact_method === 'whatsapp' ? row.contact_value : undefined)
      ?? undefined,
    images: Array.isArray(row.images) ? row.images : [],
    videoUrl: row.video_url ?? undefined,
    status: (row.status as BoardPostStatus) ?? 'active',
    createdAt: row.created_at ?? new Date().toISOString(),
    expiresAt: row.expires_at ?? undefined,
    likesCount:       row.likes_count       ?? 0,
    commentsCount:    row.comments_count    ?? 0,
    isLocalVerified:  row.is_local_verified ?? false,
  };
}

function sortBoardPosts(posts: BoardPost[]): BoardPost[] {
  const now = Date.now();
  const sixHours = 6 * 3600000;
  return [...posts].sort((a, b) => {
    // Active safety posts < 6h always first
    const aSafety = a.category === 'safety' && (now - new Date(a.createdAt).getTime()) < sixHours ? 1 : 0;
    const bSafety = b.category === 'safety' && (now - new Date(b.createdAt).getTime()) < sixHours ? 1 : 0;
    if (bSafety !== aSafety) return bSafety - aSafety;
    // Within safety: GPS-verified posts rank above unverified
    if (a.category === 'safety' && b.category === 'safety') {
      const aV = a.isLocalVerified ? 1 : 0;
      const bV = b.isLocalVerified ? 1 : 0;
      if (bV !== aV) return bV - aV;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getBoardPosts(
  suburb: string,
  city: string,
  category?: string,
  countryCode?: string,
  scope: 'my_area' | 'nearby' | 'everywhere' = 'nearby',
): Promise<{ posts: BoardPost[]; expanded: boolean }> {
  try {
    const now = new Date().toISOString();
    let q = supabase
      .from('board_posts')
      .select('*')
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false })
      .limit(200);

    if (category && category !== 'all') {
      // prod DB may store 'announcer' instead of 'announcements' — query both
      if (category === 'announcements') {
        q = q.in('category', ['announcements', 'announcer']);
      } else {
        q = q.eq('category', category);
      }
    }
    if (countryCode) q = q.eq('country_code', countryCode);

    const { data, error } = await q;
    if (error || !data) return { posts: [], expanded: false };

    const allPosts = data.map(dbBoardPost);

    // 'everywhere': return all posts — user explicitly chose this scope
    if (scope === 'everywhere') {
      return { posts: sortBoardPosts(allPosts), expanded: false };
    }

    // 'my_area': exact suburb match only
    // 'nearby': exact suburb + tight cluster neighbours
    const filtered = allPosts.filter(p => {
      const tier = getAreaTier(p.neighbourhood, p.neighbourhood, suburb, city);
      if (scope === 'my_area') return tier === 'exact';
      return tier === 'exact' || tier === 'cluster';
    });

    return { posts: sortBoardPosts(filtered), expanded: false };
  } catch {
    return { posts: [], expanded: false };
  }
}

export async function getBoardPost(id: string): Promise<BoardPost | null> {
  try {
    const { data, error } = await supabase.from('board_posts').select('*').eq('id', id).single();
    if (error || !data) return null;
    return dbBoardPost(data);
  } catch { return null; }
}

// ─── DB migration required for video support ──────────────────────────────────
// Run once in Supabase SQL editor:
//   ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS video_url TEXT;
// ──────────────────────────────────────────────────────────────────────────────

export async function createBoardPost(
  data: {
    neighbourhood: string;
    category: BoardCategory;
    title: string;
    description?: string;
    price?: number;
    contact_whatsapp?: string;
    images?: string[];
    /** Phase-1: optional short video URL (housing, for_sale, services only) */
    video_url?: string;
    country_code?: string;
    /** Phase-2: GPS-verified locality — set true when poster's GPS matches neighbourhood */
    is_local_verified?: boolean;
  },
  userId?: string,
): Promise<{ error: string | null; post: BoardPost | null }> {
  const expires_at = calcBoardExpiry(data.category);
  const payload: Record<string, unknown> = {
    neighbourhood: data.neighbourhood,
    category: data.category,
    title: data.title.slice(0, 80),
    description: data.description?.slice(0, 500) ?? null,
    price: data.price ?? null,
    contact_whatsapp: data.contact_whatsapp ?? null,
    images: data.images ?? [],
    country_code: data.country_code ?? 'ZA',
    status: 'active',
    expires_at,
  };
  if (userId) payload.user_id = userId;
  // Only include video_url when present — column may not exist in older envs
  if (data.video_url) payload.video_url = data.video_url;
  // Only include is_local_verified when explicitly true — column may not exist in older envs
  if (data.is_local_verified) payload.is_local_verified = true;

  try {
    const { data: row, error } = await supabase.from('board_posts').insert(payload).select().single();
    if (error) {
      // FK violation — retry without user_id
      if (error.code === '23503' && userId) {
        const { user_id: _u, ...safePayload } = payload as { user_id?: string } & Record<string, unknown>;
        void _u;
        const { data: row2, error: e2 } = await supabase.from('board_posts').insert(safePayload).select().single();
        if (e2 || !row2) return { error: e2?.message ?? 'Failed to post', post: null };
        return { error: null, post: dbBoardPost(row2) };
      }
      return { error: error.message, post: null };
    }
    if (!row) return { error: 'No row returned', post: null };
    return { error: null, post: dbBoardPost(row) };
  } catch (e) {
    return { error: String(e), post: null };
  }
}

export async function updateBoardPostStatus(
  id: string,
  status: BoardPostStatus,
  _userId?: string,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('board_posts').update({ status }).eq('id', id);
    return { error: error?.message ?? null };
  } catch (e) { return { error: String(e) }; }
}

export async function deleteBoardPost(id: string, _userId?: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('board_posts').delete().eq('id', id);
    return { error: error?.message ?? null };
  } catch (e) { return { error: String(e) }; }
}

export async function getUserBoardPosts(userId: string): Promise<BoardPost[]> {
  try {
    const { data, error } = await supabase
      .from('board_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(dbBoardPost);
  } catch { return []; }
}

export async function getBoardPostsByIds(ids: string[]): Promise<BoardPost[]> {
  if (ids.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('board_posts')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(dbBoardPost);
  } catch { return []; }
}

export async function uploadBoardImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `board/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('venue-media')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from('venue-media').getPublicUrl(path);
  return publicUrl;
}

/**
 * Upload a short board listing video.
 * Accepted formats: mp4, mov (quicktime), webm.
 * Hard max enforced client-side before calling this: 100 MB.
 */
export async function uploadBoardVideo(userId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() ?? 'mp4').toLowerCase();
  const path = `board/video/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('venue-media')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from('venue-media').getPublicUrl(path);
  return publicUrl;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTRY WAITLIST
// ═══════════════════════════════════════════════════════════════════════════════

export async function joinCountryWaitlist(
  countryCode: string,
  contact: string,
): Promise<{ error: string | null }> {
  const contactType = contact.includes('@') ? 'email' : 'phone';
  try {
    const { error } = await supabase.from('country_waitlist').insert({
      country_code: countryCode,
      contact:      contact.trim(),
      contact_type: contactType,
    });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: String(e) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMUNITY STORIES
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveCommunityStory(data: {
  place_name: string;
  place_type?: string;
  story?: string;
  contact?: string;
}): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('community_stories').insert({
      ...data,
      source: 'landing_page',
    });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: String(e) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER POSTS (neighbourhood feed)
// ═══════════════════════════════════════════════════════════════════════════════

export type UserPostCategory =
  | 'story' | 'news' | 'alert' | 'question'
  | 'recommendation' | 'event' | 'spotted';

export interface UserPost {
  id: string;
  userId: string | null;
  neighbourhood: string;
  countryCode: string;
  category: UserPostCategory;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbUserPost(row: any): UserPost {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    neighbourhood: row.neighbourhood ?? '',
    countryCode: row.country_code ?? 'ZA',
    category: row.category ?? 'story',
    content: row.content ?? '',
    imageUrl: row.image_url ?? null,
    likesCount: row.likes_count ?? 0,
    createdAt: row.created_at ?? '',
  };
}

/**
 * Fetch recent posts for the feed.
 * neighbourhood is REQUIRED for the Home feed — only that suburb's posts are returned.
 * Without a neighbourhood we return [] rather than leaking global posts into Home.
 */
export async function getUserPostsForFeed(neighbourhood: string): Promise<UserPost[]> {
  if (!neighbourhood) return [];
  try {
    const { data, error } = await supabase
      .from('user_posts')
      .select('*')
      .eq('neighbourhood', neighbourhood)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error || !data) return [];
    return data.map(dbUserPost);
  } catch { return []; }
}

/**
 * Fetch active safety alerts (last 24 h) for the current neighbourhood only.
 * Without a neighbourhood we return [] — never show other suburbs' alerts in Home.
 */
export async function getSafetyAlerts(neighbourhood: string): Promise<UserPost[]> {
  if (!neighbourhood) return [];
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('user_posts')
      .select('*')
      .eq('neighbourhood', neighbourhood)
      .eq('category', 'alert')
      .gt('created_at', cutoff)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(dbUserPost);
  } catch { return []; }
}

/** Create a user post (authenticated). */
export async function createUserPost(
  userId: string,
  data: {
    neighbourhood: string;
    category: UserPostCategory;
    content: string;
    image_url?: string;
    country_code?: string;
  }
): Promise<{ post: UserPost | null; error: string | null }> {
  try {
    const { data: row, error } = await supabase
      .from('user_posts')
      .insert({ ...data, user_id: userId })
      .select()
      .single();
    if (error || !row) return { post: null, error: error?.message ?? 'Insert failed' };
    return { post: dbUserPost(row), error: null };
  } catch (e) {
    return { post: null, error: String(e) };
  }
}

/** Upload an image for a user post. Returns public URL. */
export async function uploadUserPostImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `user-posts/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('venue-media')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from('venue-media').getPublicUrl(path);
  return publicUrl;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFETY REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type SafetyIncidentType =
  | 'crime' | 'suspicious' | 'violence' | 'missing' | 'road' | 'fire' | 'other';

export interface SafetyReport {
  id:            string;
  userId:        string | null;
  isAnonymous:   boolean;
  neighbourhood: string;
  landmark:      string | null;
  incidentType:  SafetyIncidentType;
  title:         string;
  details:       string;
  happenedAt:    string;
  imageUrl:      string | null;
  mediaType:     'photo' | 'video' | null;
  userPostId:    string | null;
  createdAt:     string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbSafetyReport(row: any): SafetyReport {
  return {
    id:            row.id,
    userId:        row.user_id ?? null,
    isAnonymous:   row.is_anonymous ?? true,
    neighbourhood: row.neighbourhood ?? '',
    landmark:      row.landmark ?? null,
    incidentType:  (row.incident_type ?? 'other') as SafetyIncidentType,
    title:         row.title ?? '',
    details:       row.details ?? '',
    happenedAt:    row.happened_at ?? row.created_at ?? '',
    imageUrl:      row.image_url ?? null,
    mediaType:     (row.media_type ?? null) as 'photo' | 'video' | null,
    userPostId:    row.user_post_id ?? null,
    createdAt:     row.created_at ?? '',
  };
}

/**
 * Upload safety report media (photo or video) to the venue-media bucket.
 * Returns { url, mediaType }.
 */
export async function uploadSafetyMedia(
  userId: string,
  file: File,
): Promise<{ url: string; mediaType: 'photo' | 'video' }> {
  const mediaType: 'photo' | 'video' = file.type.startsWith('video/') ? 'video' : 'photo';
  const ext  = file.name.split('.').pop() ?? (mediaType === 'video' ? 'mp4' : 'jpg');
  const path = `safety-reports/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('venue-media')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from('venue-media').getPublicUrl(path);
  return { url: publicUrl, mediaType };
}

/**
 * Fetch structured safety reports for a neighbourhood (last 72 h).
 * Returns newest-first. Falls through to [] on any error.
 */
export async function getSafetyReports(neighbourhood: string): Promise<SafetyReport[]> {
  if (!neighbourhood) return [];
  try {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('safety_reports')
      .select('*')
      .eq('neighbourhood', neighbourhood)
      .gt('created_at', cutoff)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(dbSafetyReport);
  } catch { return []; }
}

/**
 * Submit a safety report.
 * Writes to safety_reports (structured) AND user_posts (category='alert') for
 * backward-compatible surface display in the Home feed and AlertsPage.
 *
 * Anonymous reports store the userId internally (for moderation) but never
 * expose it publicly — the user_posts row omits user_id when is_anonymous=true.
 */
export async function createSafetyReport(
  userId: string,
  data: {
    neighbourhood:  string;
    incidentType:   SafetyIncidentType;
    title:          string;
    details:        string;
    landmark?:      string;
    happenedAt?:    string;            // ISO — if omitted, DB defaults to now()
    imageUrl?:      string;            // URL of uploaded photo or video
    mediaType?:     'photo' | 'video'; // defaults to 'photo' if imageUrl present
    isAnonymous?:   boolean;           // default true
    countryCode?:   string;
  }
): Promise<{ report: SafetyReport | null; error: string | null }> {
  const isAnon = data.isAnonymous ?? true;

  // ── 1. Build human-readable content for user_posts surface display ─────────
  //    Format: "TITLE\n\nDETAILS[\n\n📍 LANDMARK]"
  const contentParts = [`${data.title}\n\n${data.details}`];
  if (data.landmark?.trim()) contentParts.push(`\n📍 ${data.landmark.trim()}`);
  const content = contentParts.join('');

  try {
    // ── 2. Insert user_posts row for existing surface display ───────────────
    const { data: postRow, error: postErr } = await supabase
      .from('user_posts')
      .insert({
        user_id:      isAnon ? null : userId,
        neighbourhood: data.neighbourhood,
        country_code: data.countryCode ?? 'ZA',
        category:     'alert',
        content,
        image_url:    data.imageUrl ?? null,
      })
      .select('id')
      .single();

    if (postErr) return { report: null, error: postErr.message };

    // ── 3. Insert structured safety_reports row ─────────────────────────────
    const reportPayload: Record<string, unknown> = {
      user_id:       userId,           // always stored internally
      is_anonymous:  isAnon,
      neighbourhood: data.neighbourhood,
      country_code:  data.countryCode ?? 'ZA',
      incident_type: data.incidentType,
      title:         data.title,
      details:       data.details,
      landmark:      data.landmark ?? null,
      image_url:     data.imageUrl ?? null,
      media_type:    data.imageUrl ? (data.mediaType ?? 'photo') : null,
      user_post_id:  postRow?.id ?? null,
    };
    if (data.happenedAt) reportPayload.happened_at = data.happenedAt;

    const { data: repRow, error: repErr } = await supabase
      .from('safety_reports')
      .insert(reportPayload)
      .select()
      .single();

    if (repErr) {
      // Non-fatal: user_posts row was written, surface display will work.
      // Return a synthetic report so the UI can still navigate to Alerts.
      console.warn('safety_reports insert failed (non-fatal):', repErr.message);
      return {
        report: {
          id:            postRow?.id ?? '',
          userId,
          isAnonymous:   isAnon,
          neighbourhood: data.neighbourhood,
          landmark:      data.landmark ?? null,
          incidentType:  data.incidentType,
          title:         data.title,
          details:       data.details,
          happenedAt:    data.happenedAt ?? new Date().toISOString(),
          imageUrl:      data.imageUrl ?? null,
          mediaType:     data.imageUrl ? (data.mediaType ?? 'photo') : null,
          userPostId:    postRow?.id ?? null,
          createdAt:     new Date().toISOString(),
        },
        error: null,
      };
    }

    return { report: dbSafetyReport(repRow), error: null };
  } catch (e) {
    return { report: null, error: String(e) };
  }
}

/** Toggle like on a post. Returns new liked state. */
export async function likePost(postId: string, userId: string): Promise<void> {
  await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
}

export async function unlikePost(postId: string, userId: string): Promise<void> {
  await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
}

/**
 * Returns the set of post IDs that the given user has liked.
 * Pass the list of post IDs currently visible in the feed to keep the query small.
 */
export async function getUserLikedPosts(userId: string, postIds: string[]): Promise<Set<string>> {
  if (!userId || postIds.length === 0) return new Set();
  try {
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds);
    if (error || !data) return new Set();
    return new Set(data.map((r: { post_id: string }) => r.post_id));
  } catch { return new Set(); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOARD POST COMMENTS & LIKES (anonymous, visitor_id based)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BoardPostComment {
  id: string;
  postId: string;
  visitorId: string;
  visitorName: string | null;
  content: string;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbBoardComment(row: any): BoardPostComment {
  return {
    id:          row.id,
    postId:      row.post_id,
    visitorId:   row.visitor_id,
    visitorName: row.visitor_name ?? null,
    content:     row.content,
    createdAt:   row.created_at,
  };
}

export async function getBoardPostComments(postId: string): Promise<BoardPostComment[]> {
  try {
    const { data, error } = await supabase
      .from('board_post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map(dbBoardComment);
  } catch { return []; }
}

/**
 * Add a reply to a board post.
 * Returns { comment, errorCode } where errorCode is:
 *   null        → success
 *   'OFFLINE'   → no network
 *   'AUTH'      → RLS / unauthenticated
 *   'TOO_LONG'  → check constraint violated
 *   'POST_GONE' → FK violation (post deleted)
 *   'UNKNOWN'   → any other server error
 */
export async function addBoardPostComment(
  postId: string,
  visitorId: string,
  content: string,
  visitorName?: string,
): Promise<{ comment: BoardPostComment | null; errorCode: string | null }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { comment: null, errorCode: 'OFFLINE' };
  }
  try {
    const { data, error } = await supabase
      .from('board_post_comments')
      .insert({ post_id: postId, visitor_id: visitorId, content: content.trim(), visitor_name: visitorName ?? null })
      .select()
      .single();
    if (error) {
      if (error.code === '42501') return { comment: null, errorCode: 'AUTH' };
      if (error.code === '23514') return { comment: null, errorCode: 'TOO_LONG' };
      if (error.code === '23503') return { comment: null, errorCode: 'POST_GONE' };
      return { comment: null, errorCode: 'UNKNOWN' };
    }
    if (!data) return { comment: null, errorCode: 'UNKNOWN' };
    return { comment: dbBoardComment(data), errorCode: null };
  } catch {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { comment: null, errorCode: 'OFFLINE' };
    }
    return { comment: null, errorCode: 'UNKNOWN' };
  }
}

/**
 * Report a board post reply.
 * Inserts into board_post_comment_reports (created if table exists).
 * On 3+ unique reports the UI hides the reply; admin reviews via DB.
 * Gracefully no-ops if the table doesn't exist yet.
 */
export async function reportBoardPostComment(
  commentId: string,
  visitorId: string,
  reason: 'spam' | 'harmful',
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('board_post_comment_reports')
      .upsert(
        { comment_id: commentId, visitor_id: visitorId, reason },
        { onConflict: 'comment_id,visitor_id', ignoreDuplicates: true },
      );
    // If table doesn't exist (42P01) just swallow — feature degrades gracefully
    if (error && error.code !== '42P01') return { error: error.message };
    return { error: null };
  } catch { return { error: null }; }
}

/** Returns whether the visitor has liked this post (localStorage-first). */
export function isBoardPostLikedLocally(postId: string): boolean {
  try {
    const liked: string[] = JSON.parse(localStorage.getItem('kayaa_board_liked') ?? '[]');
    return liked.includes(postId);
  } catch { return false; }
}

function setLikedLocally(postId: string, liked: boolean) {
  try {
    let arr: string[] = JSON.parse(localStorage.getItem('kayaa_board_liked') ?? '[]');
    arr = liked ? [...new Set([...arr, postId])] : arr.filter(id => id !== postId);
    localStorage.setItem('kayaa_board_liked', JSON.stringify(arr));
  } catch { /* noop */ }
}

/**
 * Toggle like on a board post.
 * Updates localStorage immediately; syncs to DB best-effort.
 * Returns the new liked state.
 */
export async function toggleBoardPostLike(postId: string, visitorId: string): Promise<boolean> {
  const wasLiked = isBoardPostLikedLocally(postId);
  const nowLiked = !wasLiked;
  setLikedLocally(postId, nowLiked);
  try {
    if (nowLiked) {
      await supabase
        .from('board_post_likes')
        .upsert({ post_id: postId, visitor_id: visitorId }, { onConflict: 'post_id,visitor_id' });
    } else {
      await supabase
        .from('board_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('visitor_id', visitorId);
    }
  } catch { /* localStorage state is source of truth */ }
  return nowLiked;
}


// ═══════════════════════════════════════════════════════════════════════════════
// NEIGHBOURHOOD MOMENTS
//
// Lightweight 24-hour local media posts.
// Not Board (no listings). Not Alerts (no danger). Not venue Stories (not place-bound).
// Moments = vibe, live context, local texture — what the area feels like right now.
//
// SQL migration required (run once in Supabase SQL editor):
//   CREATE TABLE IF NOT EXISTS neighbourhood_moments (
//     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
//     neighbourhood text NOT NULL,
//     caption     text NOT NULL CHECK (char_length(caption) <= 120),
//     media_url   text NOT NULL,
//     media_type  text NOT NULL CHECK (media_type IN ('photo','video')),
//     venue_name  text,
//     expires_at  timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
//     created_at  timestamptz NOT NULL DEFAULT now(),
//     is_anonymous boolean NOT NULL DEFAULT false
//   );
//   CREATE INDEX IF NOT EXISTS idx_moments_neighbourhood ON neighbourhood_moments(neighbourhood);
//   CREATE INDEX IF NOT EXISTS idx_moments_expires ON neighbourhood_moments(expires_at);
//   ALTER TABLE neighbourhood_moments ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "moments_select" ON neighbourhood_moments FOR SELECT USING (expires_at > now());
//   CREATE POLICY "moments_insert" ON neighbourhood_moments FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
//   CREATE POLICY "moments_delete" ON neighbourhood_moments FOR DELETE USING (auth.uid() = user_id);
// ═══════════════════════════════════════════════════════════════════════════════

export interface NeighbourhoodMoment {
  id:           string;
  userId:       string | null;   // null when anonymous
  neighbourhood: string;
  caption:      string;
  mediaUrl:     string;
  mediaType:    'photo' | 'video';
  venueName?:   string;
  expiresAt:    string;
  createdAt:    string;
  isAnonymous:  boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbMoment(row: any): NeighbourhoodMoment {
  return {
    id:           row.id,
    userId:       row.user_id ?? null,
    neighbourhood: row.neighbourhood,
    caption:      row.caption,
    mediaUrl:     row.media_url,
    mediaType:    row.media_type as 'photo' | 'video',
    venueName:    row.venue_name ?? undefined,
    expiresAt:    row.expires_at,
    createdAt:    row.created_at,
    isAnonymous:  row.is_anonymous ?? false,
  };
}

/** Fetch non-expired moments for a neighbourhood (newest first, max 40). */
export async function getMoments(neighbourhood: string): Promise<NeighbourhoodMoment[]> {
  if (!neighbourhood) return [];
  try {
    const { data, error } = await supabase
      .from('neighbourhood_moments')
      .select('*')
      .eq('neighbourhood', neighbourhood)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(40);
    if (error || !data) return [];
    return data.map(dbMoment);
  } catch { return []; }
}

/**
 * Upload a moment photo or video.
 * Photo: max 20 MB.  Video: max 50 MB.
 * Both stored in venue-media bucket under moments/{userId}/.
 */
export async function uploadMomentMedia(
  userId: string,
  file: File,
): Promise<{ url: string; mediaType: 'photo' | 'video' }> {
  const mediaType: 'photo' | 'video' = file.type.startsWith('video/') ? 'video' : 'photo';
  const ext  = file.name.split('.').pop() ?? (mediaType === 'video' ? 'mp4' : 'jpg');
  const path = `moments/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('venue-media')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from('venue-media').getPublicUrl(path);
  return { url: publicUrl, mediaType };
}

/** Create a neighbourhood moment. Expires 24 hours from creation. */
export async function createMoment(
  userId: string,
  data: {
    neighbourhood: string;
    caption:       string;
    mediaUrl:      string;
    mediaType:     'photo' | 'video';
    venueName?:    string;
    isAnonymous?:  boolean;
  },
): Promise<{ error: string | null }> {
  try {
    const isAnon   = data.isAnonymous ?? false;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from('neighbourhood_moments').insert({
      user_id:      isAnon ? null : userId,
      neighbourhood: data.neighbourhood,
      caption:      data.caption.trim().slice(0, 120),
      media_url:    data.mediaUrl,
      media_type:   data.mediaType,
      venue_name:   data.venueName?.trim() || null,
      expires_at:   expiresAt,
      is_anonymous: isAnon,
    });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: String(e) };
  }
}

// ─── Utility Reports (Power & Water) ─────────────────────────────────────────
//
// SQL migration (run once in Supabase SQL editor):
// --------------------------------------------------------------------
// create table if not exists utility_reports (
//   id            uuid primary key default gen_random_uuid(),
//   user_id       uuid references auth.users(id) on delete set null,
//   neighbourhood text not null,
//   category      text not null check (category in ('power','water')),
//   issue_type    text not null,
//   area_detail   text not null,
//   started_when  text not null check (started_when in ('now','earlier')),
//   note          text,
//   photo_url     text,
//   created_at    timestamptz not null default now()
// );
// alter table utility_reports enable row level security;
// create policy "Anyone can view utility reports"
//   on utility_reports for select using (true);
// create policy "Authenticated users can insert utility reports"
//   on utility_reports for insert with check (auth.uid() is not null);
// --------------------------------------------------------------------

export type UtilityCategory = 'power' | 'water';

export type PowerIssueType =
  | 'power_out'
  | 'load_shedding'
  | 'flickering'
  | 'streetlights'
  | 'power_restored';

export type WaterIssueType =
  | 'no_water'
  | 'low_pressure'
  | 'dirty_water'
  | 'leak_burst'
  | 'water_restored';

export type UtilityIssueType = PowerIssueType | WaterIssueType;

export interface UtilityReport {
  id: string;
  userId: string | null;
  neighbourhood: string;
  category: UtilityCategory;
  issueType: UtilityIssueType;
  areaDetail: string;
  startedWhen: 'now' | 'earlier';
  note: string;
  photoUrl: string | null;
  createdAt: string;
  reportCount: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbUtilityReport(row: any, count: number): UtilityReport {
  return {
    id:            row.id,
    userId:        row.user_id ?? null,
    neighbourhood: row.neighbourhood,
    category:      row.category as UtilityCategory,
    issueType:     row.issue_type as UtilityIssueType,
    areaDetail:    row.area_detail,
    startedWhen:   row.started_when as 'now' | 'earlier',
    note:          row.note ?? '',
    photoUrl:      row.photo_url ?? null,
    createdAt:     row.created_at,
    reportCount:   count,
  };
}

/**
 * Returns the latest unique utility reports for a neighbourhood grouped by
 * issue_type within a 2-hour window. Restoration reports suppress the
 * corresponding issue from the returned list.
 */
export async function getUtilityReports(
  neighbourhood: string,
  category?: UtilityCategory,
): Promise<UtilityReport[]> {
  try {
    const since = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

    let q = supabase
      .from('utility_reports')
      .select('*')
      .ilike('neighbourhood', `%${neighbourhood}%`)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (category) q = q.eq('category', category);

    const { data, error } = await q;
    if (error || !data) return [];

    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const countMap: Record<string, number> = {};
    const latestMap: Record<string, typeof data[0]> = {};

    for (const row of data) {
      const t  = row.issue_type as string;
      const ts = new Date(row.created_at).getTime();
      if (ts >= twoHoursAgo) countMap[t] = (countMap[t] ?? 0) + 1;
      if (!latestMap[t]) latestMap[t] = row;
    }

    const restorations = new Set<string>();
    for (const t of Object.keys(latestMap)) {
      if (t === 'power_restored') {
        ['power_out','load_shedding','flickering','streetlights'].forEach(x => restorations.add(x));
      }
      if (t === 'water_restored') {
        ['no_water','low_pressure','dirty_water','leak_burst'].forEach(x => restorations.add(x));
      }
    }

    const result: UtilityReport[] = [];
    for (const [issueType, row] of Object.entries(latestMap)) {
      if (restorations.has(issueType)) continue;
      result.push(dbUtilityReport(row, countMap[issueType] ?? 1));
    }

    result.sort((a, b) => {
      const aRes = a.issueType.endsWith('_restored') ? 1 : 0;
      const bRes = b.issueType.endsWith('_restored') ? 1 : 0;
      if (aRes !== bRes) return aRes - bRes;
      return b.reportCount - a.reportCount;
    });

    return result;
  } catch {
    return [];
  }
}

/**
 * Checks if the same issue_type was reported in this neighbourhood
 * within the last 2 hours. Returns the count.
 */
export async function checkUtilityDuplicate(
  neighbourhood: string,
  issueType:      UtilityIssueType,
): Promise<number> {
  try {
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('utility_reports')
      .select('id', { count: 'exact', head: true })
      .ilike('neighbourhood', `%${neighbourhood}%`)
      .eq('issue_type', issueType)
      .gte('created_at', since);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Uploads a utility-report photo to the venue-media bucket under
 * utility-reports/{userId}/.
 */
export async function uploadUtilityPhoto(
  userId: string,
  file:   File,
): Promise<{ url: string } | { error: string }> {
  try {
    const ext  = file.name.split('.').pop() ?? 'jpg';
    const path = `utility-reports/${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('venue-media')
      .upload(path, file, { upsert: false });
    if (upErr) return { error: upErr.message };
    const { data } = supabase.storage.from('venue-media').getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (e) {
    return { error: String(e) };
  }
}

/**
 * Inserts a single utility report row.
 */
export async function createUtilityReport(
  userId: string,
  data: {
    neighbourhood: string;
    category:      UtilityCategory;
    issueType:     UtilityIssueType;
    areaDetail:    string;
    startedWhen:   'now' | 'earlier';
    note?:         string;
    photoUrl?:     string;
  },
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('utility_reports').insert({
      user_id:      userId,
      neighbourhood: data.neighbourhood,
      category:     data.category,
      issue_type:   data.issueType,
      area_detail:  data.areaDetail,
      started_when: data.startedWhen,
      note:         data.note?.trim() || null,
      photo_url:    data.photoUrl || null,
    });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: String(e) };
  }
}
