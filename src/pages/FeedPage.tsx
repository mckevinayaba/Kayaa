import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useLocation from '../hooks/useLocation';
import { haversineKm } from '../lib/geocode';
import { getAreaTier, tierScore } from '../lib/areaGroups';
import NeighbourhoodGate from '../components/NeighbourhoodGate';
import {
  getAllVenues, getAllEvents, getActiveStories,
  getTrendingPlaces, getHappeningTonight, getNewPlaces,
  getMostLovedPlaces, getGlobalActivity,
  getNeighbourhoodPosts, getLocalJobs,
} from '../lib/api';
import type { TrendingVenue, TonightEvent, ActivityItem, NeighbourhoodPost, LocalJob } from '../lib/api';
import type { Venue, Event, Story } from '../types';
import VenueCard from '../components/VenueCard';
import ActivityMoment from '../components/ActivityMoment';
import EventRail from '../components/EventRail';
import StoriesStrip from '../components/StoriesStrip';
import TrendingRail from '../components/TrendingRail';
import HappeningTonight from '../components/HappeningTonight';
import MostLovedRail from '../components/MostLovedRail';
import CategoryStrip from '../components/CategoryStrip';

// ─── Scope model ──────────────────────────────────────────────────────────────
//
//  this_neighbourhood  Strict suburb match   GPS ≤ 8 km
//  nearby              Same city / cluster   GPS ≤ 30 km
//  city_wide           Full metro            GPS ≤ 60 km
//  explore_all         No geo restriction    everything clean
//
// Default is chosen after data loads:
//   this_neighbourhood  if ≥ LOCAL_THRESHOLD venues exist locally
//   nearby              otherwise
//
// ─────────────────────────────────────────────────────────────────────────────

type FeedScope = 'this_neighbourhood' | 'nearby' | 'city_wide' | 'explore_all';
type ActivityFilter = 'All' | 'Open now' | 'Busy now' | 'Events today';

const LOCAL_THRESHOLD = 3; // min local venues before defaulting to nearby
const ACTIVITY_FILTERS: ActivityFilter[] = ['All', 'Open now', 'Busy now', 'Events today'];
const MAIN_CATS = new Set(['Barbershop', 'Shisanyama', 'Café', 'Salon', 'Tavern', 'Church', 'Carwash', 'Spaza Shop']);

const SCOPE_LABELS: Record<FeedScope, string> = {
  this_neighbourhood: 'My area',
  nearby: 'Nearby',
  city_wide: 'City-wide',
  explore_all: 'Explore',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Single truth function for whether a venue falls inside a given scope.
// GPS path: haversine distance (fast, accurate once coords are populated).
// Text path: cluster-based tier lookup — prevents cross-city bleed.
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

  // Text fallback: use explicit cluster model so e.g. a Khayelitsha venue is
  // always 'outside' for a Honeydew user (their clusters never overlap).
  const tier = getAreaTier(v.neighborhood, v.city, suburb, city);
  switch (scope) {
    case 'this_neighbourhood': return tier === 'exact';
    case 'nearby':             return tier === 'exact' || tier === 'cluster';
    case 'city_wide':          return tier === 'exact' || tier === 'cluster' || tier === 'metro';
  }
}

function areaScore(venue: Venue, suburb: string, city: string): number {
  const tier = getAreaTier(venue.neighborhood, venue.city, suburb, city);
  return tierScore(tier);
}

// Filter + sort main venue list by scope.
function filterAndRankByScope(
  venues: Venue[],
  scope: FeedScope,
  suburb: string,
  city: string,
  userLat?: number,
  userLon?: number,
): Venue[] {
  const clean = venues.filter(isCleanVenue);
  const filtered = clean.filter(v => venueInScope(v, scope, suburb, city, userLat, userLon));

  if (userLat != null && userLon != null) {
    return [...filtered].sort((a, b) => {
      const aC = a.latitude != null && a.longitude != null;
      const bC = b.latitude != null && b.longitude != null;
      if (aC && bC) return haversineKm(userLat, userLon, a.latitude!, a.longitude!) - haversineKm(userLat, userLon, b.latitude!, b.longitude!);
      if (aC) return -1;
      if (bC) return 1;
      return areaScore(b, suburb, city) - areaScore(a, suburb, city);
    });
  }
  return [...filtered].sort((a, b) => areaScore(b, suburb, city) - areaScore(a, suburb, city));
}

