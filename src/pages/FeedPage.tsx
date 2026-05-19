import { useState, useMemo, useEffect, useRef } from 'react';
import { PenSquare, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import { haversineKm } from '../lib/geocode';
import { getAreaTier } from '../lib/areaGroups';
import NeighbourhoodGate from '../components/NeighbourhoodGate';
import PostComposer from '../components/PostComposer';
import {
  getAllVenues,
  getHeadingThereCountsBatch, getVibeWinnersBatch,
  getActiveStoryVenuesBatch,
  getBoardPosts,
  getLocalJobs,
  getUtilityReports,
  getVenueRecCountsBatch,
} from '../lib/api';
import type { VibeType, BoardPost, LocalJob, UtilityReport } from '../lib/api';
import type { Venue } from '../types';
import VenueCard from '../components/VenueCard';
import PostBar from '../components/feed/PostBar';
import QuickAddPlace from '../components/QuickAddPlace';
import PushBanner from '../components/PushBanner';
import { useCountry } from '../contexts/CountryContext';

// ─── Scope models ─────────────────────────────────────────────────────────────
type FeedScope = 'this_neighbourhood' | 'nearby' | 'city_wide' | 'explore_all';
type HomeScope = 'my_area' | 'nearby' | 'everywhere';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const TEST_NAMES = /\b(test|demo|example|setup a startup)\b/i;

function isCleanVenue(v: Venue): boolean {
  return v.description.trim().length >= 10 && !TEST_NAMES.test(v.name);
}

function venueInScope(
  v: Venue,
  scope: FeedScope,
  suburb: string,
  city: string,
  userLat?: number,
  userLon?: number,
): boolean {
  if (scope === 'explore_all') return true;
  const hasGPS = userLat != null && userLon != null;
  const hasCoords = v.latitude != null && v.longitude != null;
  if (hasGPS && hasCoords) {
    const km = haversineKm(userLat!, userLon!, v.latitude!, v.longitude!);
    switch (scope) {
      case 'this_neighbourhood': return km <= 8;
      case 'nearby':             return km <= 30;
      case 'city_wide':          return km <= 60;
    }
  }
  const tier = getAreaTier(v.neighborhood, v.city, suburb, city);
  switch (scope) {
    case 'this_neighbourhood': return tier === 'exact';
    case 'nearby':             return tier === 'exact' || tier === 'cluster';
    case 'city_wide':          return tier === 'exact' || tier === 'cluster' || tier === 'metro';
  }
}

function scopeToFeedScope(s: HomeScope): FeedScope {
  if (s === 'nearby') return 'nearby';
  if (s === 'everywhere') return 'explore_all';
  return 'this_neighbourhood';
}

// ─── Seed data (display-only — never saved to Supabase) ──────────────────────

interface SeedBoardPost { id: string; category: string; title: string; time: string }
interface SeedJob       { id: string; type: 'Hiring' | 'Skills'; title: string; neighbourhood: string; time: string }
interface SeedAlert     { id: string; icon: string; label: string; message: string; isNormal: boolean; time: string }

const SEED_BOARD_POST: SeedBoardPost = {
  id: 'seed-b1', category: 'announcement',
  title: 'City Cuts Barbershop open today — walk-ins welcome until 6pm',
  time: '4 hours ago',
};
const SEED_JOB: SeedJob = {
  id: 'seed-j1', type: 'Hiring',
  title: 'Domestic worker needed — 3 days per week',
  neighbourhood: 'Berea', time: 'Today',
};
const SEED_ALERT: SeedAlert = {
  id: 'seed-alert-1', icon: '⚡', label: 'Status',
  message: 'No power or water issues reported in your area',
  isNormal: true, time: 'Updated just now',
};

// ─── Normalised display types ─────────────────────────────────────────────────

interface DisplayBoardPost { id: string; category: string; title: string; timeDisplay: string; isSeed?: boolean }
interface DisplayJob       { id: string; typeLabel: 'Hiring' | 'Skills'; title: string; neighbourhood: string; timeDisplay: string; isSeed?: boolean }

// ─── Category maps ────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  safety: '#EF4444', announcement: '#39D98A', announcements: '#39D98A',
  lost_found: '#60A5FA', event: '#A78BFA', events: '#A78BFA',
  question: '#60A5FA', recommendation: '#39D98A', general: 'rgba(255,255,255,0.3)',
};
const CAT_LABELS: Record<string, string> = {
  safety: 'Safety', announcement: 'Announcement', announcements: 'Announcement',
  lost_found: 'Lost & Found', event: 'Event', events: 'Event',
  question: 'Question', recommendation: 'Recommendation', general: 'General',
};

