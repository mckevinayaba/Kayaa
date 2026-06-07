/**
 * alerts/providers/community.ts — community-sourced alerts adapter.
 *
 * Pulls structured safety_reports and utility_reports from Supabase and
 * normalises them into KayaaAlert with sourceType = 'community'.
 *
 * Reports with 3+ corroborating entries are auto-elevated to 'verified_local'.
 * All community alerts expire after 24 hours unless refreshed.
 */

import { getSafetyReports, getUtilityReports } from '../../lib/api';
import type { SafetyReport, SafetyIncidentType, UtilityReport } from '../../lib/api';
import type { KayaaAlert, AlertSeverity, AlertSourceType } from '../types';

// ─── Expiry window ────────────────────────────────────────────────────────────

const COMMUNITY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Safety incidents ─────────────────────────────────────────────────────────

const INCIDENT_SEVERITY: Record<SafetyIncidentType, AlertSeverity> = {
  violence:   'critical',
  fire:       'critical',
  crime:      'high',
  missing:    'high',
  suspicious: 'medium',
  road:       'medium',
  other:      'medium',
};

const INCIDENT_LABEL: Record<SafetyIncidentType, string> = {
  crime:      'Crime incident',
  suspicious: 'Suspicious activity',
  violence:   'Violence',
  missing:    'Missing person',
  road:       'Road incident',
  fire:       'Fire / gas',
  other:      'Safety alert',
};

function safetyToAlert(r: SafetyReport, city: string): KayaaAlert {
  const label = INCIDENT_LABEL[r.incidentType] ?? 'Safety alert';
  return {
    id:          `safety-${r.id}`,
    type:        'safety',
    title:       r.title || label,
    description: r.details,
    suburb:      r.neighbourhood,
    city,
    locationText: r.landmark
      ? `${r.landmark} · ${r.neighbourhood}`
      : r.neighbourhood,
    sourceType:  'community',
    sourceName:  'Community report',
    severity:    INCIDENT_SEVERITY[r.incidentType] ?? 'medium',
    startsAt:    r.happenedAt,
    createdAt:   r.createdAt,
    updatedAt:   r.createdAt,
    status:      'active',
    reportedByUserId: r.userId ?? undefined,
    imageUrl:    r.imageUrl ?? undefined,
    mediaType:   r.mediaType ?? undefined,
    incidentType: r.incidentType,
    landmark:    r.landmark ?? undefined,
    happenedAt:  r.happenedAt,
    evidenceUrls: r.imageUrl ? [r.imageUrl] : undefined,
  };
}

// ─── Utility reports ──────────────────────────────────────────────────────────

const UTILITY_LABEL: Record<string, { title: string; severity: AlertSeverity }> = {
  power_out:      { title: 'Power outage',          severity: 'high'   },
  load_shedding:  { title: 'Load shedding',          severity: 'medium' },
  flickering:     { title: 'Flickering power',       severity: 'low'    },
  streetlights:   { title: 'Streetlights out',       severity: 'low'    },
  power_restored: { title: 'Power restored',         severity: 'low'    },
  no_water:       { title: 'No water supply',        severity: 'high'   },
  low_pressure:   { title: 'Low water pressure',     severity: 'medium' },
  dirty_water:    { title: 'Dirty / discoloured water', severity: 'high' },
  leak_burst:     { title: 'Water leak / burst pipe', severity: 'high'  },
  water_restored: { title: 'Water restored',         severity: 'low'    },
};

function utilityToAlert(r: UtilityReport, city: string): KayaaAlert {
  const meta    = UTILITY_LABEL[r.issueType] ?? { title: r.issueType, severity: 'medium' as AlertSeverity };
  const isPower = r.category === 'power';
  const isResolved = r.issueType.endsWith('_restored');

  // Auto-elevate trust when 3+ corroborating reports
  const sourceType: AlertSourceType = r.reportCount >= 3 ? 'verified_local' : 'community';

  const title = `${meta.title} — ${r.areaDetail || r.neighbourhood}`;
  const description = r.note
    ? r.note
    : `${meta.title} reported in ${r.areaDetail || r.neighbourhood}`
      + (r.reportCount > 1 ? ` (${r.reportCount} reports).` : '.');

  return {
    id:          `utility-${r.id}`,
    type:        isPower ? 'service_disruption' : 'water_outage',
    title,
    description,
    suburb:      r.areaDetail || r.neighbourhood,
    city,
    sourceType,
    sourceName:  sourceType === 'verified_local'
      ? `Verified — ${r.reportCount} reports`
      : `${r.reportCount} community report${r.reportCount !== 1 ? 's' : ''}`,
    severity:    isResolved ? 'low' : meta.severity,
    createdAt:   r.createdAt,
    updatedAt:   r.createdAt,
    status:      isResolved ? 'resolved' : 'active',
    imageUrl:    r.photoUrl ?? undefined,
    evidenceUrls: r.photoUrl ? [r.photoUrl] : undefined,
  };
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function getCommunityAlerts(suburb: string, city: string): Promise<KayaaAlert[]> {
  if (!suburb) return [];

  const cutoff = Date.now() - COMMUNITY_EXPIRY_MS;

  try {
    const [safetyRaw, powerRaw, waterRaw] = await Promise.all([
      getSafetyReports(suburb),
      getUtilityReports(suburb, 'power'),
      getUtilityReports(suburb, 'water'),
    ]);

    const safetyAlerts = (safetyRaw as SafetyReport[])
      .filter(r => new Date(r.createdAt).getTime() > cutoff)
      .map(r => safetyToAlert(r, city));

    const utilityAlerts = [
      ...(powerRaw as UtilityReport[]),
      ...(waterRaw as UtilityReport[]),
    ]
      .filter(r => new Date(r.createdAt).getTime() > cutoff)
      .map(r => utilityToAlert(r, city));

    return [...safetyAlerts, ...utilityAlerts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('[Community] alerts fetch failed:', err);
    return [];
  }
}
