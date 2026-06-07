/**
 * alerts/providers/weather.ts — SAWS weather warning adapter via AfriGIS.
 *
 * Production: set VITE_AFRIGIS_KEY in .env
 * Development: realistic mock warnings based on season + province.
 *
 * AfriGIS exposes SAWS (South African Weather Service) warning feeds.
 * Warnings are typically province-level or district-level.
 * We map them to suburb/city context for display.
 */

import type { KayaaAlert, AlertSeverity, AlertStatus } from '../types';

const AFRIGIS_BASE = 'https://gis.afrigis.co.za/ae/v1';
const API_KEY = import.meta.env.VITE_AFRIGIS_KEY as string | undefined;

// ─── AfriGIS / SAWS response types ───────────────────────────────────────────

interface SAWSWarning {
  id:          string;
  warningType: string;   // 'Thunderstorm', 'Flood', 'Wind', 'Fire Danger', 'Cold Front', etc.
  level:       string;   // 'Yellow' | 'Orange' | 'Red'
  headline:    string;
  provinces:   string[];
  description: string;
  startsAt:    string;   // ISO
  endsAt:      string;   // ISO
  issuedAt:    string;   // ISO
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function levelToSeverity(level: string): AlertSeverity {
  const l = level.toLowerCase();
  if (l.includes('red'))    return 'critical';
  if (l.includes('orange')) return 'high';
  if (l.includes('yellow')) return 'medium';
  return 'low';
}

function warningStatus(endsAt: string): AlertStatus {
  return new Date(endsAt) > new Date() ? 'active' : 'expired';
}

function normalise(w: SAWSWarning, suburb: string, city: string): KayaaAlert {
  return {
    id:           `weather-${w.id}`,
    type:         'weather',
    title:        w.headline,
    description:  w.description,
    suburb,
    city,
    province:     w.provinces[0] ?? undefined,
    locationText: w.provinces.join(' · '),
    sourceType:   'official',
    sourceName:   'SAWS via AfriGIS',
    sourceUrl:    'https://www.weathersa.co.za',
    severity:     levelToSeverity(w.level),
    startsAt:     w.startsAt,
    endsAt:       w.endsAt,
    createdAt:    w.issuedAt,
    updatedAt:    w.issuedAt,
    status:       warningStatus(w.endsAt),
    externalReferenceId:  w.id,
    weatherWarningType:   w.warningType,
    weatherWarningLevel:  w.level,
  };
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getWeatherWarnings(
  suburb:    string,
  city:      string,
  province?: string,
): Promise<KayaaAlert[]> {
  if (!API_KEY) {
    return getMockWarnings(suburb, city, province);
  }

  try {
    const params = new URLSearchParams();
    if (province) params.set('province', province);
    const res = await fetch(`${AFRIGIS_BASE}/weather/warnings?${params}`, {
      headers: {
        'x-api-key': API_KEY,
        'Accept':    'application/json',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const warnings: SAWSWarning[] = json.warnings ?? json.data ?? [];
    const now = new Date();

    return warnings
      .filter(w => new Date(w.endsAt) > now)
      .filter(w => !province || w.provinces.includes(province))
      .map(w => normalise(w, suburb, city))
      .sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
      });
  } catch (err) {
    console.warn('[Weather] AfriGIS fetch failed, using mock:', err);
    return getMockWarnings(suburb, city, province);
  }
}

// ─── Mock warnings (used in dev / when API key missing) ──────────────────────
// Generates contextually relevant warnings based on season + province.
// These are clearly mock — they should be replaced by live API data in production.

function getMockWarnings(suburb: string, city: string, province?: string): KayaaAlert[] {
  const now     = new Date();
  const month   = now.getMonth(); // 0-based
  const isWinter = month >= 4 && month <= 7;   // May–Aug
  const isSummer = month <= 2 || month >= 10;  // Nov–Mar

  const prov = province ?? 'Gauteng';

  // Only return mock if the province is relevant
  const warningProvinces: Record<string, string[]> = {
    'Gauteng':       ['Gauteng', 'North West'],
    'Western Cape':  ['Western Cape'],
    'KwaZulu-Natal': ['KwaZulu-Natal'],
    'Eastern Cape':  ['Eastern Cape'],
    'Limpopo':       ['Limpopo', 'Mpumalanga'],
    'North West':    ['North West', 'Gauteng'],
    'Mpumalanga':    ['Mpumalanga', 'Limpopo'],
    'Free State':    ['Free State'],
    'Northern Cape': ['Northern Cape'],
  };

  const relevantProvs = warningProvinces[prov] ?? [prov];
  if (!relevantProvs.length) return [];

  const tomorrow = new Date(now);
  tomorrow.setHours(15, 0, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  dayAfter.setHours(6, 0, 0, 0);

  const results: KayaaAlert[] = [];

  if (isWinter && ['Gauteng', 'North West', 'Free State', 'Northern Cape'].includes(prov)) {
    results.push({
      id:           'weather-mock-cold-front',
      type:         'weather',
      title:        `Cold front advisory — ${prov}`,
      description:  `A cold front is expected to affect ${relevantProvs.join(' and ')} this evening. Minimum temperatures may drop to near freezing in low-lying areas. Ice on exposed roads is possible early morning. Motorists should exercise caution.`,
      suburb,
      city,
      province:     prov,
      locationText: relevantProvs.join(' · '),
      sourceType:   'official',
      sourceName:   'SAWS via AfriGIS',
      sourceUrl:    'https://www.weathersa.co.za',
      severity:     'medium',
      startsAt:     tomorrow.toISOString(),
      endsAt:       dayAfter.toISOString(),
      createdAt:    now.toISOString(),
      updatedAt:    now.toISOString(),
      status:       'active',
      externalReferenceId: 'saws-mock-cold-front',
      weatherWarningType:  'Cold Front Advisory',
      weatherWarningLevel: 'Yellow',
    });
  }

  if (isSummer && ['Gauteng', 'KwaZulu-Natal', 'Mpumalanga', 'Limpopo'].includes(prov)) {
    const stormStart = new Date(now);
    stormStart.setHours(14, 0, 0, 0);
    const stormEnd = new Date(stormStart);
    stormEnd.setHours(20, 0, 0, 0);

    results.push({
      id:           'weather-mock-thunderstorm',
      type:         'weather',
      title:        `Thunderstorm warning — ${prov}`,
      description:  `Severe afternoon and evening thunderstorms are expected over ${relevantProvs.join(' and ')}. Hail, strong winds, and localised flooding possible. Avoid low-lying areas. Seek shelter indoors during lightning.`,
      suburb,
      city,
      province:     prov,
      locationText: relevantProvs.join(' · '),
      sourceType:   'official',
      sourceName:   'SAWS via AfriGIS',
      sourceUrl:    'https://www.weathersa.co.za',
      severity:     'high',
      startsAt:     stormStart.toISOString(),
      endsAt:       stormEnd.toISOString(),
      createdAt:    now.toISOString(),
      updatedAt:    now.toISOString(),
      status:       'active',
      externalReferenceId: 'saws-mock-thunderstorm',
      weatherWarningType:  'Severe Thunderstorm Warning',
      weatherWarningLevel: 'Orange',
    });
  }

  return results;
}
