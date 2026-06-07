/**
 * alerts/providers/eskom.ts — EskomSePush adapter.
 *
 * Wraps the existing loadShedding.ts service and converts responses into
 * the unified KayaaAlert shape.
 *
 * Production: set VITE_ESKOMSEPUSH_KEY in .env
 * Development: works without a key — returns national status only.
 * Area schedule: requires key + a saved area ID.
 */

import {
  getLoadSheddingStatus,
  getAreaSchedule,
  timeUntil,
  slotLabel,
} from '../../services/loadShedding';
import type { KayaaAlert, AlertSeverity, AlertStatus, OutageSlot } from '../types';

const ESKOMSEPUSH_BASE = 'https://developer.sepush.co.za/business/2.0';
const API_KEY = import.meta.env.VITE_ESKOMSEPUSH_KEY as string | undefined;

// ─── EskomSePush area search ──────────────────────────────────────────────────

export interface EskomArea {
  id:     string;
  name:   string;
  region: string;
}

/**
 * Search for EskomSePush areas matching a suburb / city name.
 * Falls back to a curated mock list when no API key is present.
 */
export async function searchEskomAreas(query: string): Promise<EskomArea[]> {
  if (!query.trim()) return [];

  if (!API_KEY) {
    const q = query.toLowerCase();
    return MOCK_AREAS.filter(
      a => a.name.toLowerCase().includes(q) || a.region.toLowerCase().includes(q),
    );
  }

  try {
    const res = await fetch(
      `${ESKOMSEPUSH_BASE}/areas_search?text=${encodeURIComponent(query)}`,
      { headers: { token: API_KEY } },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.areas ?? []).map((a: any) => ({
      id:     a.id     ?? '',
      name:   a.name   ?? '',
      region: a.region ?? '',
    }));
  } catch (err) {
    console.warn('[Eskom] area search failed:', err);
    return [];
  }
}

/**
 * Nearby area lookup by GPS coordinates.
 * Requires API key; silently returns empty when unavailable.
 */
export async function getNearbyEskomAreas(lat: number, lon: number): Promise<EskomArea[]> {
  if (!API_KEY) return [];
  try {
    const res = await fetch(
      `${ESKOMSEPUSH_BASE}/areas_nearby?lat=${lat}&lon=${lon}`,
      { headers: { token: API_KEY } },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.areas ?? []).map((a: any) => ({
      id:     a.id     ?? '',
      name:   a.name   ?? '',
      region: a.region ?? '',
    }));
  } catch (err) {
    console.warn('[Eskom] nearby areas failed:', err);
    return [];
  }
}

// ─── Load shedding → KayaaAlert ───────────────────────────────────────────────

export async function getLoadSheddingAlerts(
  suburb: string,
  city:   string,
  areaId?: string,
): Promise<KayaaAlert[]> {
  const [status, schedule] = await Promise.all([
    getLoadSheddingStatus(),
    areaId ? getAreaSchedule(areaId) : Promise.resolve(null),
  ]);

  if (status.source === 'unavailable') return [];

  const stage    = status.stage;
  const areaName = schedule?.areaName || suburb || city;

  const severity: AlertSeverity =
    stage === 0 ? 'low' :
    stage <= 2  ? 'medium' :
    stage <= 4  ? 'high' : 'critical';

  const alertStatus: AlertStatus = 'active'; // always informational/active

  // Title
  const title = stage === 0
    ? `No load shedding — ${areaName}`
    : `Load shedding Stage ${stage} — ${areaName}`;

  // Description
  const nextSlot: OutageSlot | null = schedule?.nextOutage ?? null;
  let description: string;
  if (nextSlot) {
    description = `Next outage: ${slotLabel({ ...nextSlot, stage: nextSlot.stage ?? 0 })} (${timeUntil(nextSlot.start)}).`;
    if (stage > 0) description += ` Stage ${stage} nationally.`;
  } else if (stage === 0) {
    description = 'No load shedding is currently active. Enjoy the power.';
  } else if (stage > 0 && !areaId) {
    description = `Stage ${stage} load shedding is active nationally. Link your area for a local schedule.`;
  } else {
    description = `Stage ${stage} is active. No upcoming outage slots found for your area.`;
  }

  const upcomingSlots: OutageSlot[] = (schedule?.upcoming ?? []).map(s => ({
    start: s.start,
    end:   s.end,
    stage: s.stage,
  }));

  const alert: KayaaAlert = {
    id:          `ls-status-${Date.now()}`,
    type:        'load_shedding',
    title,
    description,
    suburb:      suburb || '',
    city:        city   || '',
    sourceType:  'official',
    sourceName:  'EskomSePush / Eskom',
    sourceUrl:   'https://eskomsepush.gumroad.com/l/api',
    severity,
    startsAt:    nextSlot?.start,
    endsAt:      nextSlot?.end,
    createdAt:   status.updatedAt,
    updatedAt:   status.updatedAt,
    status:      alertStatus,
    externalReferenceId: areaId,
    providerAreaId:      areaId,
    loadSheddingStage:    stage,
    loadSheddingSchedule: upcomingSlots,
  };

  return [alert];
}

// ─── Mock area list (used when VITE_ESKOMSEPUSH_KEY is missing) ──────────────

const MOCK_AREAS: EskomArea[] = [
  { id: 'eskde-10-berea',          name: 'Berea',              region: 'Eskom Direct Jhb' },
  { id: 'eskde-10-yeoville',       name: 'Yeoville',           region: 'Eskom Direct Jhb' },
  { id: 'eskde-10-rosebank2',      name: 'Rosebank',           region: 'Eskom Direct Jhb' },
  { id: 'eskde-10-sandton',        name: 'Sandton',            region: 'Eskom Direct Jhb' },
  { id: 'eskde-10-randburg',       name: 'Randburg',           region: 'Eskom Direct Jhb' },
  { id: 'eskde-10-soweto',         name: 'Soweto',             region: 'Eskom Direct Jhb' },
  { id: 'eskde-10-doornfontein',   name: 'Doornfontein',       region: 'Eskom Direct Jhb' },
  { id: 'eskde-10-jeppestown',     name: 'Jeppestown',         region: 'Eskom Direct Jhb' },
  { id: 'eskde-10-fourways',       name: 'Fourways',           region: 'Eskom Direct Jhb' },
  { id: 'tshwane-10-centurion',    name: 'Centurion',          region: 'Tshwane' },
  { id: 'tshwane-10-pretoria',     name: 'Pretoria Central',   region: 'Tshwane' },
  { id: 'tshwane-10-hatfield',     name: 'Hatfield',           region: 'Tshwane' },
  { id: 'capetown-10-cbd',         name: 'Cape Town CBD',      region: 'Cape Town' },
  { id: 'capetown-10-observatory', name: 'Observatory',        region: 'Cape Town' },
  { id: 'capetown-10-claremont',   name: 'Claremont',          region: 'Cape Town' },
  { id: 'ethekwini-10-berea',      name: 'Berea (Durban)',     region: 'eThekwini' },
  { id: 'ethekwini-10-cbd',        name: 'Durban CBD',         region: 'eThekwini' },
  { id: 'ethekwini-10-morningside',name: 'Morningside Durban', region: 'eThekwini' },
];