// Rail scope filter: tries to keep results local; auto-expands with a flag
// so the UI can show honest copy about where results are coming from.
interface RailResult<T> {
  venues: T[];
  expanded: boolean;
  expandedScope: FeedScope | null;
}

function scopeFilterRail<T extends Venue>(
  venues: T[],
  scope: FeedScope,
  suburb: string,
  city: string,
  userLat?: number,
  userLon?: number,
): RailResult<T> {
  const none: RailResult<T> = { venues: [], expanded: false, expandedScope: null };
  if (venues.length === 0) return none;

  // explore_all and city_wide: show as-is, already filtered at API level
  if (scope === 'explore_all' || scope === 'city_wide') {
    return { venues, expanded: false, expandedScope: null };
  }

  const matching = venues.filter(v => venueInScope(v, scope, suburb, city, userLat, userLon));
  if (matching.length >= 1) return { venues: matching, expanded: false, expandedScope: null };

  // Not enough local — try next scope tier
  if (scope === 'this_neighbourhood') {
    const nearbyMatch = venues.filter(v => venueInScope(v, 'nearby', suburb, city, userLat, userLon));
    if (nearbyMatch.length >= 1) return { venues: nearbyMatch, expanded: true, expandedScope: 'nearby' };
  }

  // Still nothing — surface whatever was returned (already city-scoped by API)
  return { venues: venues.slice(0, 3), expanded: true, expandedScope: 'city_wide' };
}

function applyActivityFilter(venues: Venue[], filter: ActivityFilter, ids: Set<string>): Venue[] {
  switch (filter) {
    case 'Open now':     return venues.filter(v => v.isOpen);
    case 'Busy now':     return venues.filter(v => v.checkinCount > 1000);
    case 'Events today': return venues.filter(v => ids.has(v.id));
    default:             return venues;
  }
}

function applyCategoryFilter(venues: Venue[], cat: string, ids: Set<string>): Venue[] {
  switch (cat) {
    case 'All':    return venues;
    case 'Food':   return venues.filter(v => ['Shisanyama', 'Café'].includes(v.category));
    case 'Spaza':  return venues.filter(v => v.category === 'Spaza Shop');
    case 'Events': return venues.filter(v => ids.has(v.id));
    case 'More':   return venues.filter(v => !MAIN_CATS.has(v.category));
    default:       return venues.filter(v => v.category === cat);
  }
}

const ACTIVITY_AFTER = new Set([0, 1, 2]);

// ─── Scope selector ───────────────────────────────────────────────────────────

function ScopeSelector({ value, onChange }: { value: FeedScope; onChange: (s: FeedScope) => void }) {
  // Show 4 chips; "Explore" is visually de-emphasised
  const scopes: FeedScope[] = ['this_neighbourhood', 'nearby', 'city_wide', 'explore_all'];
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' } as React.CSSProperties}>
      {scopes.map(s => {
        const active = value === s;
        const isExplore = s === 'explore_all';
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            style={{
              padding: '5px 13px',
              borderRadius: '20px',
              border: active ? 'none' : `1px solid ${isExplore ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'}`,
              background: active ? 'rgba(57,217,138,0.15)' : 'transparent',
              color: active ? '#39D98A' : isExplore ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.45)',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {SCOPE_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function VenueCardSkeleton() {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--color-surface2)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: '16px', width: '55%', background: 'var(--color-surface2)', borderRadius: '6px', marginBottom: '8px' }} />
          <div style={{ height: '12px', width: '35%', background: 'var(--color-surface2)', borderRadius: '6px' }} />
        </div>
      </div>
      <div style={{ height: '13px', width: '85%', background: 'var(--color-surface2)', borderRadius: '6px', marginBottom: '16px' }} />
      <div style={{ height: '1px', background: 'var(--color-border)', marginBottom: '12px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ height: '12px', width: '25%', background: 'var(--color-surface2)', borderRadius: '6px' }} />
        <div style={{ height: '30px', width: '80px', background: 'var(--color-surface2)', borderRadius: '20px' }} />
      </div>
    </div>
  );
}

// ─── Honest context notes ─────────────────────────────────────────────────────

function ScopeNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      background: 'rgba(57,217,138,0.06)',
      border: '1px solid rgba(57,217,138,0.14)',
      borderRadius: '10px', padding: '9px 12px',
      marginBottom: '12px',
    }}>
      <span style={{ fontSize: '13px', lineHeight: 1 }}>📍</span>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.52)', lineHeight: 1.5, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
        {children}
      </p>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.5 }}>🔍</div>
      <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '8px' }}>No places found</h3>
      <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>Try a different filter or check back later</p>
    </div>
  );
}