// ─── Skeletons ────────────────────────────────────────────────────────────────

function VenueCardSkeleton() {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-warm)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', overflow: 'hidden', marginBottom: '14px' }}>
      <div style={{ width: '100%', paddingTop: '56.25%', background: 'linear-gradient(90deg, var(--color-surface2) 25%, rgba(255,255,255,0.04) 50%, var(--color-surface2) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s ease-in-out infinite' }} />
      <div style={{ padding: '15px 18px 16px', borderLeft: '3px solid rgba(255,255,255,0.06)' }}>
        <div style={{ height: '10px', width: '28%', background: 'var(--color-surface2)', borderRadius: '4px', marginBottom: '10px' }} />
        <div style={{ height: '18px', width: '62%', background: 'var(--color-surface2)', borderRadius: '5px', marginBottom: '8px' }} />
        <div style={{ height: '11px', width: '42%', background: 'var(--color-surface2)', borderRadius: '4px', marginBottom: '14px' }} />
        <div style={{ height: '12px', width: '88%', background: 'var(--color-surface2)', borderRadius: '4px', marginBottom: '6px' }} />
        <div style={{ height: '12px', width: '70%', background: 'var(--color-surface2)', borderRadius: '4px', marginBottom: '16px' }} />
        <div style={{ height: '1px', background: 'var(--color-border-warm)', marginBottom: '14px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ height: '11px', width: '22%', background: 'var(--color-surface2)', borderRadius: '4px' }} />
          <div style={{ height: '32px', width: '86px', background: 'var(--color-surface2)', borderRadius: '100px' }} />
        </div>
      </div>
    </div>
  );
}

function FeedItemSkeleton() {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px' }}>
      <div style={{ height: '9px', width: '30%', background: 'var(--color-surface2)', borderRadius: '4px', marginBottom: '9px' }} />
      <div style={{ height: '13px', width: '85%', background: 'var(--color-surface2)', borderRadius: '4px', marginBottom: '5px' }} />
      <div style={{ height: '13px', width: '60%', background: 'var(--color-surface2)', borderRadius: '4px' }} />
    </div>
  );
}

// ─── Scope tabs ───────────────────────────────────────────────────────────────

