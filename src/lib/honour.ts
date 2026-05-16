/**
 * honour.ts — "Honour this place" feature
 *
 * Graceful pattern: localStorage tracks local state optimistically.
 * Supabase writes are attempted but failures are silent — the UX
 * never blocks on network availability.
 */

import { supabase } from './supabase';

const LS_PREFIX = 'kayaa_honour_';

// ── Local helpers ─────────────────────────────────────────────────────────────

/** Returns true if the current device has already honoured this venue. */
export function hasHonouredVenue(venueId: string): boolean {
  try {
    return localStorage.getItem(`${LS_PREFIX}${venueId}`) === '1';
  } catch {
    return false;
  }
}

function markHonouredLocally(venueId: string) {
  try {
    localStorage.setItem(`${LS_PREFIX}${venueId}`, '1');
  } catch { /* ignore */ }
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

/**
 * Fetch the current honour count for a venue.
 * Returns 0 gracefully if the table doesn't exist yet.
 */
export async function getVenueHonourCount(venueId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('venue_honours')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', venueId);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ── Aggregated honour data ────────────────────────────────────────────────────

export interface HonouredVenueSummary {
  venueId: string;
  count: number;
}

/**
 * Return the top N most-honoured venue IDs with their counts.
 * Aggregates locally from the venue_honours table (no GROUP BY needed).
 */
export async function getMostHonouredVenueIds(limit = 12): Promise<HonouredVenueSummary[]> {
  try {
    const { data, error } = await supabase
      .from('venue_honours')
      .select('venue_id')
      .limit(1000);

    if (error || !data || data.length === 0) return [];

    // Count by venue_id in JS
    const counts: Record<string, number> = {};
    for (const row of data) {
      const id = row.venue_id as string;
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    }

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([venueId, count]) => ({ venueId, count }));
  } catch {
    return [];
  }
}

/**
 * Persist an honour to Supabase.
 * Uses a unique constraint on (venue_id, session_id) to prevent duplicates.
 * Fails silently — the optimistic localStorage state is the source of truth for UX.
 */
export async function honourVenue(venueId: string, sessionId: string): Promise<void> {
  // Persist locally first so the UX never waits on network
  markHonouredLocally(venueId);

  try {
    await supabase
      .from('venue_honours')
      .insert({ venue_id: venueId, session_id: sessionId })
      .select()
      .single();
    // Ignore errors (duplicate, table missing, RLS) — local state is enough
  } catch { /* silent */ }
}

/** Returns a stable anonymous session ID (stored in localStorage). */
export function getSessionId(): string {
  const key = 'kayaa_session_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return 'anon';
  }
}
