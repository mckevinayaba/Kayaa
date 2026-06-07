/**
 * alerts/types.ts — unified alert type system for Kayaa.
 *
 * All alert sources (official APIs, verified reports, community submissions)
 * normalise into KayaaAlert so the UI doesn't care where an alert came from.
 */

// ─── Core enums ───────────────────────────────────────────────────────────────

export type AlertType =
  | 'load_shedding'
  | 'weather'
  | 'water_outage'
  | 'road_closure'
  | 'safety'
  | 'hazard'
  | 'service_disruption'
  | 'community';

/** Determines visual treatment and trust label on every card. */
export type AlertSourceType = 'official' | 'verified_local' | 'community';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus = 'active' | 'resolved' | 'expired' | 'pending_review';

// ─── Utility slot (load shedding schedule) ────────────────────────────────────

export interface OutageSlot {
  start: string;   // ISO
  end:   string;   // ISO
  stage?: number;
}

// ─── Unified alert shape ──────────────────────────────────────────────────────

export interface KayaaAlert {
  id:          string;
  type:        AlertType;
  title:       string;
  description: string;

  // Location
  suburb:       string;
  city:         string;
  province?:    string;
  locationText?: string;   // human-readable area label
  latitude?:    number;
  longitude?:   number;

  // Trust
  sourceType:  AlertSourceType;
  sourceName:  string;
  sourceUrl?:  string;

  // Severity and timing
  severity:   AlertSeverity;
  startsAt?:  string;  // ISO
  endsAt?:    string;  // ISO
  createdAt:  string;
  updatedAt:  string;
  status:     AlertStatus;

  // Accountability
  reportedByUserId?:  string;
  verifiedByUserId?:  string;
  evidenceUrls?:      string[];
  externalReferenceId?: string;
  providerAreaId?:    string;

  // Load shedding extras
  loadSheddingStage?:    number;
  loadSheddingSchedule?: OutageSlot[];

  // Weather extras
  weatherWarningType?:  string;
  weatherWarningLevel?: string;  // 'Yellow' | 'Orange' | 'Red'

  // Community/safety extras
  incidentType?: string;
  landmark?:     string;
  imageUrl?:     string;
  mediaType?:    'photo' | 'video';
  happenedAt?:   string;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const SOURCE_LABEL: Record<AlertSourceType, string> = {
  official:       'Official',
  verified_local: 'Verified local',
  community:      'Community reported',
};

export const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#FBBF24',
  low:      '#39D98A',
};

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
};

export const TYPE_LABEL: Record<AlertType, { label: string; emoji: string }> = {
  load_shedding:      { label: 'Load shedding',     emoji: '⚡' },
  weather:            { label: 'Weather warning',    emoji: '🌩' },
  water_outage:       { label: 'Water outage',       emoji: '💧' },
  road_closure:       { label: 'Road closure',       emoji: '🚧' },
  safety:             { label: 'Safety',             emoji: '🛡' },
  hazard:             { label: 'Hazard',             emoji: '⚠️' },
  service_disruption: { label: 'Service disruption', emoji: '🔧' },
  community:          { label: 'Community',          emoji: '🏘' },
};
