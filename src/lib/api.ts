import { supabase } from './supabase';
import { mockVenues, mockEvents, mockPosts } from './mockData';
import type { Venue, Event, Post } from '../types';

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
