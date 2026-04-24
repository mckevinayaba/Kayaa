import { supabase } from './supabase';
import { mockVenues, mockEvents, mockPosts } from './mockData';
import type { Venue, Event, Post, Story } from '../types';

// ─── DB row → App type mappers ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbVenueToVenue(row: any): Venue {
  const location = (row.location as string) ?? '';
  const parts = location.split(',').map((s: string) => s.trim());
  const city = parts.length > 1 ? parts[parts.length - 1] : location;
  const neighborhood = parts.length > 1 ? parts.slice(0, parts.length - 1).join(', ') : '';

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
    checkinCount: row.regulars_count ?? 0,
    followerCount: row.regulars_count ?? 0,
    isOpen: true,
    openHours: row.opening_hours ?? undefined,
    whatsappNumber: row.whatsapp_number ?? undefined,
    isVerified: row.is_verified ?? false,
    tags: [],
    createdAt: row.created_at ?? '',
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
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getAllVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) return mockVenues;
  return data.map(dbVenueToVenue);
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return mockVenues.find(v => v.slug === slug) ?? null;
  return dbVenueToVenue(data);
}

export async function getVenueEvents(venueId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('venue_id', venueId)
    .order('event_date', { ascending: true });

  if (error || !data) return mockEvents.filter(e => e.venueId === venueId);
  if (data.length === 0) return [];
  return data.map(dbEventToEvent);
}

export async function getVenuePosts(venueId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false });

  if (error || !data) return mockPosts.filter(p => p.venueId === venueId);
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

export async function createVenue(data: {
  name: string;
  type: string;
  slug: string;
  location: string;
  description?: string;
  opening_hours?: string;
  address?: string;
  province?: string;
  // lat/lng: pass when live geocoding is wired up
  latitude?: number;
  longitude?: number;
}) {
  const { data: row, error } = await supabase
    .from('venues')
    .insert(data)
    .select()
    .single();

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
  const { data, error } = await supabase
    .from('venue_owners')
    .select('venue_id, name')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return { venueId: data.venue_id, ownerName: data.name };
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

export async function getAllEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(20);

  if (error || !data) return [];
  return data.map(dbEventToEvent);
}

export async function createPost(data: { venue_id: string; content: string }) {
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

function localFirst<T extends Venue>(venues: T[], city: string): T[] {
  const c = city.toLowerCase();
  return [...venues].sort((a, b) => {
    const aLocal = a.city.toLowerCase().includes(c) || a.neighborhood.toLowerCase().includes(c) || c.includes(a.city.toLowerCase()) ? 1 : 0;
    const bLocal = b.city.toLowerCase().includes(c) || b.neighborhood.toLowerCase().includes(c) || c.includes(b.city.toLowerCase()) ? 1 : 0;
    return bLocal - aLocal;
  });
}

export async function getTrendingPlaces(city?: string): Promise<TrendingVenue[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: cis, error } = await supabase
    .from('check_ins')
    .select('venue_id')
    .gte('created_at', sevenDaysAgo);

  const fallback = [...mockVenues]
    .sort((a, b) => b.followerCount - a.followerCount)
    .slice(0, 5)
    .map(v => ({ ...v, weeklyCheckins: Math.round(v.followerCount / 5) }));

  if (error || !cis || cis.length === 0) return fallback;

  const counts: Record<string, number> = {};
  for (const ci of cis) counts[ci.venue_id] = (counts[ci.venue_id] ?? 0) + 1;

  const topIds = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([id]) => id);
  if (topIds.length === 0) return fallback;

  const { data: rows, error: ve } = await supabase
    .from('venues').select('*').in('id', topIds).eq('is_active', true);

  if (ve || !rows || rows.length === 0) return fallback;

  const venues = rows
    .map(r => ({ ...dbVenueToVenue(r), weeklyCheckins: counts[r.id] ?? 0 }))
    .sort((a, b) => b.weeklyCheckins - a.weeklyCheckins);

  if (!city) return venues.slice(0, 5);
  return localFirst(venues, city).slice(0, 5);
}

export async function getHappeningTonight(): Promise<TonightEvent[]> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('*, venues(name, slug, type)')
    .gte('event_date', dayStart)
    .lt('event_date', dayEnd)
    .order('event_date', { ascending: true });

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

export async function getNewPlaces(city?: string): Promise<Venue[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .gte('created_at', sevenDaysAgo)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) return [];
  const venues = data.map(dbVenueToVenue);
  if (!city) return venues.slice(0, 5);
  return localFirst(venues, city).slice(0, 5);
}

export async function getMostLovedPlaces(city?: string): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .gt('regulars_count', 0)
    .eq('is_active', true)
    .order('regulars_count', { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) {
    const fallback = [...mockVenues]
      .sort((a, b) => b.followerCount - a.followerCount)
      .filter(v => v.followerCount > 0);
    if (!city) return fallback.slice(0, 5);
    return localFirst(fallback, city).slice(0, 5);
  }
  const venues = data.map(dbVenueToVenue);
  if (!city) return venues.slice(0, 5);
  return localFirst(venues, city).slice(0, 5);
}

export async function getGlobalActivity(): Promise<ActivityItem[]> {
  const [ciRes, postRes] = await Promise.all([
    supabase
      .from('check_ins')
      .select('id, venue_id, visitor_name, is_ghost, created_at, visit_number')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('posts')
      .select('id, venue_id, content, created_at')
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const ciData = ciRes.data ?? [];
  const postData = postRes.data ?? [];

  if (ciData.length === 0 && postData.length === 0) {
    return [
      { id: 'm1', text: "Lerato checked in at Uncle Dee's Barbershop 💈", time: '2 min ago', initial: 'L' },
      { id: 'm2', text: "Mama Zulu's Shisanyama posted an update", time: '18 min ago', initial: '✦' },
      { id: 'm3', text: 'Someone checked in at Sipho Corner Spaza', time: '1 hr ago', initial: '👤' },
      { id: 'm4', text: "Thabo became a regular at Mama Zulu's", time: '3 hr ago', initial: 'T' },
      { id: 'm5', text: 'Faith Assembly Church added a new event', time: '5 hr ago', initial: '✦' },
    ];
  }

  const venueIds = [...new Set([...ciData.map(r => r.venue_id), ...postData.map(r => r.venue_id)])];
  const { data: vRows } = await supabase.from('venues').select('id, name').in('id', venueIds);
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

export async function getActiveStories(venueId?: string): Promise<Story[]> {
  let query = supabase
    .from('place_stories')
    .select('*, venues(name, type)')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (venueId) query = query.eq('venue_id', venueId);

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

export async function getLocalJobs(neighbourhood: string): Promise<LocalJob[]> {
  const { data, error } = await supabase
    .from('local_jobs')
    .select('*')
    .eq('neighbourhood', neighbourhood)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
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
