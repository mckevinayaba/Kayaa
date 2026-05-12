import { useState, useEffect } from 'react';
import {
  Bell, ShieldAlert, Zap, Droplet, RefreshCw,
  Newspaper, Eye, Megaphone, Search, Calendar,
  MapPin,
} from 'lucide-react';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import { getSafetyAlerts, getUserPostsForFeed, getNeighbourhoodPosts } from '../lib/api';
import type { UserPost, NeighbourhoodPost } from '../lib/api';
import { LoadSheddingWidget } from '../components/safety/LoadSheddingWidget';
import { WaterStatus } from '../components/utility/WaterStatus';

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

// ─── Category config ──────────────────────────────────────────────────────────

type AlertCategory = 'alert' | 'news' | 'spotted' | 'event' | 'announcement' | 'lost_found';

const CAT: Record<AlertCategory, {
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  bg: string;
  border: string;
  label: string;
}> = {
  alert:        { icon: ShieldAlert, color: '#EF4444', bg: 'rgba(239,68,68,0.07)',    border: 'rgba(239,68,68,0.2)',    label: 'Safety' },
  news:         { icon: Newspaper,   color: '#60A5FA', bg: 'rgba(96,165,250,0.07)',   border: 'rgba(96,165,250,0.2)',   label: 'News' },
  spotted:      { icon: Eye,         color: '#FBBF24', bg: 'rgba(251,191,36,0.07)',   border: 'rgba(251,191,36,0.2)',   label: 'Spotted' },
  event:        { icon: Calendar,    color: '#F472B6', bg: 'rgba(244,114,182,0.07)',  border: 'rgba(244,114,182,0.2)',  label: 'Event' },
  announcement: { icon: Megaphone,   color: '#A78BFA', bg: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.2)', label: 'Announcement' },
  lost_found:   { icon: Search,      color: '#FB923C', bg: 'rgba(251,146,60,0.07)',   border: 'rgba(251,146,60,0.2)',   label: 'Lost & Found' },
};

// ─── Unified alert item ───────────────────────────────────────────────────────

interface AlertItem {
  id: string;
  category: AlertCategory;
  content: string;
  createdAt: string;
  author?: string;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({
  icon: Icon, label, color, count,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  color: string;
  count?: number;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '7px',
      marginBottom: '10px',
    }}>
      <Icon size={13} color={color} />
      <span style={{
        fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
        color, textTransform: 'uppercase', letterSpacing: '0.07em',
      }}>
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span style={{
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '10px',
          color: '#000', background: color,
          borderRadius: '20px', padding: '1px 6px', marginLeft: '2px',
        }}>
          {count}
        </span>
      )}
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

// ─── Alert card ───────────────────────────────────────────────────────────────

