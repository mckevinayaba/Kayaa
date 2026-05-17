import { useState, useMemo, useEffect, useRef } from 'react';
import { PenSquare } from 'lucide-react';
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
} from '../lib/api';
import type { VibeType, BoardPost, LocalJob, UtilityReport } from '../lib/api';
import type { Venue } from '../types';
import VenueCard from '../components/VenueCard';
import PostBar from '../components/feed/PostBar';
import QuickAddPlace from '../components/QuickAddPlace';
import PushBanner from '../components/PushBanner';
import { useCountry } from '../contexts/CountryContext';

// ─── Scope model ──────────────────────────────────────────────────────────────
type FeedScope = 'this_neighbourhood' | 'nearby' | 'city_wide' | 'explore_all';


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

// ─── Seed data (display-only — never saved to Supabase) ──────────────────────
// Feed shows ONE preview item per section. Full pages show more depth.
// Safety-sensitive content is excluded from seed data.

interface SeedBoardPost { id: string; category: string; title: string; time: string }
interface SeedJob       { id: string; type: 'Hiring' | 'Skills'; title: string; neighbourhood: string; time: string }
interface SeedVenue     { id: string; name: string; category: string; emoji: string; suburb: string; description?: string; regulars?: number; status?: string }
interface SeedAlert     { id: string; icon: string; label: string; message: string; isNormal: boolean; time: string }

// One preview board post — announcement, not a safety/crime incident
const SEED_BOARD_POST: SeedBoardPost = {
  id: 'seed-b1', category: 'announcement',
  title: 'City Cuts Barbershop open today — walk-ins welcome until 6pm',
  time: '4 hours ago',
};

// One preview job for the feed
const SEED_JOB: SeedJob = {
  id: 'seed-j1', type: 'Hiring',
  title: 'Domestic worker needed — 3 days per week',
  neighbourhood: 'Berea', time: 'Today',
};

// One preview place for the feed
const SEED_VENUE: SeedVenue = {
  id: 'sv1', name: 'City Cuts Barbershop', category: 'Barbershop', emoji: '✂️',
  suburb: 'Berea', description: 'Barbershop on Claim Street serving the Berea community',
  regulars: 12, status: 'Open',
};

// One preview alert for the feed — utility/status, not a crime/safety incident
const SEED_ALERT: SeedAlert = {
  id: 'seed-alert-1', icon: '⚡', label: 'Status',
  message: 'No power or water issues reported in your area',
  isNormal: true, time: 'Updated just now',
};

// ─── Normalised display types (real + seed share the same render path) ────────

interface DisplayBoardPost { id: string; category: string; title: string; timeDisplay: string; isSeed?: boolean }
interface DisplayJob       { id: string; typeLabel: 'Hiring' | 'Skills'; title: string; neighbourhood: string; timeDisplay: string; isSeed?: boolean }

// ─── Category colour / label maps ────────────────────────────────────────────

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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

// ─── Seed venue cards (display-only — no navigation) ─────────────────────────

