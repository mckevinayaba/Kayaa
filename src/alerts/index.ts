/**
 * alerts/index.ts — unified alert fetcher.
 *
 * Combines official (Eskom, SAWS) and community providers into one bundle.
 * The UI imports from here — never from individual providers directly.
 */

import { getLoadSheddingAlerts } from './providers/eskom';
import { getWeatherWarnings }   from './providers/weather';
import { getCommunityAlerts }   from './providers/community';
import type { KayaaAlert, AlertSeverity } from './types';

export type { KayaaAlert };
export * from './types';
export { searchEskomAreas, getNearbyEskomAreas } from './providers/eskom';
export type { EskomArea } from './providers/eskom';

// ─── Persisted area preference ────────────────────────────────────────────────

const AREA_ID_KEY = 'kayaa_eskom_area_id';
const AREA_NAME_KEY = 'kayaa_eskom_area_name';

export function getSavedEskomArea(): { id: string; name: string } | null {
  try {
    const id   = localStorage.getItem(AREA_ID_KEY);
    const name = localStorage.getItem(AREA_NAME_KEY);
    if (id) return { id, name: name ?? id };
    return null;
  } catch { return null; }
}

export function saveEskomArea(id: string, name: string): void {
  try {
    localStorage.setItem(AREA_ID_KEY, id);
    localStorage.setItem(AREA_NAME_KEY, name);
  } catch { /* ignore */ }
}

export function clearEskomArea(): void {
  try {
    localStorage.removeItem(AREA_ID_KEY);
    localStorage.removeItem(AREA_NAME_KEY);
  } catch { /* ignore */ }
}

// ─── Alert bundle ─────────────────────────────────────────────────────────────

export interface AlertBundle {
  official:    KayaaAlert[];   // from APIs (Eskom + SAWS)
  community:   KayaaAlert[];   // from community reports
  all:         KayaaAlert[];   // official first, then community
  loadedAt:    string;
}

export interface FetchAlertsOptions {
  suburb:    string;
  city:      string;
  province?: string;
  eskomAreaId?: string | null;
}

const SEV_ORDER: Record<AlertSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

export async function fetchAllAlerts(opts: FetchAlertsOptions): Promise<AlertBundle> {
  const { suburb, city, province, eskomAreaId } = opts;

  const [lsAlerts, weatherAlerts, communityAlerts] = await Promise.all([
    getLoadSheddingAlerts(suburb, city, eskomAreaId ?? undefined),
    getWeatherWarnings(suburb, city, province),
    getCommunityAlerts(suburb, city),
  ]);

  const official = [...lsAlerts, ...weatherAlerts]
    .sort((a, b) => (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3));

  const community = communityAlerts.filter(a => a.sourceType !== 'official');

  return {
    official,
    community,
    all:      [...official, ...community],
    loadedAt: new Date().toISOString(),
  };
}