function ScopeTabs({
  scope, onChange, suburb,
}: { scope: HomeScope; onChange: (s: HomeScope) => void; suburb: string }) {
  const tabs: { id: HomeScope; label: string }[] = [
    { id: 'my_area',    label: suburb ? suburb : 'My Area' },
    { id: 'nearby',     label: 'Nearby'                    },
    { id: 'everywhere', label: 'Everywhere'                },
  ];
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
      {tabs.map(tab => {
        const active = scope === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: tab.id === 'my_area' ? 1.8 : 1,
              padding: '10px 4px',
              borderRadius: '100px',
              border: active ? 'none' : '1px solid rgba(255,255,255,0.12)',
              background: active ? '#39D98A' : 'rgba(255,255,255,0.04)',
              color: active ? '#0D1117' : 'rgba(255,255,255,0.45)',
              fontFamily: 'Inter, sans-serif',
              fontWeight: active ? 800 : 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap' as const,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Feed section header ──────────────────────────────────────────────────────

function SectionHeader({
  label, linkLabel, linkColor = '#39D98A', onLink,
}: {
  label: string;
  linkLabel: string;
  linkColor?: string;
  onLink: () => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
      <p style={{
        fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.3)', margin: 0,
      }}>
        {label}
      </p>
      <button
        onClick={onLink}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: linkColor }}
      >
        {linkLabel} →
      </button>
    </div>
  );
}

// ─── Utility pill strip ───────────────────────────────────────────────────────

function UtilityPillStrip({ suburb }: { suburb: string }) {
  const navigate = useNavigate();
  const pillBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    height: '34px', padding: '0 14px', flexShrink: 0,
    background: '#161B22', border: '1px solid #1e2a3a',
    borderRadius: '18px', cursor: 'pointer',
    fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600,
    WebkitTapHighlightColor: 'transparent',
  };
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', marginLeft: '-16px', paddingLeft: '16px', marginRight: '-16px', paddingRight: '16px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <button style={{ ...pillBase, color: '#39D98A' }} onClick={() => navigate('/report/utility/power')}>⚡ No load shedding</button>
        <button style={{ ...pillBase, color: '#39D98A' }} onClick={() => navigate('/report/utility/water')}>💧 Water normal</button>
        <button style={{ ...pillBase, color: 'rgba(255,255,255,0.5)' }} onClick={() => navigate('/alerts')}>🔔 {suburb ? `${suburb} alerts` : 'Alerts'}</button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const navigate = useNavigate();
  const {
    displaySuburb: suburb, displayCity: city,
    displayLat: _lat, displayLon: _lon,
    isDetecting, manualOverride,
    setManualOverride, clearManualOverride,
  } = useNeighbourhood();
  const userLat = _lat ?? undefined;
  const userLon = _lon ?? undefined;
  const { selectedCountry } = useCountry();

  // Raw API data
  const [rawVenues,  setRawVenues]  = useState<Venue[]>([]);
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>([]);
  const [jobPosts,   setJobPosts]   = useState<LocalJob[]>([]);

  // Section load flags
  const [boardLoaded,  setBoardLoaded]  = useState(false);
  const [jobsLoaded,   setJobsLoaded]   = useState(false);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const [utilityAlert, setUtilityAlert] = useState<UtilityReport | null>(null);

  const [showComposer, setShowComposer] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheDate, setCacheDate] = useState<string | null>(null);

  // Pull-to-refresh
  const [pullDelta,  setPullDelta]  = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const touchStartY   = useRef(0);
  const pullDeltaRef  = useRef(0);
  const refreshingRef = useRef(false);
  const liveRegion    = useRef<HTMLDivElement>(null);

  // Interactivity batch data
  const [headingCounts,       setHeadingCounts]       = useState<Record<string, number>>({});
  const [vibeWinners,         setVibeWinners]         = useState<Record<string, { vibe: VibeType; count: number } | null>>({});
  const [activeStoryVenueIds, setActiveStoryVenueIds] = useState<Set<string>>(new Set());
  const [recCounts,           setRecCounts]           = useState<Record<string, number>>({});

  // ─── Home scope: My Area / Nearby / Everywhere ────────────────────────────
  const [scope, setScope] = useState<HomeScope>(
    () => (localStorage.getItem('kayaa_home_scope') as HomeScope | null) ?? 'my_area'
  );
  function handleScopeChange(s: HomeScope) {
    setScope(s);
    localStorage.setItem('kayaa_home_scope', s);
  }

  const [showAreaGate, setShowAreaGate] = useState(false);
  useEffect(() => {
    if (!isDetecting && !suburb && !manualOverride) setShowAreaGate(true);
    else setShowAreaGate(false);
  }, [isDetecting, suburb, manualOverride]);

  const areaLabel = suburb || 'Your area';

  const [gpsConfirmDismissed, setGpsConfirmDismissed] = useState(false);
  const [showGpsConfirm,      setShowGpsConfirm]      = useState(false);
  const [showAreaSearch,      setShowAreaSearch]       = useState(false);
  const [areaSearchQuery,     setAreaSearchQuery]      = useState('');

  useEffect(() => {
    if (!isDetecting && suburb && !manualOverride && !gpsConfirmDismissed) {
      setShowGpsConfirm(true);
      const t = setTimeout(() => setShowGpsConfirm(false), 8000);
      return () => clearTimeout(t);
    }
  }, [isDetecting, suburb]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleConfirmGpsSuburb() { setShowGpsConfirm(false); setGpsConfirmDismissed(true); }
  function handleChangeArea()       { setShowGpsConfirm(false); setGpsConfirmDismissed(true); setShowAreaSearch(true); setAreaSearchQuery(''); }

  // Online / offline
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (!navigator.onLine) {
      const cached = localStorage.getItem('kayaa_cached_venues');
      const ts     = localStorage.getItem('kayaa_venues_cached_at');
      if (cached) { try { setRawVenues(JSON.parse(cached)); setLoading(false); } catch { /* noop */ } }
      if (ts) setCacheDate(ts);
    }
  }, []);

  // Pull-to-refresh gesture
  useEffect(() => {
    function onTouchStart(e: TouchEvent) { touchStartY.current = e.touches[0].clientY; }
    function onTouchMove(e: TouchEvent) {
      if (window.scrollY > 8) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) { const c = Math.min(delta, 80); pullDeltaRef.current = c; setPullDelta(c); }
    }
    function onTouchEnd() {
      if (pullDeltaRef.current > 60 && !refreshingRef.current) { refreshingRef.current = true; setRefreshing(true); setRefreshKey(k => k + 1); }
      pullDeltaRef.current = 0; setPullDelta(0);
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });
    window.addEventListener('touchend',   onTouchEnd);
    return () => { window.removeEventListener('touchstart', onTouchStart); window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', onTouchEnd); };
  }, []);

  // ─── Main data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    setBoardLoaded(false);
    setJobsLoaded(false);
    setAlertsLoaded(false);

    getAllVenues({ countryCode: selectedCountry.code, suburb: suburb || undefined, city: city || undefined })
      .then(v => {
        const venues = v as Venue[];
        setRawVenues(venues);
        try {
          localStorage.setItem('kayaa_cached_venues', JSON.stringify(venues.slice(0, 50)));
          localStorage.setItem('kayaa_venues_cached_at', new Date().toISOString());
        } catch { /* storage full */ }
        setLoading(false);
        setRefreshing(false);
        refreshingRef.current = false;

        // Board: fetch up to 5 recent posts — display count varies by scope
        getBoardPosts(suburb || '', city || '')
          .then(result => {
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const recent = result.posts
              .filter(p => new Date(p.createdAt).getTime() > sevenDaysAgo)
              .slice(0, 5);
            setBoardPosts(recent);
            setBoardLoaded(true);
          })
          .catch(() => { setBoardLoaded(true); });

        // Jobs: fetch up to 3 listings — display count varies by scope
        if (suburb) {
          getLocalJobs(suburb)
            .then(jobs => { setJobPosts(jobs.slice(0, 3)); setJobsLoaded(true); })
            .catch(() => { setJobsLoaded(true); });
        } else {
          setJobsLoaded(true);
        }

        // Utility alerts preview
        if (suburb) {
          Promise.all([
            getUtilityReports(suburb, 'power'),
            getUtilityReports(suburb, 'water'),
          ]).then(([powerReps, waterReps]) => {
            const active = [...powerReps, ...waterReps]
              .filter(r => !r.issueType.endsWith('_restored'))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setUtilityAlert(active[0] ?? null);
            setAlertsLoaded(true);
          }).catch(() => { setAlertsLoaded(true); });
        } else {
          setAlertsLoaded(true);
        }

        // Batch interactivity + rec counts
        const ids = venues.map(vv => vv.id);
        if (ids.length > 0) {
          Promise.all([
            getHeadingThereCountsBatch(ids),
            getVibeWinnersBatch(ids),
            getActiveStoryVenuesBatch(ids),
            getVenueRecCountsBatch(ids),
          ])
            .then(([hc, vw, as_, rc]) => {
              setHeadingCounts(hc);
              setVibeWinners(vw);
              setActiveStoryVenueIds(as_);
              setRecCounts(rc);
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        setRefreshing(false); refreshingRef.current = false;
        setBoardLoaded(true); setJobsLoaded(true); setAlertsLoaded(true);
      });
  }, [areaLabel, selectedCountry.code, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Computed: scope-aware selections ────────────────────────────────────

  // Places: 2 for My Area, 3 for Nearby, 4 for Everywhere
  const placesNearYou = useMemo(() => {
    const fScope = scopeToFeedScope(scope);
    const limit  = scope === 'my_area' ? 2 : scope === 'nearby' ? 3 : 4;
    if (!suburb && !city && scope !== 'everywhere') return rawVenues.slice(0, limit);
    return rawVenues
      .filter(v => isCleanVenue(v) && venueInScope(v, fScope, suburb, city, userLat, userLon))
      .slice(0, limit);
  }, [rawVenues, suburb, city, userLat, userLon, scope]);

  // Board posts: 1 for My Area, 2 for Nearby, 3 for Everywhere
  const displayBoardPosts = useMemo<DisplayBoardPost[]>(() => {
    if (!boardLoaded) return [];
    const limit = scope === 'my_area' ? 1 : scope === 'nearby' ? 2 : 3;
    if (boardPosts.length > 0) {
      return boardPosts.slice(0, limit).map(p => ({
        id: p.id,
        category: p.category || 'general',
        title: p.title || p.description || '',
        timeDisplay: timeAgo(p.createdAt),
        isSeed: false,
      }));
    }
    // Seed fallback
    return [{
      id: SEED_BOARD_POST.id, category: SEED_BOARD_POST.category,
      title: SEED_BOARD_POST.title, timeDisplay: SEED_BOARD_POST.time, isSeed: true,
    }];
  }, [boardLoaded, boardPosts, scope]);

  // Jobs: 1 for My Area, 2 for Nearby/Everywhere
  const displayJobs = useMemo<DisplayJob[]>(() => {
    if (!jobsLoaded) return [];
    const limit = scope === 'my_area' ? 1 : 2;
    if (jobPosts.length > 0) {
      return jobPosts.slice(0, limit).map(p => ({
        id: p.id,
        typeLabel: p.jobType === 'skill_offer' ? 'Skills' as const : 'Hiring' as const,
        title: p.title,
        neighbourhood: p.neighbourhood,
        timeDisplay: timeAgo(p.createdAt),
        isSeed: false,
      }));
    }
    return [{
      id: SEED_JOB.id, typeLabel: SEED_JOB.type, title: SEED_JOB.title,
      neighbourhood: SEED_JOB.neighbourhood, timeDisplay: SEED_JOB.time, isSeed: true,
    }];
  }, [jobsLoaded, jobPosts, scope]);

  // Live pulse — venues with a check-in in the last 2 hours
  const activeNow = useMemo(
    () => rawVenues.filter(v => v.lastCheckinAt && Date.now() - new Date(v.lastCheckinAt).getTime() < 2 * 60 * 60 * 1000).length,
    [rawVenues],
  );

  // Context label used in section headers e.g. "Berea" / "near Berea" / "everywhere"
  const scopeContext = scope === 'my_area'
    ? (suburb || 'your area')
    : scope === 'nearby'
      ? `near ${suburb || 'you'}`
      : 'everywhere';

  // Places section label
  const placesLabel = scope === 'my_area'
    ? `Places in ${suburb || 'your area'}`
    : scope === 'nearby' ? 'Places nearby' : 'Places everywhere';

  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem('kayaa_welcome_dismissed') === 'true'
  );
  const showWelcomeHint = !loading && !welcomeDismissed;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '16px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Accessible live region */}
      <div ref={liveRegion} role="status" aria-live="polite" className="sr-only">
        {loading ? 'Loading…' : refreshing ? 'Refreshing…' : `${placesNearYou.length} place${placesNearYou.length !== 1 ? 's' : ''} loaded`}
      </div>

      {/* Pull-to-refresh indicator */}
      {pullDelta > 10 && (
        <div style={{ position: 'fixed', top: '56px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '6px 14px', opacity: Math.min(pullDelta / 60, 1), pointerEvents: 'none' }}>
          <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(57,217,138,0.35)', borderTopColor: '#39D98A', transform: `rotate(${Math.min(pullDelta * 4.5, 360)}deg)` }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--color-muted)' }}>{pullDelta >= 60 ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      )}

      {/* Refreshing banner */}
      {refreshing && !loading && (
        <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '5px 12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(57,217,138,0.25)', borderTopColor: '#39D98A', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--color-muted)' }}>Refreshing…</span>
          </div>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px' }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F59E0B' }}>You're offline</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', lineHeight: 1.4 }}>
              {cacheDate
                ? `Showing places saved ${new Date(cacheDate).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}. Some info may be outdated.`
                : 'No cached data available. Connect to the internet to load places.'}
            </div>
          </div>
        </div>
      )}

      {/* GPS confirmation */}
      {showGpsConfirm && !manualOverride && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(57,217,138,0.07)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '12px', padding: '10px 14px', marginBottom: '12px' }}>
          <span style={{ fontSize: '15px', flexShrink: 0 }}>📍</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 1.4 }}>
            Showing <strong style={{ color: '#F0F6FC' }}>{suburb}</strong> — not right?
          </span>
          <button onClick={handleChangeArea} style={{ padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#39D98A', color: '#0D1117', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>Change</button>
          <button onClick={handleConfirmGpsSuburb} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '16px', padding: '0 2px', flexShrink: 0 }} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* Area search */}
      {showAreaSearch && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '10px' }}>Which suburb are you in?</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              autoFocus value={areaSearchQuery}
              onChange={e => setAreaSearchQuery(e.target.value)}
              placeholder="e.g. Rosebank, Soweto…"
              style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#F0F6FC', fontFamily: 'Inter, sans-serif', fontSize: '14px', outline: 'none' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && areaSearchQuery.trim()) { setManualOverride(areaSearchQuery.trim(), city); setShowAreaSearch(false); setRefreshKey(k => k + 1); }
                if (e.key === 'Escape') setShowAreaSearch(false);
              }}
            />
            <button
              onClick={() => { if (areaSearchQuery.trim()) { setManualOverride(areaSearchQuery.trim(), city); setShowAreaSearch(false); setRefreshKey(k => k + 1); } }}
              style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: '#39D98A', color: '#0D1117', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px' }}
            >Set</button>
          </div>
          <button onClick={() => setShowAreaSearch(false)} style={{ marginTop: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', padding: 0 }}>
            Cancel — use my GPS location
          </button>
        </div>
      )}

      {/* QuickAddPlace sheet */}
      {quickAddOpen && (
        <QuickAddPlace
          defaultSuburb={suburb} defaultCity={city}
          onAdded={() => { setTimeout(() => setRefreshKey(k => k + 1), 800); }}
          onClose={() => setQuickAddOpen(false)}
        />
      )}

      {/* Manual area indicator */}
      {manualOverride && suburb && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '10px', padding: '8px 12px', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px' }}>🔍</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#93C5FD', flex: 1 }}>Browsing <strong>{manualOverride}</strong></span>
          <button onClick={() => { clearManualOverride(); setRefreshKey(k => k + 1); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600, color: '#60A5FA', padding: '0', flexShrink: 0 }}>Use GPS</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ── 1. AREA HEADER — greeting + name + live pulse
          ═════════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '18px' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(57,217,138,0.6)', margin: '0 0 5px' }}>
          {getGreeting()}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '28px', color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.05, margin: 0 }}>
            {areaLabel}
          </h1>
          <button
            onClick={() => { setShowAreaSearch(true); setAreaSearchQuery(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '20px', padding: '6px 12px',
              cursor: 'pointer', flexShrink: 0,
              fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600,
              color: 'rgba(255,255,255,0.6)',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
            aria-label="Change neighbourhood"
          >
            {manualOverride ? 'Browsing' : suburb ? 'Change' : 'Set area'}
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Live pulse row — real signals from real data */}
        {!loading && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', minHeight: '18px' }}>
            {activeNow > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600, color: '#39D98A' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#39D98A', display: 'inline-block', boxShadow: '0 0 6px rgba(57,217,138,0.7)', animation: 'kDotPulse 2s ease-in-out infinite' }} />
                {activeNow} active now
              </span>
            )}
            {boardPosts.length > 0 && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>
                {boardPosts.length} post{boardPosts.length !== 1 ? 's' : ''} today
              </span>
            )}
            {jobPosts.length > 0 && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>
                {jobPosts.length} job{jobPosts.length !== 1 ? 's' : ''} near you
              </span>
            )}
            {rawVenues.length > 0 && activeNow === 0 && boardPosts.length === 0 && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                {rawVenues.length} place{rawVenues.length !== 1 ? 's' : ''} in your area
              </span>
            )}
            {!suburb && rawVenues.length === 0 && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                Set your area to see what's happening
              </span>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ── 2. SCOPE TABS — My Area | Nearby | Everywhere
          ═════════════════════════════════════════════════════════════════════ */}
      <ScopeTabs scope={scope} onChange={handleScopeChange} suburb={suburb} />

      {/* ── 3. PostBar + Push ───────────────────────────────────────────────── */}
      <PostBar suburb={suburb || areaLabel} onPost={() => setShowComposer(true)} onAddPlace={() => setQuickAddOpen(true)} />
      <PushBanner />

      {/* ══════════════════════════════════════════════════════════════════════
          ── FEED STREAM — ordered by relevance:
          1. Urgent alert  2. Community posts  3. Jobs  4. Places  5. Ask CTA  6. Status
          ═════════════════════════════════════════════════════════════════════ */}

      {/* ── FEED 1: Urgent utility alert ──────────────────────────────────── */}
      {alertsLoaded && utilityAlert && (() => {
        const POWER_LABELS: Record<string, { icon: string; label: string }> = {
          power_out:     { icon: '⚡', label: 'Power out' },
          load_shedding: { icon: '🔁', label: 'Load shedding' },
          flickering:    { icon: '💡', label: 'Flickering' },
          streetlights:  { icon: '🔦', label: 'Streetlights out' },
        };
        const WATER_LABELS: Record<string, { icon: string; label: string }> = {
          no_water:    { icon: '🚱', label: 'No water' },
          low_pressure:{ icon: '📉', label: 'Low pressure' },
          dirty_water: { icon: '🟤', label: 'Dirty water' },
          leak_burst:  { icon: '💧', label: 'Leak / burst pipe' },
        };
        const isPower = utilityAlert.category === 'power';
        const meta = isPower
          ? (POWER_LABELS[utilityAlert.issueType] ?? { icon: '⚡', label: 'Power issue' })
          : (WATER_LABELS[utilityAlert.issueType] ?? { icon: '💧', label: 'Water issue' });
        const color = isPower ? '#FBBF24' : '#60A5FA';
        return (
          <div style={{ marginBottom: '20px' }}>
            <SectionHeader label="⚠️ Neighbourhood Alert" linkLabel="See all" linkColor="#60A5FA" onLink={() => navigate('/alerts')} />
            <div onClick={() => navigate('/alerts')} style={{ background: `${color}08`, border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color, background: `${color}18`, borderRadius: '20px', padding: '2px 8px' }}>{meta.icon} {meta.label}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{timeAgo(utilityAlert.createdAt)}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
                📍 {utilityAlert.areaDetail}
                {utilityAlert.reportCount > 1 && <span style={{ color, fontWeight: 700 }}> · {utilityAlert.reportCount} reports</span>}
              </p>
            </div>
          </div>
        );
      })()}

      {/* ── FEED 2: Community board posts ─────────────────────────────────── */}
      {boardLoaded && displayBoardPosts.length > 0 ? (
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader
            label={`Community · ${scopeContext}`}
            linkLabel="See all"
            onLink={() => navigate('/board')}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayBoardPosts.map(post => {
              const color = CAT_COLORS[post.category] ?? CAT_COLORS.general;
              const label = CAT_LABELS[post.category] ?? post.category;
              return (
                <div
                  key={post.id}
                  onClick={() => navigate('/board')}
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ display: 'inline-block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color, background: `${color}18`, borderRadius: '20px', padding: '2px 8px' }}>{label}</span>
                      {post.isSeed && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1px 6px' }}>example</span>}
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{post.timeDisplay}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, fontFamily: 'Inter, sans-serif', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                    {post.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : !boardLoaded ? (
        <div style={{ marginBottom: '20px' }}>
          <FeedItemSkeleton />
        </div>
      ) : null}

      {/* ── FEED 3: Jobs & Skills ──────────────────────────────────────────── */}
      {jobsLoaded && displayJobs.length > 0 ? (
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader
            label={`Jobs & Skills · ${scopeContext}`}
            linkLabel="Browse all"
            linkColor="#A78BFA"
            onLink={() => navigate('/jobs')}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayJobs.map(job => {
              const isSkill = job.typeLabel === 'Skills';
              const badgeColor = isSkill ? '#39D98A' : '#A78BFA';
              return (
                <div
                  key={job.id}
                  onClick={() => navigate('/jobs')}
                  style={{ background: 'var(--color-surface)', border: `1px solid ${badgeColor}18`, borderLeft: `3px solid ${badgeColor}55`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: badgeColor, background: `${badgeColor}18`, borderRadius: '20px', padding: '2px 8px' }}>{isSkill ? '💡 Skills' : '💼 Hiring'}</span>
                      {job.isSeed && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1px 6px' }}>example</span>}
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{job.timeDisplay}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
                    {job.title}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>📍 {job.neighbourhood}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : !jobsLoaded ? (
        <div style={{ marginBottom: '20px' }}>
          <FeedItemSkeleton />
        </div>
      ) : null}

      {/* ── FEED 4: Places near you ────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <SectionHeader label={placesLabel} linkLabel="Browse all" onLink={() => navigate('/neighbourhood')} />

        {loading ? (
          <>
            <VenueCardSkeleton />
            {scope !== 'my_area' && <VenueCardSkeleton />}
          </>
        ) : placesNearYou.length > 0 ? (
          placesNearYou.map(venue => (
            <VenueCard
              key={venue.id}
              venue={venue}
              headingCount={headingCounts[venue.id] ?? 0}
              vibeWinner={vibeWinners[venue.id] ?? null}
              hasActiveStory={activeStoryVenueIds.has(venue.id)}
              recCount={recCounts[venue.id] ?? 0}
              distance={
                userLat != null && userLon != null &&
                venue.latitude != null && venue.longitude != null
                  ? haversineKm(userLat, userLon, venue.latitude, venue.longitude)
                  : null
              }
            />
          ))
        ) : (
          <div style={{ border: '1.5px dashed rgba(255,255,255,0.10)', borderRadius: '16px', padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🗺️</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: '6px' }}>
              {scope === 'everywhere'
                ? 'No places on Kayaa yet'
                : `${suburb || areaLabel} is waiting to be discovered`}
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.6, margin: '0 0 16px' }}>
              Be the first to add a business and put your area on the map.
            </p>
            <button
              onClick={() => navigate('/onboarding')}
              style={{ background: 'rgba(57,217,138,0.1)', color: '#39D98A', border: '1px solid rgba(57,217,138,0.3)', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
            >
              Add the first business
            </button>
          </div>
        )}
      </div>

      {/* ── FEED 5: Ask the neighbourhood ─────────────────────────────────── */}
      {boardLoaded && (
        <div
          onClick={() => navigate('/board/new?cat=ask')}
          style={{
            marginBottom: '20px',
            background: 'rgba(148,115,250,0.05)',
            border: '1px solid rgba(167,139,250,0.18)',
            borderRadius: '12px',
            padding: '12px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '20px', flexShrink: 0 }}>❓</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#A78BFA', margin: '0 0 2px' }}>
              Ask {suburb || 'the neighbourhood'}
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Good mechanic near here? Best shisanyama? Your neighbours know.
            </p>
          </div>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(167,139,250,0.6)', flexShrink: 0 }}>→</span>
        </div>
      )}

      {/* ── FEED 6: Neighbourhood status (calm "all clear" when no alert) ──── */}
      {alertsLoaded && !utilityAlert && (
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader label="Neighbourhood Status" linkLabel="See all alerts" linkColor="#60A5FA" onLink={() => navigate('/alerts')} />
          <div
            onClick={() => navigate('/alerts')}
            style={{ background: 'rgba(57,217,138,0.05)', border: '1px solid rgba(57,217,138,0.15)', borderLeft: '3px solid rgba(57,217,138,0.4)', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <span style={{ fontSize: '18px', flexShrink: 0 }}>{SEED_ALERT.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', color: '#39D98A', margin: '0 0 2px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{SEED_ALERT.label}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: 'Inter, sans-serif' }}>{SEED_ALERT.message}</p>
            </div>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{SEED_ALERT.time}</span>
          </div>
        </div>
      )}

      {/* ── Utility pill strip (quick access at bottom of feed) ─────────────── */}
      <UtilityPillStrip suburb={suburb} />

      {/* ── Welcome hint — first visit only ─────────────────────────────────── */}
      {showWelcomeHint && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.15)', borderRadius: '14px', padding: '12px 14px', marginBottom: '20px' }}>
          <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.3 }}>👋</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC', margin: '0 0 3px' }}>Welcome to {suburb || 'your neighbourhood'}</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.55 }}>
              Explore nearby places, check in where you go, and stay on top of what's happening.
            </p>
          </div>
          <button
            onClick={() => { localStorage.setItem('kayaa_welcome_dismissed', 'true'); setWelcomeDismissed(true); }}
            aria-label="Dismiss welcome hint"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '2px', flexShrink: 0, fontSize: '16px', lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* Neighbourhood gate */}
      {showAreaGate && <NeighbourhoodGate onDone={() => setShowAreaGate(false)} />}

      {/* Floating Post button */}
      <button
        onClick={() => setShowComposer(true)}
        title="Post to your neighbourhood"
        style={{ position: 'fixed', bottom: '80px', right: '16px', zIndex: 50, width: '52px', height: '52px', borderRadius: '50%', background: '#39D98A', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(57,217,138,0.45)', cursor: 'pointer', transition: 'transform 0.15s, filter 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.filter = '')}
      >
        <PenSquare size={22} color="#0D1117" />
      </button>

      {/* Post composer */}
      {showComposer && (
        <PostComposer neighbourhood={suburb || areaLabel} onClose={() => setShowComposer(false)} onPosted={_post => setRefreshKey(k => k + 1)} />
      )}
    </div>
  );
}
