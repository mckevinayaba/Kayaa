/**
 * AlertsPage — neighbourhood live status board.
 *
 * Architecture (top → bottom):
 *   1. Header          — title + suburb + refresh
 *   2. Status strip    — 4 tappable tiles: Power · Water · Safety · Community
 *   3. Filter bar      — All · Power · Water · Safety · Community
 *   4. Alert feed      — structured cards with type + severity + area + time
 *   5. Quiet state     — actionable NudgeCard prompts when nothing active
 *
 * Intentionally NOT rendered here: venue discovery, category chips,
 * new-place cards, or any feed/browse blocks.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Zap, Droplet, RefreshCw, MapPin,
  Eye, Newspaper, Calendar, Megaphone, Search,
} from 'lucide-react';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import {
  getSafetyAlerts, getUserPostsForFeed, getNeighbourhoodPosts,
  getSafetyReports,
} from '../lib/api';
import type { UserPost, NeighbourhoodPost, SafetyReport, SafetyIncidentType } from '../lib/api';
import VideoPlayer from '../components/VideoPlayer';
import { LoadSheddingWidget } from '../components/safety/LoadSheddingWidget';
import { WaterStatus } from '../components/utility/WaterStatus';
import NudgeCard from '../components/NudgeCard';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType  = 'all' | 'power' | 'water' | 'safety' | 'community';
type AlertSeverity = 'alert' | 'watch' | 'normal';
type CommCat = 'news' | 'spotted' | 'event' | 'announcement' | 'lost_found';
type AlertCategory = 'alert' | CommCat;

interface AlertItem {
  id: string;
  severity:      AlertSeverity;
  category:      AlertCategory;
  area:          string;
  message:       string;
  createdAt:     string;
  author?:       string;
  // structured safety report fields (present when sourced from safety_reports table)
  incidentType?: SafetyIncidentType;
  title?:        string;
  imageUrl?:     string;
  mediaType?:    'photo' | 'video';
  landmark?:     string;
  happenedAt?:   string;
}

// ─── Visual config ────────────────────────────────────────────────────────────

const ALERT_CAT: Record<AlertCategory, {
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  label: string;
}> = {
  alert:        { icon: ShieldAlert, color: '#EF4444', label: 'Safety' },
  news:         { icon: Newspaper,   color: '#60A5FA', label: 'News' },
  spotted:      { icon: Eye,         color: '#FBBF24', label: 'Spotted' },
  event:        { icon: Calendar,    color: '#F472B6', label: 'Event' },
  announcement: { icon: Megaphone,   color: '#A78BFA', label: 'Announcement' },
  lost_found:   { icon: Search,      color: '#FB923C', label: 'Lost & Found' },
};

// Incident type → display label + emoji for structured safety reports
const INCIDENT_DISPLAY: Record<SafetyIncidentType, { label: string; emoji: string; color: string }> = {
  crime:      { label: 'Crime',              emoji: '🔒', color: '#EF4444' },
  suspicious: { label: 'Suspicious',         emoji: '👁',  color: '#F59E0B' },
  violence:   { label: 'Violence',           emoji: '⚠️', color: '#EF4444' },
  missing:    { label: 'Missing person',     emoji: '🧍', color: '#A78BFA' },
  road:       { label: 'Road issue',         emoji: '🚗', color: '#FBBF24' },
  fire:       { label: 'Fire / gas',         emoji: '🔥', color: '#F97316' },
  other:      { label: 'Safety alert',       emoji: '📢', color: '#60A5FA' },
};

const SEVERITY_CFG: Record<AlertSeverity, { label: string; color: string }> = {
  alert:  { label: 'Alert',  color: '#EF4444' },
  watch:  { label: 'Watch',  color: '#FBBF24' },
  normal: { label: 'Update', color: '#60A5FA' },
};

function categorySeverity(cat: AlertCategory): AlertSeverity {
  if (cat === 'alert')   return 'alert';
  if (cat === 'spotted' || cat === 'lost_found') return 'watch';
  return 'normal';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

// ─── Alert card ───────────────────────────────────────────────────────────────

function AlertCard({ item }: { item: AlertItem }) {
  // Structured safety report (from safety_reports table) vs legacy flat post
  const isStructured = item.category === 'alert' && !!item.incidentType;
  const incidentDisplay = isStructured ? INCIDENT_DISPLAY[item.incidentType!] : null;

  const cat  = ALERT_CAT[item.category] ?? ALERT_CAT.news;
  const sev  = SEVERITY_CFG[item.severity];
  const Icon = cat.icon;

  const accentColor = isStructured && incidentDisplay
    ? incidentDisplay.color
    : item.severity === 'alert' ? '#EF4444'
    : item.severity === 'watch' ? '#FBBF24'
    : cat.color;

  return (
    <div style={{
      background: `${accentColor}08`,
      border: `1px solid ${accentColor}20`,
      borderLeft: `3px solid ${accentColor}55`,
      borderRadius: '14px',
      overflow: 'hidden',
    }}>
      {/* Attached media: photo or video (structured reports only) */}
      {item.imageUrl && (
        item.mediaType === 'video' ? (
          <VideoPlayer
            src={item.imageUrl}
            maxHeight={200}
            borderRadius={0}
            label="Evidence clip"
          />
        ) : (
          <img
            src={item.imageUrl}
            alt="Incident photo"
            style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
          />
        )
      )}

      <div style={{ padding: '12px 14px' }}>
        {/* Top row: type badge · severity · time */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px', flexWrap: 'wrap', gap: '6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isStructured && incidentDisplay ? (
              /* Structured incident type badge */
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '10px',
                color: incidentDisplay.color, background: `${incidentDisplay.color}18`,
                borderRadius: '20px', padding: '2px 8px',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {incidentDisplay.emoji} {incidentDisplay.label}
              </span>
            ) : (
              /* Legacy badge */
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '10px',
                color: cat.color, background: `${cat.color}15`,
                borderRadius: '20px', padding: '2px 7px',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                <Icon size={10} color={cat.color} />
                {cat.label}
              </span>
            )}

            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '10px',
              color: sev.color,
            }}>
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: sev.color, display: 'inline-block', flexShrink: 0,
              }} />
              {sev.label}
            </span>
          </div>

          <span style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.3)',
          }}>
            {timeAgo(item.happenedAt ?? item.createdAt)}
          </span>
        </div>

        {/* Title (structured reports) */}
        {isStructured && item.title && (
          <p style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
            color: '#F0F6FC', margin: '0 0 5px', lineHeight: 1.3,
          }}>
            {item.title}
          </p>
        )}

        {/* Message / details */}
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.75)',
          margin: '0 0 8px', lineHeight: 1.55,
        }}>
          {item.message}
        </p>

        {/* Footer: area/landmark · author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.3)',
          }}>
            <MapPin size={9} color="rgba(255,255,255,0.25)" />
            {item.landmark ? `${item.landmark} · ` : ''}{item.area}
          </span>
          {item.author && (
            <>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                color: 'rgba(255,255,255,0.3)',
              }}>
                {item.author}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function AlertSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[80, 96, 80].map((h, i) => (
        <div key={i} style={{
          height: h, borderRadius: '14px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.05)',
        }} />
      ))}
    </div>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionLabel({ label, color, count }: { label: string; color: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
      <span style={{
        fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
        color, textTransform: 'uppercase', letterSpacing: '0.07em',
      }}>
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span style={{
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '10px',
          color: '#000', background: color, borderRadius: '20px', padding: '1px 6px',
        }}>
          {count}
        </span>
      )}
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

// ─── Status badge helper ──────────────────────────────────────────────────────

function StatusPill({
  dot, label, color, bg,
}: { dot: string; label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
      color, background: bg, borderRadius: '20px', padding: '3px 8px',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: '5px', height: '5px', borderRadius: '50%',
        background: dot, display: 'inline-block', flexShrink: 0,
      }} />
      {label}
    </span>
  );
}

// ─── Tile button ──────────────────────────────────────────────────────────────

function StatusTile({
  active, accentColor, label, icon: Icon, onClick, badge,
}: {
  active: boolean;
  accentColor: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  onClick: () => void;
  badge: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? `${accentColor}12` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? `${accentColor}35` : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '14px', padding: '11px 12px',
        textAlign: 'left', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: '7px',
        transition: 'border-color 0.15s',
      }}
    >
      <span style={{
        fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '10px',
        color: 'rgba(255,255,255,0.38)', letterSpacing: '0.06em',
        textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: '4px',
      }}>
        <Icon size={10} color="rgba(255,255,255,0.38)" />
        {label}
      </span>
      {badge}
    </button>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',       label: '📡 All' },
  { key: 'power',     label: '⚡ Power' },
  { key: 'water',     label: '💧 Water' },
  { key: 'safety',    label: '🛡 Safety' },
  { key: 'community', label: '🏘 Community' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const navigate = useNavigate();
  const { displaySuburb, displayCity } = useNeighbourhood();
  const suburb = displaySuburb || displayCity || '';

  const [safetyItems,    setSafetyItems]    = useState<AlertItem[]>([]);
  const [communityItems, setCommunityItems] = useState<AlertItem[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [spinning,       setSpinning]       = useState(false);
  const [activeFilter,   setActiveFilter]   = useState<FilterType>('all');

  // ── Data fetching ──────────────────────────────────────────────────────────

  async function load() {
    if (!suburb) { setLoading(false); return; }
    setSpinning(true);

    const [safetyReportsRaw, safetyRaw, feedRaw, neighbourhoodRaw] = await Promise.all([
      getSafetyReports(suburb),          // structured safety_reports (primary)
      getSafetyAlerts(suburb),           // legacy user_posts.category='alert' (fallback)
      getUserPostsForFeed(suburb),
      getNeighbourhoodPosts(suburb),
    ]);

    // ── Safety items ────────────────────────────────────────────────────────────
    // Prefer structured safety_reports; fill in any legacy user_posts alerts that
    // don't have a corresponding safety_report row.

    const structuredIds = new Set(
      (safetyReportsRaw as SafetyReport[]).map(r => r.userPostId).filter(Boolean)
    );

    const structuredAlerts: AlertItem[] = (safetyReportsRaw as SafetyReport[]).map(r => ({
      id:           r.id,
      severity:     'alert' as AlertSeverity,
      category:     'alert' as AlertCategory,
      area:         r.neighbourhood,
      message:      r.details,
      createdAt:    r.createdAt,
      incidentType: r.incidentType,
      title:        r.title,
      imageUrl:     r.imageUrl ?? undefined,
      mediaType:    r.mediaType ?? undefined,
      landmark:     r.landmark ?? undefined,
      happenedAt:   r.happenedAt,
    }));

    // Legacy alert posts (no matching safety_report row)
    const safetyAgo = Date.now() - 72 * 60 * 60 * 1000;
    const legacyAlerts: AlertItem[] = (safetyRaw as UserPost[])
      .filter(p => p.category === 'alert')
      .filter(p => new Date(p.createdAt).getTime() > safetyAgo)
      .filter(p => !structuredIds.has(p.id))        // exclude already-covered posts
      .map(p => ({
        id:        p.id,
        severity:  'alert' as AlertSeverity,
        category:  'alert' as AlertCategory,
        area:      p.neighbourhood,
        message:   p.content,
        createdAt: p.createdAt,
        imageUrl:  p.imageUrl ?? undefined,
      }));

    const safety: AlertItem[] = [...structuredAlerts, ...legacyAlerts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Community — news · spotted · event from user_posts (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const fromFeed: AlertItem[] = (feedRaw as UserPost[])
      .filter(p => ['news', 'spotted', 'event'].includes(p.category))
      .filter(p => new Date(p.createdAt).getTime() > sevenDaysAgo)
      .map(p => {
        const cat = p.category as CommCat;
        return {
          id:        p.id,
          severity:  categorySeverity(cat),
          category:  cat,
          area:      p.neighbourhood,
          message:   p.content,
          createdAt: p.createdAt,
        };
      });

    // Community — announcement · lost_found · event from neighbourhood_posts (last 7 days)
    const fromBoard: AlertItem[] = (neighbourhoodRaw as NeighbourhoodPost[])
      .filter(p => ['announcement', 'lost_found', 'event'].includes(p.category))
      .filter(p => new Date(p.createdAt).getTime() > sevenDaysAgo)
      .map(p => {
        const cat = p.category as CommCat;
        return {
          id:        p.id,
          severity:  categorySeverity(cat),
          category:  cat,
          area:      p.neighbourhood,
          message:   p.title ? `${p.title} — ${p.content}` : p.content,
          createdAt: p.createdAt,
          author:    p.isAnonymous ? undefined : p.authorName,
        };
      });

    // Merge + deduplicate + sort newest-first (cap at 10)
    const seen = new Set<string>();
    const community: AlertItem[] = [...fromFeed, ...fromBoard]
      .filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    setSafetyItems(safety);
    setCommunityItems(community);
    setLoading(false);
    setSpinning(false);
  }

  useEffect(() => { load(); }, [suburb]); // eslint-disable-line

  // ── Status badges ──────────────────────────────────────────────────────────

  const safetyBadge = loading
    ? <div style={{ height: '24px', width: '72px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px' }} />
    : safetyItems.length > 0
      ? <StatusPill dot="#EF4444" label={`${safetyItems.length} alert${safetyItems.length > 1 ? 's' : ''}`} color="#EF4444" bg="rgba(239,68,68,0.15)" />
      : <StatusPill dot="#39D98A" label="All clear" color="#39D98A" bg="rgba(57,217,138,0.12)" />;

  const communityBadge = loading
    ? <div style={{ height: '24px', width: '72px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px' }} />
    : communityItems.length > 0
      ? <StatusPill dot="#60A5FA" label={`${communityItems.length} update${communityItems.length > 1 ? 's' : ''}`} color="#60A5FA" bg="rgba(96,165,250,0.15)" />
      : <StatusPill dot="rgba(255,255,255,0.25)" label="Quiet" color="rgba(255,255,255,0.3)" bg="rgba(255,255,255,0.06)" />;

  // ── Sorted unified feed for "All" tab ──────────────────────────────────────

  const allAlerts = useMemo(() => {
    const severityOrder: Record<AlertSeverity, number> = { alert: 0, watch: 1, normal: 2 };
    return [...safetyItems, ...communityItems].sort((a, b) => {
      const diff = severityOrder[a.severity] - severityOrder[b.severity];
      return diff !== 0 ? diff : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [safetyItems, communityItems]);

  // ── Content renderer ───────────────────────────────────────────────────────

  function renderContent() {
    // Power — hand off to existing full widget
    if (activeFilter === 'power') {
      return <LoadSheddingWidget />;
    }

    // Water — hand off to existing full component
    if (activeFilter === 'water') {
      if (!suburb) {
        return (
          <NudgeCard
            emoji="📍"
            title="No neighbourhood set"
            body="Set your neighbourhood to see water status for your area."
            ctaLabel="Browse places"
            onCta={() => navigate('/feed')}
            accent="#60A5FA"
          />
        );
      }
      return <WaterStatus area={suburb} />;
    }

    // Safety feed
    if (activeFilter === 'safety') {
      if (loading) return <AlertSkeleton />;
      if (safetyItems.length > 0) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {safetyItems.map(item => <AlertCard key={item.id} item={item} />)}
          </div>
        );
      }
      return suburb ? (
        <NudgeCard
          emoji="✅"
          title={`All clear in ${suburb}`}
          body="No safety alerts in the last 72 hours. Stay aware and share anything you spot."
          ctaLabel="Report an incident"
          onCta={() => navigate('/report/safety')}
          accent="#39D98A"
        />
      ) : (
        <NudgeCard
          emoji="📍"
          title="No neighbourhood set"
          body="Set your neighbourhood to see safety alerts for your area."
          ctaLabel="Browse places"
          onCta={() => navigate('/feed')}
        />
      );
    }

    // Community feed
    if (activeFilter === 'community') {
      if (loading) return <AlertSkeleton />;
      if (communityItems.length > 0) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {communityItems.map(item => <AlertCard key={item.id} item={item} />)}
          </div>
        );
      }
      return suburb ? (
        <NudgeCard
          emoji="✍️"
          title={`Nothing shared in ${suburb} this week`}
          body="Be the first to post — news, events, spotted, lost & found."
          ctaLabel="Post to Board"
          onCta={() => navigate('/board/new')}
          accent="#60A5FA"
        />
      ) : (
        <NudgeCard
          emoji="📍"
          title="No neighbourhood set"
          body="Set your neighbourhood to see community updates for your area."
          ctaLabel="Browse places"
          onCta={() => navigate('/feed')}
        />
      );
    }

    // ── "All" tab ─────────────────────────────────────────────────────────────
    if (loading) return <AlertSkeleton />;

    if (!suburb) {
      return (
        <div style={{
          padding: '36px 24px', textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
        }}>
          <MapPin size={28} color="rgba(255,255,255,0.15)" style={{ marginBottom: '12px' }} />
          <p style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: '0 0 6px',
          }}>
            No neighbourhood set
          </p>
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
            color: 'rgba(255,255,255,0.25)', margin: 0, lineHeight: 1.6,
          }}>
            Tap your location in the top bar to see alerts and community updates for your area.
          </p>
        </div>
      );
    }

    // Quiet state — nothing active anywhere
    if (allAlerts.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <NudgeCard
            emoji="🟢"
            title={`Quiet in ${suburb} right now`}
            body="No active safety, community, or service alerts. All systems normal."
            ctaLabel="Report an incident"
            onCta={() => navigate('/report/safety')}
            accent="#39D98A"
          />
          <NudgeCard
            emoji="📋"
            title="Check the Board"
            body="Browse local listings, jobs, services and announcements in your area."
            ctaLabel="Open Board"
            onCta={() => navigate('/board')}
            accent="#60A5FA"
          />
        </div>
      );
    }

    // Active alerts — grouped by type, urgency at top
    const safetyInAll    = allAlerts.filter(a => a.category === 'alert');
    const communityInAll = allAlerts.filter(a => a.category !== 'alert');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {safetyInAll.length > 0 && (
          <div>
            <SectionLabel label="Safety" color="rgba(239,68,68,0.85)" count={safetyInAll.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {safetyInAll.map(item => <AlertCard key={item.id} item={item} />)}
            </div>
          </div>
        )}
        {communityInAll.length > 0 && (
          <div>
            <SectionLabel label="Community" color="rgba(96,165,250,0.75)" count={communityInAll.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {communityInAll.map(item => <AlertCard key={item.id} item={item} />)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '16px 16px calc(80px + env(safe-area-inset-bottom, 0px))' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: '12px',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '22px', color: '#F0F6FC', margin: '0 0 2px',
          }}>
            Alerts
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
              color: 'rgba(245,158,11,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Status
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>·</span>
            <MapPin size={11} color="rgba(255,255,255,0.3)" />
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
              color: 'rgba(255,255,255,0.35)',
            }}>
              {suburb || 'Set your neighbourhood'}
            </span>
          </div>
        </div>
        <button
          onClick={load}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px', marginTop: '2px',
          }}
        >
          <RefreshCw
            size={17}
            color="rgba(255,255,255,0.3)"
            style={spinning ? { animation: 'spin 1s linear infinite' } : {}}
          />
        </button>
      </div>

      {/* ── Report safety CTA — always visible, deliberately understated ── */}
      <button
        onClick={() => navigate('/report/safety')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '11px 14px', marginBottom: '16px',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.18)',
          borderRadius: '14px', cursor: 'pointer', textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
        } as React.CSSProperties}
      >
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
          background: 'rgba(239,68,68,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '17px',
        }}>
          🚨
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '13px', color: '#F0F6FC',
          }}>
            Report a safety incident
          </div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.35)', marginTop: '1px',
          }}>
            Crime · suspicious · missing · road · fire
          </div>
        </div>
        <ShieldAlert size={15} color="rgba(239,68,68,0.5)" style={{ flexShrink: 0 }} />
      </button>

      {/* ── Status strip — 4 tappable tiles ────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '8px', marginBottom: '14px',
      }}>
        <StatusTile
          active={activeFilter === 'power'}
          accentColor="#FBBF24"
          label="Power"
          icon={Zap}
          onClick={() => setActiveFilter('power')}
          badge={<LoadSheddingWidget compact />}
        />

        <StatusTile
          active={activeFilter === 'water'}
          accentColor="#60A5FA"
          label="Water"
          icon={Droplet}
          onClick={() => setActiveFilter('water')}
          badge={
            suburb
              ? <WaterStatus area={suburb} compact />
              : <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.25)' }}>Set suburb</span>
          }
        />

        <StatusTile
          active={activeFilter === 'safety'}
          accentColor="#EF4444"
          label="Safety"
          icon={ShieldAlert}
          onClick={() => setActiveFilter('safety')}
          badge={safetyBadge}
        />

        <StatusTile
          active={activeFilter === 'community'}
          accentColor="#60A5FA"
          label="Community"
          icon={Newspaper}
          onClick={() => setActiveFilter('community')}
          badge={communityBadge}
        />
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '6px',
        overflowX: 'auto', scrollbarWidth: 'none',
        marginBottom: '16px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {FILTERS.map(f => {
          const active = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                flexShrink: 0, padding: '6px 13px',
                borderRadius: '20px',
                border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                background: active ? '#39D98A' : 'rgba(255,255,255,0.04)',
                color: active ? '#000' : 'rgba(255,255,255,0.5)',
                fontSize: '12px', fontWeight: 700,
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Content area ────────────────────────────────────────────────── */}
      {renderContent()}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