function SeedVenueHero({ venue }: { venue: SeedVenue }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
        <span style={{ fontSize: '28px', flexShrink: 0 }}>{venue.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '17px', color: '#F0F6FC', lineHeight: 1.2 }}>{venue.name}</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{venue.category} · {venue.suburb}</div>
        </div>
        {venue.status && (
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 700, color: '#39D98A', background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '20px', padding: '2px 8px', flexShrink: 0 }}>
            {venue.status}
          </span>
        )}
      </div>
      {venue.description && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 10px', lineHeight: 1.55 }}>{venue.description}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>👥 {venue.regulars ?? 0} regulars</span>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>example</span>
      </div>
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
    fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
    WebkitTapHighlightColor: 'transparent',
  };
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', marginLeft: '-16px', paddingLeft: '16px', marginRight: '-16px', paddingRight: '16px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <button style={{ ...pillBase, color: '#39D98A' }} onClick={() => navigate('/report/utility/power')}>⚡ No load shedding</button>
        <button style={{ ...pillBase, color: '#39D98A' }} onClick={() => navigate('/report/utility/water')}>💧 Water normal</button>
        <button style={{ ...pillBase, color: 'rgba(255,255,255,0.5)' }} onClick={() => navigate('/alerts')}>🔔 {suburb ? `${suburb} alerts` : 'Local alerts'}</button>
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

  // Tracks when async section fetches have resolved
  const [boardLoaded,   setBoardLoaded]   = useState(false);
  const [jobsLoaded,    setJobsLoaded]    = useState(false);
  const [alertsLoaded,  setAlertsLoaded]  = useState(false);
  const [utilityAlert,  setUtilityAlert]  = useState<UtilityReport | null>(null);

  const [showComposer, setShowComposer] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [isOnline,  setIsOnline]  = useState(navigator.onLine);
  const [cacheDate, setCacheDate] = useState<string | null>(null);

  // Pull-to-refresh
  const [pullDelta,   setPullDelta]   = useState(0);
  const [refreshing,  setRefreshing]  = useState(false);
  const [refreshKey,  setRefreshKey]  = useState(0);
  const touchStartY   = useRef(0);
  const pullDeltaRef  = useRef(0);
  const refreshingRef = useRef(false);
  const liveRegion    = useRef<HTMLDivElement>(null);

  // Interactivity
  const [headingCounts,       setHeadingCounts]       = useState<Record<string, number>>({});
  const [vibeWinners,         setVibeWinners]         = useState<Record<string, { vibe: VibeType; count: number } | null>>({});
  const [activeStoryVenueIds, setActiveStoryVenueIds] = useState<Set<string>>(new Set());

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

  // Pull-to-refresh
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
    // Reset section-level loaded flags when area/country changes
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

        // Board: board_posts table, last 7 days — feed shows 1 preview
        getBoardPosts(suburb || '', city || '')
          .then(result => {
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const recent = result.posts
              .filter(p => new Date(p.createdAt).getTime() > sevenDaysAgo)
              .slice(0, 1);
            setBoardPosts(recent);
            setBoardLoaded(true);
          })
          .catch(() => { setBoardLoaded(true); });

        // Jobs: local_jobs table, exact suburb match — feed shows 1 preview
        if (suburb) {
          getLocalJobs(suburb)
            .then(jobs => { setJobPosts(jobs.slice(0, 1)); setJobsLoaded(true); })
            .catch(() => { setJobsLoaded(true); });
        } else {
          setJobsLoaded(true);
        }

        // Alerts preview: utility reports — show first active issue or seed status
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

        // Batch interactivity
        const ids = venues.map(vv => vv.id);
        if (ids.length > 0) {
          Promise.all([getHeadingThereCountsBatch(ids), getVibeWinnersBatch(ids), getActiveStoryVenuesBatch(ids)])
            .then(([hc, vw, as_]) => { setHeadingCounts(hc); setVibeWinners(vw); setActiveStoryVenueIds(as_); })
            .catch(() => {});
        }
      })
      .catch(() => { setRefreshing(false); refreshingRef.current = false; setBoardLoaded(true); setJobsLoaded(true); setAlertsLoaded(true); });
  }, [areaLabel, selectedCountry.code, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Computed ────────────────────────────────────────────────────────────

  // Feed shows ONE preview place; full discover page shows all
  const placesNearYou = useMemo(() => {
    if (!suburb && !city) return rawVenues.slice(0, 1);
    return rawVenues
      .filter(v => isCleanVenue(v) && venueInScope(v, 'this_neighbourhood', suburb, city, userLat, userLon))
      .slice(0, 1);
  }, [rawVenues, suburb, city, userLat, userLon]);

  // sparseLocal note removed — feed intentionally shows one preview place

  // Normalise real board post → DisplayBoardPost (1 item for feed preview), fall back to seed
  const displayBoardPosts = useMemo<DisplayBoardPost[]>(() => {
    if (!boardLoaded) return [];
    if (boardPosts.length > 0) {
      return [{
        id: boardPosts[0].id,
        category: boardPosts[0].category || 'general',
        title: boardPosts[0].title || boardPosts[0].description || '',
        timeDisplay: timeAgo(boardPosts[0].createdAt),
        isSeed: false,
      }];
    }
    return [{ id: SEED_BOARD_POST.id, category: SEED_BOARD_POST.category, title: SEED_BOARD_POST.title, timeDisplay: SEED_BOARD_POST.time, isSeed: true }];
  }, [boardLoaded, boardPosts]);

  // Normalise real job → DisplayJob (1 item for feed preview), fall back to seed
  const displayJobs = useMemo<DisplayJob[]>(() => {
    if (!jobsLoaded) return [];
    if (jobPosts.length > 0) {
      return [{
        id: jobPosts[0].id,
        typeLabel: jobPosts[0].jobType === 'skill_offer' ? 'Skills' as const : 'Hiring' as const,
        title: jobPosts[0].title,
        neighbourhood: jobPosts[0].neighbourhood,
        timeDisplay: timeAgo(jobPosts[0].createdAt),
        isSeed: false,
      }];
    }
    return [{ id: SEED_JOB.id, typeLabel: SEED_JOB.type, title: SEED_JOB.title, neighbourhood: SEED_JOB.neighbourhood, timeDisplay: SEED_JOB.time, isSeed: true }];
  }, [jobsLoaded, jobPosts]);

  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem('kayaa_welcome_dismissed') === 'true'
  );
  const showWelcomeHint = !loading && !welcomeDismissed;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '16px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>

      {/* Accessible live region */}
      <div ref={liveRegion} role="status" aria-live="polite" className="sr-only">
        {loading ? 'Loading places…' : refreshing ? 'Refreshing…' : `${placesNearYou.length} place${placesNearYou.length !== 1 ? 's' : ''} loaded`}
      </div>

      {/* Pull-to-refresh indicator */}
      {pullDelta > 10 && (
        <div style={{ position: 'fixed', top: '56px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '6px 14px', opacity: Math.min(pullDelta / 60, 1), pointerEvents: 'none' }}>
          <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(57,217,138,0.35)', borderTopColor: '#39D98A', transform: `rotate(${Math.min(pullDelta * 4.5, 360)}deg)` }} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)' }}>{pullDelta >= 60 ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      )}

      {/* Refreshing banner */}
      {refreshing && !loading && (
        <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '5px 12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(57,217,138,0.25)', borderTopColor: '#39D98A', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)' }}>Refreshing…</span>
          </div>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px' }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F59E0B' }}>You're offline</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', lineHeight: 1.4 }}>
              {cacheDate ? `Showing places saved ${new Date(cacheDate).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}. Some info may be outdated.` : 'No cached data available. Connect to the internet to load places.'}
            </div>
          </div>
        </div>
      )}

      {/* GPS confirmation banner */}
      {showGpsConfirm && !manualOverride && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(57,217,138,0.07)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '12px', padding: '10px 14px', marginBottom: '12px' }}>
          <span style={{ fontSize: '15px', flexShrink: 0 }}>📍</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 1.4 }}>
            Showing <strong style={{ color: '#F0F6FC' }}>{suburb}</strong> — not right?
          </span>
          <button onClick={handleChangeArea} style={{ padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#39D98A', color: '#0D1117', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>Change</button>
          <button onClick={handleConfirmGpsSuburb} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '16px', padding: '0 2px', flexShrink: 0 }} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* Area search */}
      {showAreaSearch && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '10px' }}>Which suburb are you in?</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              autoFocus value={areaSearchQuery}
              onChange={e => setAreaSearchQuery(e.target.value)}
              placeholder="e.g. Rosebank, Soweto…"
              style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#F0F6FC', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', outline: 'none' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && areaSearchQuery.trim()) { setManualOverride(areaSearchQuery.trim(), city); setShowAreaSearch(false); setRefreshKey(k => k + 1); }
                if (e.key === 'Escape') setShowAreaSearch(false);
              }}
            />
            <button
              onClick={() => { if (areaSearchQuery.trim()) { setManualOverride(areaSearchQuery.trim(), city); setShowAreaSearch(false); setRefreshKey(k => k + 1); } }}
              style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: '#39D98A', color: '#0D1117', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px' }}
            >Set</button>
          </div>
          <button onClick={() => setShowAreaSearch(false)} style={{ marginTop: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', padding: 0 }}>Cancel — use my GPS location</button>
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
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#93C5FD', flex: 1 }}>Browsing <strong>{manualOverride}</strong></span>
          <button onClick={() => { clearManualOverride(); setRefreshKey(k => k + 1); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#60A5FA', padding: '0', flexShrink: 0 }}>Use GPS</button>
        </div>
      )}

      {/* ── 1. Neighbourhood header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(57,217,138,0.6)', margin: '0 0 6px' }}>
          {getGreeting()}
        </p>
        <div onClick={() => setShowAreaGate(true)} style={{ cursor: 'pointer', marginBottom: '6px' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '28px', color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.05, margin: 0 }}>
            {areaLabel}
          </h1>
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: '#9CA3AF', margin: '0 0 10px' }}>
          {!suburb
            ? 'Set your neighbourhood to see places nearby'
            : rawVenues.length === 0
              ? `No places in ${suburb} yet — be the first to add one`
              : `${rawVenues.length} place${rawVenues.length !== 1 ? 's' : ''} in your neighbourhood`}
        </p>
        {!loading && rawVenues.length > 0 && (() => {
          const activeNow = rawVenues.filter(v => v.lastCheckinAt && Date.now() - new Date(v.lastCheckinAt).getTime() < 2 * 60 * 60 * 1000).length;
          if (activeNow === 0) return null;
          const dateStr = new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#39D98A' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#39D98A', display: 'inline-block', boxShadow: '0 0 5px rgba(57,217,138,0.6)' }} />
                {activeNow} active now
              </span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{dateStr}</span>
            </div>
          );
        })()}
      </div>

      {/* ── 2. PostBar + PushBanner ─────────────────────────────────────────── */}
      <PostBar suburb={suburb || areaLabel} onPost={() => setShowComposer(true)} onAddPlace={() => setQuickAddOpen(true)} />
      <PushBanner />

      {/* ── 3. Utility pills ────────────────────────────────────────────────── */}
      <UtilityPillStrip suburb={suburb} />

      {/* ── 4. Places near you ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Places near you</p>
          <button onClick={() => navigate('/neighbourhood')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#39D98A' }}>Browse all →</button>
        </div>

        {loading ? (
          <VenueCardSkeleton />
        ) : placesNearYou.length > 0 ? (
          <VenueCard venue={placesNearYou[0]} headingCount={headingCounts[placesNearYou[0].id] ?? 0} vibeWinner={vibeWinners[placesNearYou[0].id] ?? null} hasActiveStory={activeStoryVenueIds.has(placesNearYou[0].id)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <SeedVenueHero venue={SEED_VENUE} />
            <button
              onClick={() => navigate('/onboarding')}
              style={{ marginTop: '4px', background: 'rgba(57,217,138,0.07)', color: '#39D98A', border: '1px dashed rgba(57,217,138,0.25)', borderRadius: '12px', padding: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '12px', width: '100%', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
            >
              + Register the first real place in {suburb || areaLabel}
            </button>
          </div>
        )}
      </div>

      {/* ── 5. Welcome card (first visit, dismissible) ──────────────────────── */}
      {showWelcomeHint && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.15)', borderRadius: '14px', padding: '12px 14px', marginBottom: '20px' }}>
          <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.3 }}>👋</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC', margin: '0 0 3px' }}>Welcome to {suburb || 'your neighbourhood'}</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.55 }}>Explore nearby places, check in where you go, and stay on top of local alerts.</p>
          </div>
          <button onClick={() => { localStorage.setItem('kayaa_welcome_dismissed', 'true'); setWelcomeDismissed(true); }} aria-label="Dismiss welcome hint" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '2px', flexShrink: 0, fontSize: '16px', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── 6. From the Board — ONE preview post (real or starter) ────────── */}
      {boardLoaded && displayBoardPosts.length > 0 && (() => {
        const post = displayBoardPosts[0];
        const color = CAT_COLORS[post.category] ?? CAT_COLORS.general;
        const label = CAT_LABELS[post.category] ?? post.category;
        return (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: 0 }}>From the Board</p>
                {post.isSeed && (
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1px 6px' }}>local example</span>
                )}
              </div>
              <button onClick={() => navigate('/board')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#39D98A' }}>See all posts →</button>
            </div>
            <div onClick={() => navigate('/board')} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ display: 'inline-block', fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 700, color, background: `${color}18`, borderRadius: '20px', padding: '2px 8px' }}>{label}</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{post.timeDisplay}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                {post.title}
              </p>
            </div>
          </div>
        );
      })()}

      {/* ── 7. Jobs & Skills — ONE preview listing (real or starter) ──────── */}
      {jobsLoaded && displayJobs.length > 0 && (() => {
        const job = displayJobs[0];
        const isSkill = job.typeLabel === 'Skills';
        const badgeColor = isSkill ? '#39D98A' : '#A78BFA';
        return (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  Jobs &amp; Skills{suburb ? ` · ${suburb}` : ''}
                </p>
                {job.isSeed && (
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1px 6px' }}>local example</span>
                )}
              </div>
              <button onClick={() => navigate('/jobs')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#A78BFA' }}>Browse all jobs →</button>
            </div>
            <div onClick={() => navigate('/jobs')} style={{ background: 'var(--color-surface)', border: `1px solid ${badgeColor}18`, borderLeft: `3px solid ${badgeColor}55`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 700, color: badgeColor, background: `${badgeColor}18`, borderRadius: '20px', padding: '2px 8px' }}>{isSkill ? '💡 Skills' : '💼 Hiring'}</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{job.timeDisplay}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}>
                {job.title}
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>📍 {job.neighbourhood}</p>
            </div>
          </div>
        );
      })()}

      {/* ── 8. Alerts preview — ONE status/utility item (real or starter) ─── */}
      {alertsLoaded && (() => {
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

        if (utilityAlert) {
          const isPower = utilityAlert.category === 'power';
          const meta = isPower
            ? (POWER_LABELS[utilityAlert.issueType] ?? { icon: '⚡', label: 'Power issue' })
            : (WATER_LABELS[utilityAlert.issueType] ?? { icon: '💧', label: 'Water issue' });
          const color = isPower ? '#FBBF24' : '#60A5FA';
          return (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Neighbourhood Status</p>
                <button onClick={() => navigate('/alerts')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#60A5FA' }}>See all alerts →</button>
              </div>
              <div onClick={() => navigate('/alerts')} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderLeft: `3px solid ${color}55`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 700, color, background: `${color}18`, borderRadius: '20px', padding: '2px 8px' }}>{meta.icon} {meta.label}</span>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{timeAgo(utilityAlert.createdAt)}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}>
                  📍 {utilityAlert.areaDetail}
                  {utilityAlert.reportCount > 1 && <span style={{ color, fontWeight: 700 }}> · {utilityAlert.reportCount} reports</span>}
                </p>
              </div>
            </div>
          );
        }

        // Starter: calm "all clear" status card — not a fake crime/safety incident
        return (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Neighbourhood Status</p>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1px 6px' }}>local example</span>
              </div>
              <button onClick={() => navigate('/alerts')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#60A5FA' }}>See all alerts →</button>
            </div>
            <div onClick={() => navigate('/alerts')} style={{ background: 'rgba(57,217,138,0.05)', border: '1px solid rgba(57,217,138,0.15)', borderLeft: '3px solid rgba(57,217,138,0.4)', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{SEED_ALERT.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', color: '#39D98A', margin: '0 0 2px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>{SEED_ALERT.label}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>{SEED_ALERT.message}</p>
              </div>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{SEED_ALERT.time}</span>
            </div>
          </div>
        );
      })()}

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
