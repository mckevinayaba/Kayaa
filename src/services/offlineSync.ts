/**
 * OfflineSync — flushes the kayaa_offline_checkins queue to Supabase
 * whenever the device comes back online.
 *
 * Queue format (written by CheckInModal + CheckInPage):
 *   { venueId, venueName, venueSlug?, note, isPublic?, queuedAt, synced? }
 */
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueuedCheckIn {
  venueId: string;
  venueName: string;
  venueSlug?: string;
  note: string | null;
  isPublic?: boolean;
  queuedAt: string;
  synced?: boolean;
}

// ── Key — must match CheckInModal + CheckInPage ───────────────────────────────

const QUEUE_KEY = 'kayaa_offline_checkins';

// ── Helpers ───────────────────────────────────────────────────────────────────

function readQueue(): QueuedCheckIn[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedCheckIn[];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedCheckIn[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch { /* storage full — ignore */ }
}

// ── Core sync ─────────────────────────────────────────────────────────────────

export async function syncOfflineCheckIns(): Promise<void> {
  const queue   = readQueue();
  const pending = queue.filter(c => !c.synced);

  if (pending.length === 0) return;

  console.log(`[OfflineSync] syncing ${pending.length} queued check-in(s)…`);

  for (const entry of pending) {
    try {
      const payload: Record<string, unknown> = {
        venue_id:       entry.venueId,
        is_ghost:       false,
        is_first_visit: false,
        visit_number:   1,
        is_public:      entry.isPublic ?? true,
        created_at:     entry.queuedAt,   // preserve original timestamp
      };
      if (entry.note?.trim()) payload.note = entry.note.trim();

      const { error } = await supabase.from('check_ins').insert(payload);

      if (!error) {
        entry.synced = true;
        console.log(`[OfflineSync] ✓ synced check-in for ${entry.venueName}`);
      } else {
        console.warn(`[OfflineSync] ✗ ${entry.venueName}:`, error.message);
      }
    } catch (err) {
      console.warn('[OfflineSync] unexpected error:', err);
    }
  }

  // Persist updated sync flags
  writeQueue(queue);

  // Clean up items that synced >7 days ago
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const cleaned = queue.filter(c => {
    if (c.synced) return new Date(c.queuedAt).getTime() > cutoff;
    return true; // keep unsynced items regardless of age
  });
  writeQueue(cleaned);
}

// ── Auto-sync ─────────────────────────────────────────────────────────────────

let _autoSyncStarted = false;

export function startAutoSync(): void {
  if (_autoSyncStarted || typeof window === 'undefined') return;
  _autoSyncStarted = true;

  // Flush queue whenever the device comes back online
  window.addEventListener('online', () => {
    console.log('[OfflineSync] back online — flushing queue…');
    syncOfflineCheckIns();
  });

  // Periodic flush every 5 minutes when online
  setInterval(() => {
    if (navigator.onLine) syncOfflineCheckIns();
  }, 5 * 60 * 1000);

  // Run once on startup in case items were left over from last session
  if (navigator.onLine) syncOfflineCheckIns();
}

// ── Convenience class facade (matches spec's OfflineSync.startAutoSync()) ─────

export class OfflineSync {
  static syncCheckIns   = syncOfflineCheckIns;
  static startAutoSync  = startAutoSync;
}