function LocalEmptyState({ scope, areaLabel, onExpand }: {
  scope: FeedScope;
  areaLabel: string;
  onExpand: (s: FeedScope) => void;
}) {
  const nextScope: FeedScope = scope === 'this_neighbourhood' ? 'nearby'
    : scope === 'nearby' ? 'city_wide' : 'explore_all';

  const nextLabel = SCOPE_LABELS[nextScope];

  return (
    <div style={{ padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>📍</div>
      <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '8px' }}>
        {scope === 'this_neighbourhood' ? 'No places in your neighbourhood yet' : 'No places found in this area'}
      </h3>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: '20px' }}>
        {scope === 'this_neighbourhood'
          ? `No places are registered near ${areaLabel} yet.`
          : `Nothing found at this scope for ${areaLabel}.`}
      </p>
      {scope !== 'explore_all' && (
        <button
          onClick={() => onExpand(nextScope)}
          style={{
            background: 'rgba(57,217,138,0.1)', color: '#39D98A',
            border: '1px solid rgba(57,217,138,0.25)', borderRadius: '12px',
            padding: '10px 22px', fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600, fontSize: '13px', cursor: 'pointer',
          }}
        >
          Show {nextLabel} →
        </button>
      )}
    </div>
  );
}

// ─── New Places section ───────────────────────────────────────────────────────

const NEW_CAT_COLOR: Record<string, string> = {
  Barbershop: '#39D98A', Shisanyama: '#F5A623', Tavern: '#60A5FA',
  Café: '#F59E0B', Church: '#A78BFA', Carwash: '#34D399',
  'Spaza Shop': '#60A5FA', Salon: '#F472B6', Tutoring: '#34D399',
  'Sports Ground': '#FB923C', 'Home Business': '#94A3B8',
};
const NEW_CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