function AlertCard({ item }: { item: AlertItem }) {
  const cfg = CAT[item.category] ?? CAT.news;
  const Icon = cfg.icon;

  return (
    <div style={{
      padding: '13px 14px',
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: '14px',
      display: 'flex', alignItems: 'flex-start', gap: '11px',
    }}>
      {/* Category icon */}
      <div style={{
        width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
        background: `${cfg.color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: '1px',
      }}>
        <Icon size={15} color={cfg.color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Category pill */}
        <span style={{
          display: 'inline-block',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '10px',
          color: cfg.color,
          background: `${cfg.color}15`,
          borderRadius: '20px', padding: '1px 7px',
          marginBottom: '5px',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {cfg.label}
        </span>

        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.82)',
          margin: '0 0 5px', lineHeight: 1.55,
        }}>
          {item.content}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.3)',
          }}>
            {timeAgo(item.createdAt)}
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AlertSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[72, 88, 72].map((h, i) => (
        <div key={i} style={{
          height: h, borderRadius: '14px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.05)',
        }} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const { displaySuburb, displayCity } = useNeighbourhood();
  const suburb = displaySuburb || displayCity || '';

  const [safetyItems,    setSafetyItems]    = useState<AlertItem[]>([]);
  const [communityItems, setCommunityItems] = useState<AlertItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [spinning,  setSpinning]  = useState(false);

  async function load() {
    if (!suburb) { setLoading(false); return; }
    setSpinning(true);

    // Three parallel fetches — all scoped to this suburb
    const [safetyRaw, feedRaw, neighbourhoodRaw] = await Promise.all([
      // Safety: alerts only, last 72 hours (wider than 24h so useful ones don't vanish)
      getSafetyAlerts(suburb),
      // Community feed: news + spotted + event from last 7 days
      getUserPostsForFeed(suburb),
      // Neighbourhood board: announcements + lost & found from last 7 days
      getNeighbourhoodPosts(suburb),
    ]);

    // Safety section — alert category only
    const safetyAgo = Date.now() - 72 * 60 * 60 * 1000;
    const safety: AlertItem[] = safetyRaw
      .filter(p => p.category === 'alert')
      .filter(p => new Date(p.createdAt).getTime() > safetyAgo)
      .map(p => ({
        id:        p.id,
        category:  'alert' as AlertCategory,
        content:   p.content,
        createdAt: p.createdAt,
      }));

    // Community section — news, spotted, event from user_posts (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const communityFromFeed: AlertItem[] = (feedRaw as UserPost[])
      .filter(p => ['news', 'spotted', 'event'].includes(p.category))
      .filter(p => new Date(p.createdAt).getTime() > sevenDaysAgo)
      .map(p => ({
        id:        p.id,
        category:  p.category as AlertCategory,
        content:   p.content,
        createdAt: p.createdAt,
      }));

    // Community section — announcements + lost_found from neighbourhood_posts (last 7 days)
    const communityFromBoard: AlertItem[] = (neighbourhoodRaw as NeighbourhoodPost[])
      .filter(p => ['announcement', 'lost_found', 'event'].includes(p.category))
      .filter(p => new Date(p.createdAt).getTime() > sevenDaysAgo)
      .map(p => ({
        id:        p.id,
        category:  p.category as AlertCategory,
        content:   p.title ? `${p.title} — ${p.content}` : p.content,
        createdAt: p.createdAt,
        author:    p.isAnonymous ? undefined : p.authorName,
      }));

    // Merge community, deduplicate by id, sort newest-first (cap at 10)
    const seen = new Set<string>();
    const community: AlertItem[] = [...communityFromFeed, ...communityFromBoard]
      .filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    setSafetyItems(safety);
    setCommunityItems(community);
    setLoading(false);
    setSpinning(false);
  }

  useEffect(() => { load(); }, [suburb]); // eslint-disable-line

  const hasAnything = safetyItems.length > 0 || communityItems.length > 0;

  return (
    <div style={{ padding: '16px 16px 80px' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: '20px',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '22px', color: '#F0F6FC', margin: '0 0 2px',
          }}>
            Alerts
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', marginTop: '2px' }}
        >
          <RefreshCw
            size={17}
            color="rgba(255,255,255,0.3)"
            style={spinning ? { animation: 'spin 1s linear infinite' } : {}}
          />
        </button>
      </div>

      {/* ── Utilities — always shown ─────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <SectionLabel icon={Zap} label="Power" color="rgba(251,191,36,0.7)" />
        <div style={{ marginBottom: '12px' }}>
          <LoadSheddingWidget compact />
        </div>

        {suburb && (
          <>
            <SectionLabel icon={Droplet} label="Water" color="rgba(96,165,250,0.7)" />
            <WaterStatus area={suburb} compact />
          </>
        )}
      </div>

      {/* ── Safety alerts ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <SectionLabel
          icon={ShieldAlert}
          label="Safety alerts"
          color="rgba(239,68,68,0.8)"
          count={safetyItems.length}
        />

        {loading ? (
          <AlertSkeleton />
        ) : safetyItems.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {safetyItems.map(item => <AlertCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div style={{
            padding: '16px',
            background: 'rgba(57,217,138,0.04)',
            border: '1px solid rgba(57,217,138,0.1)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#39D98A', flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
              color: 'rgba(255,255,255,0.45)',
            }}>
              {suburb ? `No safety alerts in ${suburb} in the last 3 days` : 'Set your neighbourhood to see safety alerts'}
            </span>
          </div>
        )}
      </div>

      {/* ── Community activity ───────────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <SectionLabel
          icon={Newspaper}
          label="Community"
          color="rgba(96,165,250,0.7)"
          count={communityItems.length}
        />

        {loading ? (
          <AlertSkeleton />
        ) : communityItems.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {communityItems.map(item => <AlertCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div style={{
            padding: '16px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <Bell size={14} color="rgba(255,255,255,0.2)" />
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
              color: 'rgba(255,255,255,0.35)',
            }}>
              {suburb
                ? `Nothing shared in ${suburb} this week`
                : 'Set your neighbourhood to see community activity'}
            </span>
          </div>
        )}
      </div>

      {/* ── No suburb set — page-level prompt ────────────────────────────── */}
      {!suburb && !loading && (
        <div style={{
          padding: '36px 24px', textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px', marginTop: '8px',
        }}>
          <MapPin size={28} color="rgba(255,255,255,0.15)" style={{ marginBottom: '12px' }} />
          <p style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '15px', color: 'rgba(255,255,255,0.5)',
            margin: '0 0 6px',
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
      )}

      {/* ── All quiet — shown only when suburb is set and truly nothing ────── */}
      {suburb && !loading && !hasAnything && (
        <div style={{
          marginTop: '-8px', padding: '20px',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.2)', margin: 0,
          }}>
            Quiet in {suburb} — check back later
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
