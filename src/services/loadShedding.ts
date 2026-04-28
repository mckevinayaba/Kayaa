// ─────────────────────────────────────────────────────────────────────────────
// Load Shedding Service
// Uses the EskomSePush public API (free tier — no key needed for status checks).
// Full schedule requires a free API key from https://eskomsepush.gumroad.com/l/api
// Set VITE_ESKOMSEPUSH_KEY in .env to enable area schedules.
// ─────────────────────────────────────────────────────────────────────────────

const ESKOMSEPUSH_BASE = 'https://developer.sepush.co.za/business/2.0';
const API_KEY = import.meta.env.VITE_ESKOMSEPUSH_KEY as string | undefined;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoadSheddingStatus {
  stage: number;         // 0 = no load shedding
  updatedAt: string;     // ISO timestamp
  source: 'api' | 'cache' | 'unavailable';
}

export interface OutageSlot {
  start: string;   // ISO
  end: string;     // ISO
  stage: number;
}

export interface AreaSchedule {
  areaName: string;
  nextOutage: OutageSlot | null;
  upcoming: OutageSlot[];  // next 3 slots
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const STATUS_TTL_MS  = 5 * 60 * 1000;   // 5 min
const SCHEDULE_TTL_MS = 30 * 60 * 1000; // 30 min

function fromCache<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - ts > ttlMs) return null;
    return data;
  } catch { return null; }
}

function toCache<T>(key: string, data: T): void {
  try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); }
  catch { /* storage full — ignore */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Human-readable "in X minutes / X hours" */
export function timeUntil(isoStart: string): string {
  const diffMs   = new Date(isoStart).getTime() - Date.now();
  if (diffMs <= 0) return 'now';
  const mins  = Math.floor(diffMs / 60_000);
  if (mins < 60)   return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)  return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

/** "HH:mm – HH:mm" slot label */
export function slotLabel(slot: OutageSlot): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmt(slot.start)} – ${fmt(slot.end)}`;
}

// ─── Stage fetch ──────────────────────────────────────────────────────────────

export async function getLoadSheddingStatus(): Promise<LoadSheddingStatus> {
  const cached = fromCache<LoadSheddingStatus>('ls_status', STATUS_TTL_MS);
  if (cached) return cached;

  try {
    const headers: HeadersInit = API_KEY ? { token: API_KEY } : {};
    const res  = await fetch(`${ESKOMSEPUSH_BASE}/status`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // EskomSePush response shape: { status: { eskom: { stage, ... } } }
    const stage = Number(json?.status?.eskom?.stage ?? json?.status?.capetown?.stage ?? 0);
    const result: LoadSheddingStatus = { stage, updatedAt: new Date().toISOString(), source: 'api' };
    toCache('ls_status', result);
    return result;
  } catch (err) {
    console.warn('[LoadShedding] status fetch failed:', err);
    return { stage: 0, updatedAt: new Date().toISOString(), source: 'unavailable' };
  }
}

// ─── Area schedule ────────────────────────────────────────────────────────────

/**
 * Fetch the next outages for a named area.
 * Requires VITE_ESKOMSEPUSH_KEY env var.
 * Falls back to an empty schedule gracefully.
 */
export async function getAreaSchedule(areaId: string): Promise<AreaSchedule> {
  if (!API_KEY) {
    return { areaName: areaId, nextOutage: null, upcoming: [] };
  }

  const cacheKey = `ls_area_${areaId}`;
  const cached   = fromCache<AreaSchedule>(cacheKey, SCHEDULE_TTL_MS);
  if (cached) return cached;

  try {
    const res  = await fetch(`${ESKOMSEPUSH_BASE}/area?id=${encodeURIComponent(areaId)}&test=current`, {
      headers: { token: API_KEY },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // Parse events array
    const events: OutageSlot[] = (json?.schedule?.days ?? []).flatMap((day: {
      stages: string[][];
      date: string;
    }) =>
      (day.stages ?? []).flatMap((slots: string[], stageIdx: number) =>
        slots.map((slot: string) => {
          const [startTime, endTime] = slot.split('-');
          const start = new Date(`${day.date}T${startTime}:00+02:00`).toISOString();
          const end   = new Date(`${day.date}T${endTime}:00+02:00`).toISOString();
          return { start, end, stage: stageIdx + 1 } as OutageSlot;
        })
      )
    ).filter((s: OutageSlot) => new Date(s.end).getTime() > Date.now())
     .sort((a: OutageSlot, b: OutageSlot) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const result: AreaSchedule = {
      areaName: json?.info?.name ?? areaId,
      nextOutage: events[0] ?? null,
      upcoming:   events.slice(0, 3),
    };
    toCache(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[LoadShedding] area fetch failed:', err);
    return { areaName: areaId, nextOutage: null, upcoming: [] };
  }
}

// ─── Notification subscription (local) ───────────────────────────────────────

export interface LoadSheddingPrefs {
  areaId: string;
  alert30min: boolean;
  alert2hours: boolean;
}

const PREFS_KEY = 'kayaa_ls_prefs';

export function getLoadSheddingPrefs(): LoadSheddingPrefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveLoadSheddingPrefs(prefs: LoadSheddingPrefs): void {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }
  catch { /* ignore */ }
}
