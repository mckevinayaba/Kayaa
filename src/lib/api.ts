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
    checkinCount: row.regulars_count ?? 0,
    followerCount: row.regulars_count ?? 0,
    isOpen: true,
    openHours: row.opening_hours ?? undefined,
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