function NewPlacesSection({ venues, expandedNote }: { venues: Venue[]; expandedNote?: string }) {
  const navigate = useNavigate();
  if (venues.length === 0) return null;
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', marginBottom: expandedNote ? '6px' : '12px' }}>
        New in your neighbourhood 🆕
      </h2>
      {expandedNote && (
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', marginBottom: '10px', fontFamily: 'DM Sans, sans-serif' }}>
          {expandedNote}
        </p>
      )}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', marginLeft: '-16px', paddingLeft: '16px', marginRight: '-16px', paddingRight: '16px', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {venues.map(venue => {
          const emoji = NEW_CAT_EMOJI[venue.category] ?? '📍';
          const color = NEW_CAT_COLOR[venue.category] ?? '#39D98A';
          return (
            <div key={venue.id} onClick={() => navigate(`/venue/${venue.slug}`)} style={{ flexShrink: 0, width: '150px', background: 'var(--color-surface)', border: '1px solid rgba(57,217,138,0.25)', borderRadius: '14px', padding: '12px', cursor: 'pointer' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '8px' }}>
                {emoji}
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--color-text)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {venue.name}
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#39D98A', background: 'rgba(57,217,138,0.12)', padding: '2px 8px', borderRadius: '20px', display: 'inline-block' }}>
                Just joined
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Board & Jobs teasers ─────────────────────────────────────────────────────

const BOARD_CAT_COLORS: Record<string, string> = {
  announcement: '#60A5FA', lost_found: '#F5A623', question: '#A78BFA',
  recommendation: '#39D98A', event: '#F472B6', general: '#94A3B8',
};
const BOARD_CAT_LABELS: Record<string, string> = {
  announcement: 'Announcement', lost_found: 'Lost & Found', question: 'Question',
  recommendation: 'Recommendation', event: 'Event', general: 'General',
};
const JOB_TYPE_COLORS: Record<string, string> = { full_time: '#39D98A', part_time: '#60A5FA', once_off: '#F5A623', skill_offer: '#A78BFA' };
const JOB_TYPE_LABELS: Record<string, string> = { full_time: 'Full time', part_time: 'Part time', once_off: 'Once-off', skill_offer: 'Skill offer' };

function teaserTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function BoardTeaser({ posts }: { posts: NeighbourhoodPost[] }) {
  const navigate = useNavigate();
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', margin: 0 }}>From the neighbourhood board</h2>
        <button onClick={() => navigate('/board')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-accent)', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>See all →</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {posts.map(post => {
          const color = BOARD_CAT_COLORS[post.category] ?? '#94A3B8';
          return (
            <div key={post.id} onClick={() => navigate('/board')} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color, background: `${color}18`, padding: '2px 8px', borderRadius: '20px' }}>{BOARD_CAT_LABELS[post.category] ?? post.category}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{teaserTime(post.createdAt)}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                {post.content}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JobsTeaser({ jobs }: { jobs: LocalJob[] }) {
  const navigate = useNavigate();
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', margin: 0 }}>Local opportunities</h2>
        <button onClick={() => navigate('/jobs')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-accent)', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>See all →</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {jobs.map(job => {
          const color = JOB_TYPE_COLORS[job.jobType] ?? '#94A3B8';
          return (
            <div key={job.id} onClick={() => navigate('/jobs')} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>💼</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--color-text)', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color, background: `${color}18`, padding: '1px 7px', borderRadius: '20px' }}>{JOB_TYPE_LABELS[job.jobType] ?? job.jobType}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>👤 {job.postedBy}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PWA Install Banner ───────────────────────────────────────────────────────

function InstallBanner() {
  const [show, setShow] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deferredRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onPrompt(e: any) { e.preventDefault(); deferredRef.current = e; }
    window.addEventListener('beforeinstallprompt' as keyof WindowEventMap, onPrompt as EventListener);
    return () => window.removeEventListener('beforeinstallprompt' as keyof WindowEventMap, onPrompt as EventListener);
  }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true;
    if (isStandalone) return;
    if (localStorage.getItem('kayaa_install_dismissed')) return;
    const visits = parseInt(localStorage.getItem('kayaa_feed_visits') ?? '0') + 1;
    localStorage.setItem('kayaa_feed_visits', String(visits));
    if (visits >= 2) setShow(true);
  }, []);

  if (!show) return null;

  function handleAdd() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (deferredRef.current && (deferredRef.current as any).prompt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (deferredRef.current as any).prompt();
      setShow(false);
    } else {
      setShowFallback(true);
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '64px', left: 0, right: 0, zIndex: 40, background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--color-text)', marginBottom: '2px' }}>Add Kayaa to your home screen</div>
        {showFallback
          ? <div style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.4 }}>Tap the share button in your browser, then <strong>Add to Home Screen</strong></div>
          : <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Open it like an app, any time.</div>}
      </div>
      {!showFallback && (
        <button onClick={handleAdd} style={{ background: 'var(--color-accent)', color: '#000', border: 'none', borderRadius: '10px', padding: '8px 18px', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>Add</button>
      )}
      <button onClick={() => { localStorage.setItem('kayaa_install_dismissed', '1'); setShow(false); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', flexShrink: 0, padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { suburb, city, lat: userLat, lon: userLon, needsConfirmation } = useLocation();

  // Raw data from API (unfiltered beyond isCleanVenue)
  const [rawVenues, setRawVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [rawTrending, setRawTrending] = useState<TrendingVenue[]>([]);
  const [tonight, setTonight] = useState<TonightEvent[]>([]);
  const [rawNewPlaces, setRawNewPlaces] = useState<Venue[]>([]);
  const [rawMostLoved, setRawMostLoved] = useState<Venue[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [boardPosts, setBoardPosts] = useState<NeighbourhoodPost[]>([]);
  const [boardJobs, setBoardJobs] = useState<LocalJob[]>([]);
  const [loading, setLoading] = useState(true);

  // UI filters
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Scope: starts at 'nearby' (safe default); set to smart default after data loads.
  // manualScope tracks whether the user explicitly picked a scope this session.
  const [scope, setScope] = useState<FeedScope>('nearby');
  const [manualScope, setManualScope] = useState<FeedScope | null>(null);

  const [showAreaGate, setShowAreaGate] = useState(needsConfirmation);

  const areaLabel = suburb || city || 'Your area';

  // Reset manual scope override when user changes area so smart default re-applies
  useEffect(() => {
    setManualScope(null);
  }, [areaLabel]);

  useEffect(() => {
    Promise.all([
      getAllVenues(),
      getAllEvents(),
      getActiveStories(),
      getTrendingPlaces(city),
      getHappeningTonight(),
      getNewPlaces(city),
      getMostLovedPlaces(city),
      getGlobalActivity(),
      getNeighbourhoodPosts(areaLabel),
      getLocalJobs(areaLabel),
    ]).then(([v, e, s, tr, tn, np, ml, act, bp, bj]) => {
      const venues = v as Venue[];
      setRawVenues(venues);
      setEvents(e);
      setStories(s);
      setRawTrending(tr);
      setTonight(tn);
      setRawNewPlaces(np);
      setRawMostLoved(ml);
      setActivity(act);
      setBoardPosts((bp as NeighbourhoodPost[]).slice(0, 2));
      setBoardJobs((bj as LocalJob[]).slice(0, 2));
      setLoading(false);

      // Smart default scope: use this_neighbourhood only if enough local places exist.
      // Respect manual override if user already tapped a chip.
      if (!manualScope) {
        const localCount = venues
          .filter(isCleanVenue)
          .filter(u => venueInScope(u, 'this_neighbourhood', suburb, city, userLat, userLon))
          .length;
        setScope(localCount >= LOCAL_THRESHOLD ? 'this_neighbourhood' : 'nearby');
      }
    });
  }, [areaLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleScopeChange(s: FeedScope) {
    setManualScope(s);
    setScope(s);
    setCategoryFilter('All');
    setActivityFilter('All');
  }

  // ─── Computed: main venue list ───────────────────────────────────────────────

  const venues = useMemo(
    () => filterAndRankByScope(rawVenues, scope, suburb, city, userLat, userLon),
    [rawVenues, scope, suburb, city, userLat, userLon],
  );

  // Sparse local: in this_neighbourhood scope with some but few results
  const sparseLocal = !loading && scope === 'this_neighbourhood' && venues.length > 0 && venues.length < LOCAL_THRESHOLD;

  const venueIdsWithEvents = useMemo(() => new Set(events.map(e => e.venueId)), [events]);

  const isFiltered = !!(search.trim() || categoryFilter !== 'All' || activityFilter !== 'All');

  const filteredVenues = useMemo(() => {
    let result = applyCategoryFilter(venues, categoryFilter, venueIdsWithEvents);
    result = applyActivityFilter(result, activityFilter, venueIdsWithEvents);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.neighborhood.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q)
      );
    }
    return result;
  }, [venues, activityFilter, categoryFilter, search, venueIdsWithEvents]);

  // ─── Computed: scope-filtered rails ─────────────────────────────────────────

  const trendingResult = useMemo(
    () => scopeFilterRail(rawTrending, scope, suburb, city, userLat, userLon),
    [rawTrending, scope, suburb, city, userLat, userLon],
  );

  const newPlacesResult = useMemo(
    () => scopeFilterRail(rawNewPlaces, scope, suburb, city, userLat, userLon),
    [rawNewPlaces, scope, suburb, city, userLat, userLon],
  );

  const mostLovedResult = useMemo(
    () => scopeFilterRail(rawMostLoved, scope, suburb, city, userLat, userLon),
    [rawMostLoved, scope, suburb, city, userLat, userLon],
  );

  const openCount = venues.filter(v => v.isOpen).length;
  let activityIdx = 0;

  // Expand note for rails when auto-expanded beyond selected scope
  function expandNote(result: RailResult<Venue>): string | undefined {
    if (!result.expanded || !result.expandedScope) return undefined;
    if (result.expandedScope === 'nearby') return `None in ${suburb || areaLabel} — showing nearby areas`;
    return `None near ${areaLabel} — showing wider area`;
  }

  return (
    <div style={{ padding: '16px' }}>

      {/* Stories */}
      <StoriesStrip stories={stories} />

      {/* Greeting + clickable area label */}
      <div style={{ marginBottom: '14px' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '2px' }}>{getGreeting()} 👋</p>
        <div
          onClick={() => setShowAreaGate(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '2px' }}
        >
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: 'var(--color-text)', lineHeight: 1.2, margin: 0 }}>
            {areaLabel}
          </h1>
          <MapPin size={15} color="rgba(255,255,255,0.3)" style={{ marginTop: '2px' }} />
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-accent)', fontWeight: 600 }}>
          {loading ? 'Loading…' : `${openCount} places active now`}
        </p>
      </div>

      {/* Scope selector */}
      <ScopeSelector value={scope} onChange={handleScopeChange} />

      {/* Sparse local banner: shown when this_neighbourhood has results but few */}
      {sparseLocal && (
        <ScopeNote>
          Only {venues.length} place{venues.length === 1 ? '' : 's'} active near {suburb || areaLabel} right now.{' '}
          <button
            onClick={() => handleScopeChange('nearby')}
            style={{ background: 'none', border: 'none', color: '#39D98A', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}
          >
            Show nearby →
          </button>
        </ScopeNote>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={15} color="var(--color-muted)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your neighbourhood..."
          style={{ width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '11px 14px 11px 36px', color: 'var(--color-text)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Category strip */}
      <CategoryStrip value={categoryFilter} onChange={v => { setCategoryFilter(v); setActivityFilter('All'); }} />

      {/* Activity filter chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', marginLeft: '-16px', paddingLeft: '16px', marginRight: '-16px', paddingRight: '16px', paddingBottom: '4px', marginBottom: '20px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {ACTIVITY_FILTERS.map(f => (
          <button key={f} onClick={() => setActivityFilter(f)} style={{ flexShrink: 0, padding: '7px 16px', borderRadius: '20px', border: activityFilter === f ? 'none' : '1px solid var(--color-border)', background: activityFilter === f ? 'var(--color-accent)' : 'var(--color-surface)', color: activityFilter === f ? '#000' : 'var(--color-muted)', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Trending this week — scope-filtered */}
      {trendingResult.expanded && trendingResult.venues.length > 0 && (
        <ScopeNote>{expandNote(trendingResult as RailResult<Venue>)}</ScopeNote>
      )}
      <TrendingRail venues={trendingResult.venues} />

      {/* Happening tonight */}
      <HappeningTonight events={tonight} />

      {/* New in your neighbourhood — scope-filtered */}
      <NewPlacesSection
        venues={newPlacesResult.venues}
        expandedNote={expandNote(newPlacesResult as RailResult<Venue>)}
      />

      {/* Event rail */}
      {activityFilter === 'All' && !search && events.length > 0 && (
        <EventRail events={events} venues={venues} />
      )}

      {/* Venue cards with interleaved activity */}
      {loading ? (
        <div><VenueCardSkeleton /><VenueCardSkeleton /><VenueCardSkeleton /></div>
      ) : filteredVenues.length === 0 ? (
        isFiltered
          ? <EmptyState />
          : <LocalEmptyState scope={scope} areaLabel={areaLabel} onExpand={handleScopeChange} />
      ) : (
        <div>
          {filteredVenues.map((venue, i) => {
            const showActivity = ACTIVITY_AFTER.has(i) && activityIdx < activity.length;
            const moment = showActivity ? activity[activityIdx] : null;
            if (showActivity) activityIdx++;
            return (
              <div key={venue.id}>
                <VenueCard venue={venue} />
                {moment && <ActivityMoment key={moment.id} text={moment.text} time={moment.time} initial={moment.initial} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Most loved — scope-filtered */}
      {!loading && (
        <>
          {mostLovedResult.expanded && mostLovedResult.venues.length > 0 && (
            <ScopeNote>{expandNote(mostLovedResult as RailResult<Venue>)}</ScopeNote>
          )}
          <MostLovedRail
            venues={mostLovedResult.venues}
            city={mostLovedResult.expanded ? (city || areaLabel) : areaLabel}
          />
        </>
      )}

      {/* Neighbourhood Board teaser */}
      {boardPosts.length > 0 && <BoardTeaser posts={boardPosts} />}

      {/* Local Jobs teaser */}
      {boardJobs.length > 0 && <JobsTeaser jobs={boardJobs} />}

      <InstallBanner />

      {/* Neighbourhood gate — first run or manual area change */}
      {showAreaGate && (
        <NeighbourhoodGate onDone={() => setShowAreaGate(false)} />
      )}
    </div>
  );
}
