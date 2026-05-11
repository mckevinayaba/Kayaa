import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, MapPin, PenSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import { haversineKm } from '../lib/geocode';
import { getAreaTier, tierScore } from '../lib/areaGroups';
import NeighbourhoodGate from '../components/NeighbourhoodGate';
import PostComposer from '../components/PostComposer';
import {
  getAllVenues, getAllEvents, getActiveStories,
  getTrendingPlaces, getHappeningTonight, getNewPlaces,
  getMostLovedPlaces, getGlobalActivity,
  getNeighbourhoodPosts,
  getHeadingThereCountsBatch, getVibeWinnersBatch,
  getActiveStoryVenuesBatch, getActiveVenueStory,
  getUserPostsForFeed, getSafetyAlerts,
  likePost, unlikePost, getUserLikedPosts,
} from '../lib/api';
import type { TrendingVenue, TonightEvent, ActivityItem, NeighbourhoodPost, VibeType, VenueStory24, UserPost } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { Venue, Event, Story } from '../types';
import VenueCard from '../components/VenueCard';
import StoryViewer from '../components/StoryViewer';
import ActivityMoment from '../components/ActivityMoment';
import EventRail from '../components/EventRail';
import StoriesStrip from '../components/StoriesStrip';
import TrendingRail from '../components/TrendingRail';
import HappeningTonight from '../components/HappeningTonight';
import MostLovedRail from '../components/MostLovedRail';
import CategoryStrip from '../components/CategoryStrip';
import PostBar from '../components/feed/PostBar';
import QuickAddPlace from '../components/QuickAddPlace';
import ActivityIndicator from '../components/feed/ActivityIndicator';
import { LoadSheddingWidget } from '../components/safety/LoadSheddingWidget';
import { StockChecker }    from '../components/utility/StockChecker';
import { QueueStatus }     from '../components/utility/QueueStatus';
import { WaterStatus }     from '../components/utility/WaterStatus';
import { EventsCalendar }  from '../components/utility/EventsCalendar';
import { QuickAsk }        from '../components/utility/QuickAsk';
import PushBanner          from '../components/PushBanner';
import { SafetyAlertOptIn } from '../components/SafetyAlertOptIn';
import { useCountry } from '../contexts/CountryContext';

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
type ActivityFilter = 'All' | 'Active today' | 'Events today';
type SortMode = 'for_you' | 'active_now' | 'trending' | 'most_loved' | 'new_places';

const LOCAL_THRESHOLD = 3; // min local venues before defaulting to nearby
// 'Active today' = ≥3 check-ins today (community-verified, never hardcoded)
const ACTIVITY_FILTERS: ActivityFilter[] = ['All', 'Active today', 'Events today'];

const SORT_MODES: { key: SortMode; label: string; tagline: string }[] = [
  { key: 'for_you',    label: '🎯 For You',    tagline: 'Places your neighbours actually rate' },
  { key: 'active_now', label: '⚡ Active Now',  tagline: 'Where people are right now' },
  { key: 'trending',   label: '🔥 Trending',   tagline: "What's getting popular" },
  { key: 'most_loved', label: '💛 Most Loved', tagline: 'Places with the most regulars' },
  { key: 'new_places', label: '🆕 New',        tagline: 'Just joined Kayaa' },
];

// Key → venue.category matcher (covers all country variants stored in DB)
const CAT_KEY_MATCH: Record<string, (cat: string) => boolean> = {
  barbershop: cat => /barb|kinyozi|coiff/i.test(cat),
  salon:      cat => /salon|nywele|beaut/i.test(cat),
  food:       cat => /shisan|choma|buka|bukat|lishe|chop|maquis/i.test(cat),
  tavern:     cat => /tavern|beer.?parlour|cabaret|drinking.?bar/i.test(cat),
  spaza:      cat => /spaza|duka|kiosk|provision|boutique|alimentation/i.test(cat),
  church:     cat => /church|kanisa|.?glise|chapel|faith|fellow/i.test(cat),
  carwash:    cat => /car.?wash|lavage/i.test(cat),
  cafe:       cat => /caf.?|coffee|boulang|eatery|bakery/i.test(cat),
  gym:        cat => /gym|fitness|salle.?de.?sport/i.test(cat),
  market:     cat => /market|soko|march.|tablier/i.test(cat),
  mechanic:   cat => /mechanic|garage|vulcan|m.?canicien/i.test(cat),
  other:      cat => !Object.entries(CAT_KEY_MATCH).filter(([k]) => k !== 'other').some(([, fn]) => fn(cat)),
};

const SCOPE_LABELS: Record<FeedScope, string> = {
  this_neighbourhood: 'My area',
  nearby: 'Nearby',
  city_wide: 'City-wide',
  explore_all: 'Explore',
};

// ─── Community Tools panel ────────────────────────────────────────────────────

type CommunityToolKey = 'queue' | 'events' | 'ask' | null;

const TOOL_ACCENT: Record<string, string> = {
  queue:  '#60A5FA',
  events: '#60A5FA',
  ask:    '#A78BFA',
};

const COMMUNITY_TOOLS: { key: string; emoji: string; title: string; sub: string }[][] = [
  // Single row — 3 tools (stock + water are now always-visible above)
  [
    { key: 'queue',  emoji: '⏱️', title: 'Queue Times',  sub: 'Live wait times'  },
    { key: 'events', emoji: '📅', title: 'Events',       sub: "What's happening" },
    { key: 'ask',    emoji: '❓', title: 'Quick Ask',    sub: 'Ask neighbours'   },
  ],
];

function CommunityTools({ areaLabel }: { areaLabel: string }) {
  const [open, setOpen] = useState<CommunityToolKey>(null);

  function toggle(key: string) {
    setOpen(prev => prev === key ? null : key as CommunityToolKey);
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Two-row grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: open ? '10px' : '0' }}>
        {COMMUNITY_TOOLS.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: '6px' }}>
            {row.map(t => {
              const active = open === t.key;
              const accent = TOOL_ACCENT[t.key] ?? '#39D98A';
              return (
                <button
                  key={t.key}
                  onClick={() => toggle(t.key)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    padding: '10px 10px', borderRadius: '12px', cursor: 'pointer',
                    background: active ? `${accent}12` : 'var(--color-surface)',
                    border: active ? `1px solid ${accent}40` : '1px solid var(--color-border)',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '16px', marginBottom: '3px' }}>{t.emoji}</span>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px', color: active ? accent : 'var(--color-text)', lineHeight: 1.2 }}>
                    {t.title}
                  </span>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'var(--color-muted)', marginTop: '1px' }}>
                    {t.sub}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Expanded panel */}
      {open === 'queue'  && <QueueStatus />}
      {open === 'events' && <EventsCalendar />}
      {open === 'ask'    && <QuickAsk neighbourhood={areaLabel} />}
    </div>
  );
}

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

// ─── Adjacency map — used for nearby fallback when local content is thin ─────

const ADJACENT_SUBURBS: Record<string, string[]> = {
  'Rosebank':      ['Parktown North', 'Parkwood', 'Dunkeld'],
  'Parktown North':['Rosebank', 'Parkwood', 'Craighall'],
  'Sandton':       ['Morningside', 'Illovo', 'Hyde Park', 'Bryanston'],
  'Honeydew':      ['Randburg', 'Northgate', 'Randpark Ridge'],
  'Randburg':      ['Honeydew', 'Ferndale', 'Northgate'],
  'Orlando West':  ['Orlando East', 'Pimville', 'Diepkloof'],
  'Soweto':        ['Orlando West', 'Pimville', 'Diepkloof', 'Meadowlands'],
  'Alexandra':     ['Wynberg', 'Sandton', 'Marlboro'],
  'Tembisa':       ['Ivory Park', 'Midrand'],
};

const NEARBY_THRESHOLD = 5; // expand if detected suburb has fewer than this many venues

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

// ─── Trust-weighted algorithm ─────────────────────────────────────────────────
//
//  trust_score = (0.4 × recency) + (0.3 × regularity) + (0.2 × velocity) + (0.1 × proximity)
//  Final score multiplied by time-of-day category weight.

function getTimeWeight(category: string): number {
  const h = new Date().getHours();
  const day = new Date().getDay(); // 0 = Sunday

  // Sunday morning: churches 3×
  if (day === 0 && h >= 9 && h < 13 && category === 'Church') return 3.0;

  if (h >= 6  && h < 11) return ({ Café: 2.0, Carwash: 1.5 }[category] ?? 1.0);
  if (h >= 11 && h < 14) return ({ Shisanyama: 2.0, 'Spaza Shop': 1.5 }[category] ?? 1.0);
  if (h >= 14 && h < 18) return ({ Salon: 1.8, Barbershop: 1.5, Tutoring: 1.3 }[category] ?? 1.0);
  if (h >= 18 && h < 23) return ({ Tavern: 2.0, Shisanyama: 1.8, 'Sports Ground': 1.4 }[category] ?? 1.0);
  return 1.0;
}

function calculateTrustScore(venue: Venue, userNeighbourhood: string): number {
  // Recency: based on last_checkin_at
  const hours = venue.lastCheckinAt
    ? (Date.now() - new Date(venue.lastCheckinAt).getTime()) / 3_600_000
    : 999;
  const recency = hours < 24 ? 1.0 : hours < 168 ? 0.7 : hours < 720 ? 0.4 : 0.2;

  // Regularity: regulars / total checkins ratio
  const ratio = venue.regularsCount / Math.max(venue.checkinCount, 1);
  const regularity = ratio > 0.6 ? 1.0 : ratio > 0.3 ? 0.7 : 0.4;

  // Velocity: this week vs last week growth
  const lastWeek = venue.checkinsLastWeek ?? 0;
  const growth = venue.checkinsThisWeek / Math.max(lastWeek, 1);
  const velocity = growth > 1.5 ? 1.0 : growth > 1.1 ? 0.8 : growth > 0.9 ? 0.6 : 0.4;

  // Proximity: same neighbourhood bonus
  const sameArea = (venue.neighborhood ?? '').toLowerCase() === (userNeighbourhood ?? '').toLowerCase();
  const proximity = sameArea ? 1.0 : 0.5;

  const base = (0.4 * recency) + (0.3 * regularity) + (0.2 * velocity) + (0.1 * proximity);
  return base * getTimeWeight(venue.category);
}

function getVelocityLabel(venue: Venue): string | null {
  const lastWeek = venue.checkinsLastWeek ?? 0;
  if (venue.checkinsThisWeek < 3) return null;
  const growth = venue.checkinsThisWeek / Math.max(lastWeek, 1);
  if (growth > 2.0) return '🔥 On fire';
  if (growth > 1.5) return '📈 Rising fast';
  if (growth > 1.1) return '⬆️ Trending';
  return null;
}

function getRecommendationReason(venue: Venue, userNeighbourhood: string): string | null {
  const lastWeek = venue.checkinsLastWeek ?? 0;
  const growth = venue.checkinsThisWeek / Math.max(lastWeek, 1);
  const loyaltyRatio = venue.regularsCount / Math.max(venue.checkinCount, 1);
  const isNew = new Date(venue.createdAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000;
  const isGem = venue.regularsCount >= 20 && loyaltyRatio > 0.5 && venue.checkinCount < 500;
  const isSameArea = (venue.neighborhood ?? '').toLowerCase() === (userNeighbourhood ?? '').toLowerCase();

  if (growth > 1.5 && venue.checkinsThisWeek >= 3) return '🔥 Trending in your area';
  if (venue.checkinsToday >= 3) return '⚡ Active today';
  if (venue.regularsCount > 200) return '💛 Community favourite';
  if (isSameArea) return '📍 In your neighbourhood';
  if (isNew) return '✨ New on Kayaa';
  if (isGem) return '💎 Hidden gem';
  return null;
}

function applySortMode(venues: Venue[], mode: SortMode, userNeighbourhood: string): Venue[] {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const twoHoursAgo   = now -  2 * 60 * 60 * 1000;

  switch (mode) {
    case 'active_now':
      return [...venues]
        .filter(v => v.lastCheckinAt && new Date(v.lastCheckinAt).getTime() > twoHoursAgo)
        .sort((a, b) => (b.checkinsToday ?? 0) - (a.checkinsToday ?? 0));

    case 'trending':
      return [...venues]
        .filter(v => (v.checkinsThisWeek ?? 0) >= 3)
        .sort((a, b) => {
          const aV = (a.checkinsThisWeek ?? 0) / Math.max(a.checkinsLastWeek ?? 0, 1);
          const bV = (b.checkinsThisWeek ?? 0) / Math.max(b.checkinsLastWeek ?? 0, 1);
          return bV - aV;
        });

    case 'most_loved':
      return [...venues].sort((a, b) => (b.regularsCount ?? 0) - (a.regularsCount ?? 0));

    case 'new_places':
      return [...venues]
        .filter(v => new Date(v.createdAt).getTime() > thirtyDaysAgo)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    case 'for_you':
    default:
      return [...venues].sort(
        (a, b) => calculateTrustScore(b, userNeighbourhood) - calculateTrustScore(a, userNeighbourhood)
      );
  }
}

function applyActivityFilter(venues: Venue[], filter: ActivityFilter, ids: Set<string>): Venue[] {
  switch (filter) {
    case 'Active today': return venues.filter(v => (v.checkinsToday ?? 0) >= 3);
    case 'Events today': return venues.filter(v => ids.has(v.id));
    default:             return venues;
  }
}

function applyCategoryFilter(venues: Venue[], cat: string, ids: Set<string>): Venue[] {
  if (cat === 'All') return venues;
  if (cat === 'events' || cat === 'Events') return venues.filter(v => ids.has(v.id));
  const matchFn = CAT_KEY_MATCH[cat];
  if (matchFn) return venues.filter(v => matchFn(v.category));
  return venues.filter(v => v.category === cat);
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

// ─── Sort selector ────────────────────────────────────────────────────────────

function SortSelector({ value, onChange }: { value: SortMode; onChange: (m: SortMode) => void }) {
  return (
    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px', marginBottom: '12px' } as React.CSSProperties}>
      {SORT_MODES.map(m => {
        const active = value === m.key;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
              background: active ? 'rgba(57,217,138,0.15)' : 'transparent',
              color: active ? '#39D98A' : 'rgba(255,255,255,0.45)',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {m.label}
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

function EmptyState({ neighbourhood, onCompose, onAddPlace }: {
  neighbourhood: string;
  onCompose: () => void;
  onAddPlace: () => void;
}) {
  function handleWhatsApp() {
    const msg = encodeURIComponent(
      `Hey! I'm building the neighbourhood feed for ${neighbourhood} on Kayaa — the app for places that matter locally. Come add places and posts 👉 https://kayaa.co.za`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  function handleShare() {
    const url = 'https://kayaa.co.za';
    const text = `Come join ${neighbourhood} on kayaa — the neighbourhood app for places that matter.`;
    if (navigator.share) {
      navigator.share({ title: `${neighbourhood} on kayaa`, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} ${url}`).then(() => {
        alert('Link copied — share it with your neighbours!');
      });
    }
  }

  return (
    <div style={{ padding: '8px 0 32px' }}>
      {/* Neighbourhood identity block */}
      <div style={{
        background: 'rgba(57,217,138,0.04)',
        border: '1px solid rgba(57,217,138,0.12)',
        borderRadius: '16px',
        padding: '24px 20px',
        marginBottom: '16px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📍</div>
        <h3 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '22px', color: '#F0F6FC',
          margin: '0 0 6px', lineHeight: 1.2,
        }}>
          {neighbourhood}
        </h3>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.4)', margin: '0 0 16px', lineHeight: 1.5,
        }}>
          No places listed here yet.{'\n'}Be the first to put {neighbourhood} on the map.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleShare}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#39D98A', color: '#0D1117',
              border: 'none', borderRadius: '10px',
              padding: '10px 20px', cursor: 'pointer',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
            }}
          >
            📲 Tell people about {neighbourhood}
          </button>
          <button
            onClick={handleWhatsApp}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(37,211,102,0.12)', color: '#25D366',
              border: '1px solid rgba(37,211,102,0.3)', borderRadius: '10px',
              padding: '10px 16px', cursor: 'pointer',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
            }}
          >
            WhatsApp neighbours →
          </button>
        </div>
      </div>

      {/* Action cards */}
      <p style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
        color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
        letterSpacing: '0.1em', margin: '16px 0 10px 2px',
      }}>
        What you can do right now
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          {
            emoji: '➕',
            title: 'Add a place',
            sub: 'The barber, spaza, salon — any place that matters here',
            action: onAddPlace,
            accent: '#39D98A',
          },
          {
            emoji: '📝',
            title: 'Post something',
            sub: 'Share what you know about this neighbourhood',
            action: onCompose,
            accent: '#60A5FA',
          },
        ].map(({ emoji, title, sub, action, accent }) => (
          <button
            key={title}
            onClick={action}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              background: '#161B22', border: `1px solid rgba(255,255,255,0.07)`,
              borderRadius: '14px', padding: '14px 16px', cursor: 'pointer',
              textAlign: 'left', width: '100%',
            }}
          >
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
              background: `${accent}12`, border: `1px solid ${accent}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
            }}>
              {emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '2px' }}>
                {title}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                {sub}
              </div>
            </div>
            <span style={{ color: accent, fontSize: '16px', flexShrink: 0 }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LocalEmptyState({ scope, areaLabel, onExpand, onAddPlace }: {
  scope: FeedScope;
  areaLabel: string;
  onExpand: (s: FeedScope) => void;
  onAddPlace: () => void;
}) {
  const nextScope: FeedScope = scope === 'this_neighbourhood' ? 'nearby'
    : scope === 'nearby' ? 'city_wide' : 'explore_all';
  const nextLabel = SCOPE_LABELS[nextScope];

  return (
    <div style={{ padding: '8px 0 24px' }}>
      {/* Neighbourhood name — always visible */}
      <div style={{
        background: 'rgba(57,217,138,0.04)',
        border: '1px solid rgba(57,217,138,0.12)',
        borderRadius: '16px', padding: '20px',
        marginBottom: '12px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '10px' }}>📍</div>
        <h3 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '20px', color: '#F0F6FC', margin: '0 0 6px',
        }}>
          {areaLabel}
        </h3>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.4)', margin: '0 0 14px', lineHeight: 1.5,
        }}>
          {scope === 'this_neighbourhood'
            ? 'No places added here yet. You could be the first.'
            : 'Nothing found at this range yet.'}
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onAddPlace}
            style={{
              background: '#39D98A', color: '#0D1117',
              border: 'none', borderRadius: '10px',
              padding: '9px 18px', cursor: 'pointer',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
            }}
          >
            Add a place →
          </button>
          {scope !== 'explore_all' && (
            <button
              onClick={() => onExpand(nextScope)}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                padding: '9px 18px', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px',
              }}
            >
              Show {nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Open Now section ─────────────────────────────────────────────────────────

const CAT_EMOJI_MAP: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
  'Live Music Venue': '🎵', 'Community Space': '🤝', Market: '🛒',
  Mechanic: '🔧', Gym: '💪', default: '📍',
};

// OpenNowSection removed — hardcoded status is inaccurate and damages trust.
// Community check-ins are the real signal. See "Active today" badge on VenueCard.

// ─── New This Week section ────────────────────────────────────────────────────

function NewThisWeekSection({ venues, areaLabel }: { venues: Venue[]; areaLabel: string }) {
  const navigate = useNavigate();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newVenues = venues
    .filter(v => new Date(v.createdAt).getTime() > sevenDaysAgo)
    .slice(0, 8);

  if (newVenues.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', margin: 0 }}>
          Just added in {areaLabel}
        </h2>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          this week
        </span>
      </div>
      <div style={{
        display: 'flex', gap: '10px',
        overflowX: 'auto', scrollbarWidth: 'none',
        marginLeft: '-16px', paddingLeft: '16px',
        marginRight: '-16px', paddingRight: '16px',
        paddingBottom: '4px', WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {newVenues.map(venue => {
          const emoji = CAT_EMOJI_MAP[venue.category] ?? CAT_EMOJI_MAP.default;
          return (
            <div
              key={venue.id}
              onClick={() => navigate(`/venue/${venue.slug}`)}
              style={{
                flexShrink: 0, width: '140px', cursor: 'pointer',
                background: '#161B22',
                border: '1px solid rgba(57,217,138,0.25)',
                borderRadius: '14px', padding: '12px 10px',
                position: 'relative',
              }}
            >
              {/* NEW badge */}
              <div style={{
                position: 'absolute', top: '8px', right: '8px',
                background: '#39D98A', color: '#0D1117',
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '9px', letterSpacing: '0.08em',
                padding: '2px 6px', borderRadius: '20px',
              }}>
                NEW
              </div>
              <div style={{ fontSize: '24px', marginBottom: '8px', lineHeight: 1 }}>{emoji}</div>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '12px', color: '#F0F6FC', marginBottom: '3px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                paddingRight: '8px',
              }}>
                {venue.name}
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {venue.category}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── New place in-app banner ──────────────────────────────────────────────────

function NewPlaceBanner({ venues, areaLabel }: { venues: Venue[]; areaLabel: string }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [shown, setShown] = useState<Venue | null>(null);

  useEffect(() => {
    if (venues.length === 0 || dismissed) return;
    const dismissKey = 'kayaa_new_place_banner_seen';
    const lastSeen = localStorage.getItem(dismissKey);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    // Find the most recently added venue (within last 24h)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const brand_new = venues
      .filter(v => new Date(v.createdAt).getTime() > oneDayAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!brand_new) return;
    // Don't show same banner more than once per hour
    if (lastSeen && parseInt(lastSeen) > oneHourAgo) return;

    // Show after a short delay so feed loads first
    const t = setTimeout(() => {
      setShown(brand_new);
      localStorage.setItem(dismissKey, String(Date.now()));
    }, 2500);
    return () => clearTimeout(t);
  }, [venues, dismissed]);

  if (!shown || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed', bottom: '72px', left: '12px', right: '12px',
        zIndex: 60,
        background: '#161B22',
        border: '1px solid rgba(57,217,138,0.35)',
        borderRadius: '14px', padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.3s ease',
      }}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        background: 'rgba(57,217,138,0.12)', border: '1px solid rgba(57,217,138,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
      }}>
        {CAT_EMOJI_MAP[shown.category] ?? '📍'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#39D98A', fontWeight: 700, marginBottom: '1px' }}>
          New place in {areaLabel}
        </div>
        <div
          style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
            color: '#F0F6FC', cursor: 'pointer',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
          onClick={() => { navigate(`/venue/${shown.slug}`); setDismissed(true); }}
        >
          {shown.name} →
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.3)', fontSize: '18px', lineHeight: 1,
          padding: '0', flexShrink: 0,
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── User Post Card ───────────────────────────────────────────────────────────

const POST_CAT: Record<string, { label: string; color: string; bg: string }> = {
  story:          { label: 'Story',          color: '#93C5FD', bg: 'rgba(96,165,250,0.12)'  },
  news:           { label: 'News',           color: '#FCD34D', bg: 'rgba(245,158,11,0.12)'  },
  alert:          { label: 'Alert',          color: '#FCA5A5', bg: 'rgba(239,68,68,0.12)'   },
  question:       { label: 'Question',       color: '#C4B5FD', bg: 'rgba(167,139,250,0.12)' },
  recommendation: { label: 'Tip',            color: '#6EE7B7', bg: 'rgba(57,217,138,0.12)'  },
  event:          { label: 'Event',          color: '#6EE7B7', bg: 'rgba(52,211,153,0.12)'  },
  spotted:        { label: 'Spotted',        color: '#C4B5FD', bg: 'rgba(139,92,246,0.12)'  },
};

function timeAgoFeed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

interface UserPostCardProps {
  post: UserPost;
  liked: boolean;
  onLike: (postId: string, currentlyLiked: boolean) => void;
}

function UserPostCard({ post, liked, onLike }: UserPostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [localLiked, setLocalLiked] = useState(liked);
  const [localCount, setLocalCount] = useState(post.likesCount);
  const cat = POST_CAT[post.category] ?? { label: post.category, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' };
  const authorName = post.userId ? 'Neighbour' : 'kayaa team';
  const authorInitials = initials(authorName);
  const isAlert = post.category === 'alert';
  const isLong = post.content.length > 240;

  // Sync if parent liked state changes (e.g. after data load)
  useEffect(() => { setLocalLiked(liked); }, [liked]);

  function handleLike() {
    const next = !localLiked;
    setLocalLiked(next);
    setLocalCount(c => next ? c + 1 : Math.max(0, c - 1));
    onLike(post.id, localLiked);
  }

  return (
    <div style={{
      background: '#161B22',
      border: `1px solid ${isAlert ? 'rgba(239,68,68,0.4)' : '#21262D'}`,
      borderLeft: isAlert ? '3px solid #EF4444' : undefined,
      borderRadius: '12px',
      padding: '14px 16px',
      marginBottom: '10px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        {/* Avatar */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
          background: 'rgba(57,217,138,0.12)', border: '1px solid rgba(57,217,138,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px', color: '#39D98A',
        }}>
          {authorInitials}
        </div>
        {/* Name + area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC' }}>
            {authorName}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)', margin: '0 4px', fontSize: '12px' }}>·</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
            {post.neighbourhood}
          </span>
        </div>
        {/* Category badge */}
        <span style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 700,
          color: cat.color, background: cat.bg, borderRadius: '20px', padding: '2px 9px',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {cat.label}
        </span>
        {/* Time */}
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          {timeAgoFeed(post.createdAt)}
        </span>
      </div>

      {/* Content */}
      <p style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(240,246,252,0.9)',
        lineHeight: 1.6, margin: 0,
        display: !expanded && isLong ? '-webkit-box' : undefined,
        WebkitLineClamp: !expanded && isLong ? 3 : undefined,
        WebkitBoxOrient: !expanded && isLong ? 'vertical' : undefined,
        overflow: !expanded && isLong ? 'hidden' : undefined,
      } as React.CSSProperties}>
        {post.content}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', color: '#39D98A', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '4px 0 0', fontFamily: 'DM Sans, sans-serif' }}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Image */}
      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post" loading="lazy" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginTop: '10px', border: '1px solid #21262D' }} />
      )}

      {/* Footer */}
      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={handleLike}
          style={{
            background: 'none', border: 'none',
            color: localLiked ? '#39D98A' : 'rgba(255,255,255,0.35)',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: 0, transition: 'color 0.15s',
          }}
        >
          <span style={{ fontSize: '15px' }}>{localLiked ? '👍' : '👍'}</span>
          <span style={{ fontWeight: localLiked ? 700 : 400 }}>{localCount > 0 ? localCount : ''}</span>
        </button>
        <button disabled style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'default',
          display: 'inline-flex', alignItems: 'center', gap: '5px', padding: 0,
        }}>
          💬 Reply
        </button>
      </div>
    </div>
  );
}

// ─── Safety Alert Banner ──────────────────────────────────────────────────────

function SafetyAlertBanner({ post }: { post: UserPost }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)',
      borderLeft: '3px solid #EF4444', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '16px', flexShrink: 0 }}>🚨</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: '#FCA5A5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Safety Alert</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{post.neighbourhood} · {timeAgoFeed(post.createdAt)}</span>
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(240,246,252,0.85)', lineHeight: 1.55, margin: 0 }}>
            {post.content}
          </p>
        </div>
      </div>
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    displaySuburb: suburb, displayCity: city,
    displayLat: _lat, displayLon: _lon,
    isDetecting, manualOverride,
    setManualOverride, clearManualOverride,
  } = useNeighbourhood();
  const userLat = _lat ?? undefined;
  const userLon = _lon ?? undefined;
  const needsConfirmation = !isDetecting && !suburb && !manualOverride;
  const { selectedCountry, categoryLabels } = useCountry();

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
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [safetyAlerts, setSafetyAlerts] = useState<UserPost[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [showComposer,    setShowComposer]    = useState(false);
  const [quickAddOpen,    setQuickAddOpen]    = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheDate, setCacheDate] = useState<string | null>(null);
  // Pagination
  const [visibleCount, setVisibleCount] = useState(20);
  // Pull-to-refresh
  const [pullDelta, setPullDelta] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const touchStartY  = useRef(0);
  const pullDeltaRef = useRef(0);
  const refreshingRef = useRef(false);
  const liveRegion   = useRef<HTMLDivElement>(null);

  // Interactivity data (Sprint 5)
  const [headingCounts, setHeadingCounts] = useState<Record<string, number>>({});
  const [vibeWinners, setVibeWinners] = useState<Record<string, { vibe: VibeType; count: number } | null>>({});
  const [activeStoryVenueIds, setActiveStoryVenueIds] = useState<Set<string>>(new Set());
  const [viewingStory, setViewingStory] = useState<{ story: VenueStory24; venueName: string; venueCategory: string } | null>(null);

  // UI filters
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const saved = localStorage.getItem('kayaa_feed_sort') as SortMode | null;
    return saved ?? 'for_you';
  });

  // Scope: starts at 'nearby' (safe default); set to smart default after data loads.
  // manualScope tracks whether the user explicitly picked a scope this session.
  const [scope, setScope] = useState<FeedScope>('nearby');
  const [manualScope, setManualScope] = useState<FeedScope | null>(null);

  // Show the area gate only after GPS has finished AND found nothing.
  // While GPS is running: never show (avoids flash for users whose GPS works).
  // After GPS completes with no suburb: show the manual picker.
  // Once any location resolves: hide automatically.
  const [showAreaGate, setShowAreaGate] = useState(false);

  useEffect(() => {
    // GPS done and no suburb or manual override → ask user to type
    if (!isDetecting && !suburb && !manualOverride) {
      setShowAreaGate(true);
    } else {
      setShowAreaGate(false);
    }
  }, [isDetecting, suburb, manualOverride]);

  const areaLabel = suburb || city || 'Your area';

  // "Not your neighbourhood?" banner — shown for 8 s after GPS resolves,
  // dismissed instantly on tap, or replaced by AreaSelector if user taps Change.
  const [gpsConfirmDismissed, setGpsConfirmDismissed] = useState(false);
  const [showGpsConfirm,      setShowGpsConfirm]      = useState(false);
  const [showAreaSearch,      setShowAreaSearch]       = useState(false);
  const [areaSearchQuery,     setAreaSearchQuery]      = useState('');

  // Fire the 8-second banner once GPS resolves a suburb (and not manual override)
  useEffect(() => {
    if (!isDetecting && suburb && !manualOverride && !gpsConfirmDismissed) {
      setShowGpsConfirm(true);
      const t = setTimeout(() => setShowGpsConfirm(false), 8000);
      return () => clearTimeout(t);
    }
  }, [isDetecting, suburb]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleConfirmGpsSuburb() {
    setShowGpsConfirm(false);
    setGpsConfirmDismissed(true);
  }

  function handleChangeArea() {
    setShowGpsConfirm(false);
    setGpsConfirmDismissed(true);
    setShowAreaSearch(true);
    setAreaSearchQuery('');
  }

  // Personal greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user
    ? ((user.user_metadata?.full_name || user.user_metadata?.name || '') as string)
        .split(' ')[0] || user.email?.split('@')[0] || ''
    : '';

  // Reset manual scope override when user changes area so smart default re-applies
  useEffect(() => {
    setManualScope(null);
  }, [areaLabel]);

  const countryChips = useMemo(() => [
    { key: 'All', label: 'All' },
    ...categoryLabels.map(c => ({ key: c.key, label: `${c.emoji} ${c.label}` })),
    { key: 'events', label: '📅 Events' },
  ], [categoryLabels]);

  // Online/offline detection
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    // Load from cache immediately when offline so screen isn't blank
    if (!navigator.onLine) {
      const cached = localStorage.getItem('kayaa_cached_venues');
      const ts     = localStorage.getItem('kayaa_venues_cached_at');
      if (cached) {
        try { setRawVenues(JSON.parse(cached)); setLoading(false); } catch { /* noop */ }
      }
      if (ts) setCacheDate(ts);
    }
  }, []);

  // Infinite scroll: load 20 more when user scrolls near the bottom
  useEffect(() => {
    function onScroll() {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
        setVisibleCount(c => c + 20);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Reset visible count whenever a filter or sort changes
  useEffect(() => {
    setVisibleCount(20);
  }, [sortMode, categoryFilter, activityFilter, search, scope]);

  // Pull-to-refresh: detect downward overscroll when already at the top
  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      touchStartY.current = e.touches[0].clientY;
    }
    function onTouchMove(e: TouchEvent) {
      if (window.scrollY > 8) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) {
        const clamped = Math.min(delta, 80);
        pullDeltaRef.current = clamped;
        setPullDelta(clamped);
      }
    }
    function onTouchEnd() {
      if (pullDeltaRef.current > 60 && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setRefreshKey(k => k + 1);
      }
      pullDeltaRef.current = 0;
      setPullDelta(0);
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });
    window.addEventListener('touchend',   onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, []); // refs carry state — empty dep array is intentional

  useEffect(() => {
    Promise.all([
      getAllVenues({ countryCode: selectedCountry.code, suburb: suburb || undefined, city: city || undefined }),
      getAllEvents(suburb || undefined, city || undefined),
      getActiveStories(undefined, suburb || undefined, city || undefined),
      getTrendingPlaces(suburb || undefined, city || undefined),
      getHappeningTonight(suburb || undefined, city || undefined),
      getNewPlaces(suburb || undefined, city || undefined),
      getMostLovedPlaces(suburb || undefined, city || undefined),
      getGlobalActivity(suburb || undefined, city || undefined),
      getNeighbourhoodPosts(suburb || city || ''),
      getUserPostsForFeed(suburb || city || ''),
      getSafetyAlerts(suburb || city || ''),
    ]).then(([v, e, s, tr, tn, np, ml, act, bp, up, sa]) => {
      const venues = v as Venue[];
      setRawVenues(venues);
      // Cache top 50 for offline use
      try {
        localStorage.setItem('kayaa_cached_venues', JSON.stringify(venues.slice(0, 50)));
        localStorage.setItem('kayaa_venues_cached_at', new Date().toISOString());
      } catch { /* storage full — noop */ }
      setEvents(e);
      setStories(s);
      setRawTrending(tr);
      setTonight(tn);
      setRawNewPlaces(np);
      setRawMostLoved(ml);
      setActivity(act);
      setBoardPosts((bp as NeighbourhoodPost[]).slice(0, 2));
      const posts = up as UserPost[];
      setUserPosts(posts);
      setSafetyAlerts(sa as UserPost[]);
      setLoading(false);
      setRefreshing(false);
      refreshingRef.current = false;

      // Load which posts the current user has liked
      if (user && posts.length > 0) {
        getUserLikedPosts(user.id, posts.map(p => p.id))
          .then(ids => setLikedPostIds(ids))
          .catch(() => {});
      }

      // Smart default scope: use this_neighbourhood only if enough local places exist.
      // Respect manual override if user already tapped a chip.
      if (!manualScope) {
        const localCount = venues
          .filter(isCleanVenue)
          .filter(u => venueInScope(u, 'this_neighbourhood', suburb, city, userLat, userLon))
          .length;
        setScope(localCount >= LOCAL_THRESHOLD ? 'this_neighbourhood' : 'nearby');
      }

      // Batch-load interactivity data for all venues
      const venueIds = venues.map(v => v.id);
      if (venueIds.length > 0) {
        Promise.all([
          getHeadingThereCountsBatch(venueIds),
          getVibeWinnersBatch(venueIds),
          getActiveStoryVenuesBatch(venueIds),
        ]).then(([hc, vw, as_]) => {
          setHeadingCounts(hc);
          setVibeWinners(vw);
          setActiveStoryVenueIds(as_);
        }).catch(() => {/* non-critical, fail silently */});
      }
    }).catch(() => { setRefreshing(false); refreshingRef.current = false; });
  }, [areaLabel, selectedCountry.code, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Nearby fallback — if the detected suburb has < NEARBY_THRESHOLD venues,
  // surface venues from adjacent suburbs with a "Nearby" label.
  const nearbyFallbackVenues = useMemo(() => {
    if (loading || manualOverride) return [];
    if (venues.length >= NEARBY_THRESHOLD) return [];
    const adjacent = ADJACENT_SUBURBS[suburb] ?? [];
    if (adjacent.length === 0) return [];
    return rawVenues
      .filter(isCleanVenue)
      .filter(v => adjacent.some(adj =>
        v.neighborhood?.toLowerCase() === adj.toLowerCase() ||
        v.city?.toLowerCase() === adj.toLowerCase()
      ))
      .slice(0, 12);
  }, [rawVenues, venues.length, suburb, manualOverride, loading]);

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

  // Pre-sorted list used for both rendering and count display
  const sortedVenues = useMemo(
    () => applySortMode(filteredVenues, sortMode, suburb),
    [filteredVenues, sortMode, suburb],
  );

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

  const activeCount = venues.filter(v => (v.checkinsToday ?? 0) >= 3).length;
  let activityIdx = 0;

  // Expand note for rails when auto-expanded beyond selected scope
  function expandNote(result: RailResult<Venue>): string | undefined {
    if (!result.expanded || !result.expandedScope) return undefined;
    if (result.expandedScope === 'nearby') return `None in ${suburb || areaLabel} — showing nearby areas`;
    return `None near ${areaLabel} — showing wider area`;
  }

  function handleLike(postId: string, currentlyLiked: boolean) {
    if (!user) return;
    if (currentlyLiked) {
      setLikedPostIds(prev => { const next = new Set(prev); next.delete(postId); return next; });
      unlikePost(postId, user.id).catch(() => {
        // rollback on failure
        setLikedPostIds(prev => new Set([...prev, postId]));
      });
    } else {
      setLikedPostIds(prev => new Set([...prev, postId]));
      likePost(postId, user.id).catch(() => {
        setLikedPostIds(prev => { const next = new Set(prev); next.delete(postId); return next; });
      });
    }
  }

  return (
    <div style={{ padding: '16px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>

      {/* Accessible live region — announces load/refresh state to screen readers */}
      <div ref={liveRegion} role="status" aria-live="polite" className="sr-only">
        {loading ? 'Loading places…' : refreshing ? 'Refreshing…' : `${filteredVenues.length} place${filteredVenues.length !== 1 ? 's' : ''} loaded`}
      </div>

      {/* Pull-to-refresh indicator */}
      {pullDelta > 10 && (
        <div style={{
          position: 'fixed', top: '56px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '20px', padding: '6px 14px',
          opacity: Math.min(pullDelta / 60, 1),
          pointerEvents: 'none',
        }}>
          <div style={{
            width: '14px', height: '14px', borderRadius: '50%',
            border: '2px solid rgba(57,217,138,0.35)', borderTopColor: '#39D98A',
            transform: `rotate(${Math.min(pullDelta * 4.5, 360)}deg)`,
          }} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)' }}>
            {pullDelta >= 60 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      )}

      {/* Subtle refreshing banner (shown after release until data returns) */}
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
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '12px', padding: '10px 14px', marginBottom: '14px',
        }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F59E0B' }}>
              You're offline
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', lineHeight: 1.4 }}>
              {cacheDate
                ? `Showing places saved ${new Date(cacheDate).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}. Some info may be outdated.`
                : 'No cached data available. Connect to the internet to load places.'}
            </div>
          </div>
        </div>
      )}

      {/* ── "Not your neighbourhood?" GPS confirmation banner ───────────── */}
      {showGpsConfirm && !manualOverride && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(57,217,138,0.07)',
          border: '1px solid rgba(57,217,138,0.2)',
          borderRadius: '12px', padding: '10px 14px', marginBottom: '12px',
        }}>
          <span style={{ fontSize: '15px', flexShrink: 0 }}>📍</span>
          <span style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
            color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 1.4,
          }}>
            Showing <strong style={{ color: '#F0F6FC' }}>{suburb}</strong> — not right?
          </span>
          <button
            onClick={handleChangeArea}
            style={{
              padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: '#39D98A', color: '#0D1117',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px',
              flexShrink: 0,
            }}
          >
            Change
          </button>
          <button
            onClick={handleConfirmGpsSuburb}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)', fontSize: '16px', padding: '0 2px', flexShrink: 0,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Area search input — shown when user taps Change in the GPS banner */}
      {showAreaSearch && (
        <div style={{
          background: '#161B22', border: '1px solid rgba(57,217,138,0.25)',
          borderRadius: '14px', padding: '14px 16px', marginBottom: '14px',
        }}>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
            color: '#F0F6FC', marginBottom: '10px',
          }}>
            Which suburb are you in?
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              autoFocus
              value={areaSearchQuery}
              onChange={e => setAreaSearchQuery(e.target.value)}
              placeholder="e.g. Rosebank, Soweto…"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#F0F6FC', fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
                outline: 'none',
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && areaSearchQuery.trim()) {
                  setManualOverride(areaSearchQuery.trim(), city);
                  setShowAreaSearch(false);
                  setRefreshKey(k => k + 1);
                }
                if (e.key === 'Escape') setShowAreaSearch(false);
              }}
            />
            <button
              onClick={() => {
                if (areaSearchQuery.trim()) {
                  setManualOverride(areaSearchQuery.trim(), city);
                  setShowAreaSearch(false);
                  setRefreshKey(k => k + 1);
                }
              }}
              style={{
                padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: '#39D98A', color: '#0D1117',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
              }}
            >
              Set
            </button>
          </div>
          <button
            onClick={() => setShowAreaSearch(false)}
            style={{
              marginTop: '8px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)',
              padding: 0,
            }}
          >
            Cancel — use my GPS location
          </button>
        </div>
      )}

      {/* ── Personal greeting + neighbourhood pulse ──────────────────────── */}
      {user && (
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '22px', color: '#F0F6FC',
            margin: '0 0 4px', lineHeight: 1.2,
          }}>
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
            color: 'rgba(255,255,255,0.4)', margin: '0 0 10px',
          }}>
            {(suburb && !needsConfirmation)
              ? `Here's what's happening in ${suburb}`
              : 'Set your area to see what\'s nearby'}
          </p>

          {/* Neighbourhood pulse — real aggregate stats */}
          {suburb && !needsConfirmation && !loading && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(() => {
                const totalCheckins = rawVenues.reduce((s, v) => s + (v.checkinsToday ?? 0), 0);
                const activePlaces  = rawVenues.filter(v => (v.checkinsToday ?? 0) >= 1).length;
                const totalPlaces   = rawVenues.length;
                const pills = [];

                if (totalPlaces > 0)
                  pills.push({ label: `${totalPlaces} place${totalPlaces !== 1 ? 's' : ''}`, emoji: '🏠', color: '#39D98A' });
                if (activePlaces > 0)
                  pills.push({ label: `${activePlaces} active today`, emoji: '⚡', color: '#F59E0B' });
                if (totalCheckins > 0)
                  pills.push({ label: `${totalCheckins} check-in${totalCheckins !== 1 ? 's' : ''}`, emoji: '📍', color: '#60A5FA' });

                if (pills.length === 0 && totalPlaces === 0)
                  pills.push({ label: 'No places yet — add one →', emoji: '➕', color: '#39D98A' });

                return pills.map(p => (
                  <button
                    key={p.label}
                    onClick={p.label.includes('add one') ? () => setQuickAddOpen(true) : undefined}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '4px 10px', borderRadius: '20px',
                      background: `${p.color}12`, border: `1px solid ${p.color}25`,
                      fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
                      color: p.color, cursor: p.label.includes('add one') ? 'pointer' : 'default',
                    }}
                  >
                    <span>{p.emoji}</span>{p.label}
                  </button>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {/* QuickAddPlace sheet */}
      {quickAddOpen && (
        <QuickAddPlace
          defaultSuburb={suburb}
          defaultCity={city}
          onAdded={() => { setTimeout(() => setRefreshKey(k => k + 1), 800); }}
          onClose={() => setQuickAddOpen(false)}
        />
      )}

      {/* Manual area indicator — shown when user is browsing a different area than GPS */}
      {manualOverride && suburb && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)',
          borderRadius: '10px', padding: '8px 12px', marginBottom: '12px',
        }}>
          <span style={{ fontSize: '13px' }}>🔍</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#93C5FD', flex: 1 }}>
            Browsing <strong>{manualOverride}</strong>
          </span>
          <button
            onClick={() => { clearManualOverride(); setRefreshKey(k => k + 1); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#60A5FA', padding: '0', flexShrink: 0 }}
          >
            Use GPS
          </button>
        </div>
      )}

      {/* Stories strip with "+" compose bubble */}
      <StoriesStrip stories={stories} onCompose={() => setShowComposer(true)} />

      {/* Post bar — single primary action + 3 compact secondary shortcuts */}
      <PostBar
        suburb={suburb || areaLabel}
        onPost={() => setShowComposer(true)}
        onAddPlace={() => setQuickAddOpen(true)}
      />

      {/* Push permission banner — only shows after neighbourhood is known */}
      <PushBanner />

      {/* Load shedding status */}
      <div style={{ marginBottom: '16px' }}>
        <LoadSheddingWidget compact />
      </div>

      {/* Water status — always visible, no tap needed */}
      <div style={{ marginBottom: '10px' }}>
        <WaterStatus area={areaLabel} />
      </div>

      {/* Stock checker — compact trigger, expands inline when tapped */}
      <div style={{ marginBottom: '16px' }}>
        <StockChecker area={areaLabel} compact />
      </div>

      {/* Community utility tools (queue, events, ask) */}
      <CommunityTools areaLabel={areaLabel} />

      {/* Safety alert opt-in — only shown when suburb is known */}
      {suburb && (
        <div style={{ marginBottom: '16px' }}>
          <SafetyAlertOptIn suburb={suburb} />
        </div>
      )}

      {/* Greeting + clickable area label */}
      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '2px' }}>{getGreeting()} 👋</p>
        <div
          onClick={() => setShowAreaGate(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '10px' }}
        >
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: 'var(--color-text)', lineHeight: 1.2, margin: 0 }}>
            {areaLabel}
          </h1>
          <MapPin size={15} color="rgba(255,255,255,0.3)" style={{ marginTop: '2px' }} />
        </div>
        {/* Neighbourhood pulse stat strip */}
        {!loading && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)', borderRadius: '20px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#39D98A' }}>🏪</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 700, color: '#39D98A' }}>{activeCount} active today</span>
            </div>
            {userPosts.length > 0 && (
              <div style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '20px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '11px' }}>💬</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 700, color: '#60A5FA' }}>{userPosts.length} post{userPosts.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            {activity.length > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '20px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '11px' }}>📍</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 700, color: '#F59E0B' }}>{activity.length} check-ins</span>
              </div>
            )}
          </div>
        )}
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
      <CategoryStrip value={categoryFilter} onChange={v => { setCategoryFilter(v); setActivityFilter('All'); }} chips={countryChips} />

      {/* Activity filter chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', marginLeft: '-16px', paddingLeft: '16px', marginRight: '-16px', paddingRight: '16px', paddingBottom: '4px', marginBottom: '12px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {ACTIVITY_FILTERS.map(f => (
          <button key={f} onClick={() => setActivityFilter(f)} style={{ flexShrink: 0, padding: '7px 16px', borderRadius: '20px', border: activityFilter === f ? 'none' : '1px solid var(--color-border)', background: activityFilter === f ? 'var(--color-accent)' : 'var(--color-surface)', color: activityFilter === f ? '#000' : 'var(--color-muted)', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Sort mode selector */}
      <SortSelector value={sortMode} onChange={mode => {
        setSortMode(mode);
        localStorage.setItem('kayaa_feed_sort', mode);
      }} />

      {/* New this week — places added in last 7 days */}
      {!loading && <NewThisWeekSection venues={venues} areaLabel={suburb || areaLabel} />}

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

      {/* Safety alerts — always at top */}
      {safetyAlerts.map(a => <SafetyAlertBanner key={a.id} post={a} />)}

      {/* ── Active Places Nearby ──────────────────────────────── */}
      {loading ? (
        <div>
          <div style={{ height: '20px', width: '40%', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', marginBottom: '14px' }} />
          <VenueCardSkeleton /><VenueCardSkeleton /><VenueCardSkeleton />
        </div>
      ) : filteredVenues.length === 0 ? (
        /* Empty state — only show harsh message if no posts either */
        isFiltered ? (
          <div style={{ textAlign: 'center', padding: '32px 0 16px' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</div>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '6px' }}>
              No {categoryFilter !== 'All' ? categoryFilter.toLowerCase() + 's' : 'places'} found
              {activityFilter !== 'All' ? ` that are ${activityFilter.toLowerCase()}` : ''} in {areaLabel}
            </p>
            {scope !== 'explore_all' && (
              <button
                onClick={() => handleScopeChange(scope === 'this_neighbourhood' ? 'nearby' : scope === 'nearby' ? 'city_wide' : 'explore_all')}
                style={{ background: 'none', border: '1px solid rgba(57,217,138,0.3)', color: '#39D98A', borderRadius: '10px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', marginTop: '8px' }}
              >
                Show {SCOPE_LABELS[scope === 'this_neighbourhood' ? 'nearby' : scope === 'nearby' ? 'city_wide' : 'explore_all']} →
              </button>
            )}
          </div>
        ) : userPosts.length > 0 ? (
          <LocalEmptyState scope={scope} areaLabel={areaLabel} onExpand={handleScopeChange} onAddPlace={() => setQuickAddOpen(true)} />
        ) : (
          <EmptyState neighbourhood={areaLabel} onCompose={() => setShowComposer(true)} onAddPlace={() => setQuickAddOpen(true)} />
        )
      ) : (
        <div>
          {/* Section header: sort label + tagline */}
          {(() => {
            const mode = SORT_MODES.find(m => m.key === sortMode)!;
            const activeNowCount = sortMode === 'active_now' ? sortedVenues.length : 0;
            return (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', margin: 0 }}>
                      {mode.label}
                    </h2>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--color-muted)' }}>
                      {sortMode === 'active_now' ? `${activeNowCount} active` : `${filteredVenues.length} place${filteredVenues.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
                    {mode.tagline}
                  </p>
                </div>

                {sortedVenues.length === 0 && sortMode === 'active_now' && (
                  <div style={{ textAlign: 'center', padding: '28px 0 12px' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚡</div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                      No check-ins in the last 2 hours nearby.
                    </p>
                    <button onClick={() => setSortMode('for_you')} style={{ marginTop: '10px', background: 'none', border: '1px solid rgba(57,217,138,0.25)', color: '#39D98A', borderRadius: '10px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                      Back to For You →
                    </button>
                  </div>
                )}

                {sortedVenues.slice(0, visibleCount).map((venue, i) => {
                  const showActivity = ACTIVITY_AFTER.has(i) && activityIdx < activity.length;
                  const moment = showActivity ? activity[activityIdx] : null;
                  if (showActivity) activityIdx++;
                  const hasActiveStory = activeStoryVenueIds.has(venue.id);
                  const velLabel = sortMode === 'trending' ? getVelocityLabel(venue) : null;
                  const reason   = getRecommendationReason(venue, suburb);
                  return (
                    <div key={venue.id}>
                      {velLabel && (
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: '#F97316', marginBottom: '4px', paddingLeft: '2px' }}>
                          {velLabel}
                        </div>
                      )}
                      <VenueCard
                        venue={venue}
                        headingCount={headingCounts[venue.id] ?? 0}
                        vibeWinner={vibeWinners[venue.id] ?? null}
                        hasActiveStory={hasActiveStory}
                        recommendationReason={reason ?? undefined}
                        onStoryTap={hasActiveStory ? () => {
                          getActiveVenueStory(venue.id).then(story => {
                            if (story) setViewingStory({ story, venueName: venue.name, venueCategory: venue.category });
                          }).catch(() => {});
                        } : undefined}
                      />
                      <ActivityIndicator
                        venueId={venue.id}
                        checkinsToday={venue.checkinsToday}
                        checkinsThisWeek={venue.checkinsThisWeek}
                        checkinsLastWeek={venue.checkinsLastWeek}
                        compact
                      />
                      {moment && <ActivityMoment key={moment.id} text={moment.text} time={moment.time} initial={moment.initial} />}
                    </div>
                  );
                })}

                {/* More to load — spinner triggers next batch via scroll listener */}
                {visibleCount < sortedVenues.length && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid rgba(57,217,138,0.25)', borderTopColor: '#39D98A', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                  </div>
                )}
                {/* End of feed */}
                {sortedVenues.length > 20 && visibleCount >= sortedVenues.length && (
                  <p style={{ textAlign: 'center', padding: '20px 0 8px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.22)', margin: 0 }}>
                    You've seen it all ✓
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Also nearby — shown when local content is thin ──── */}
      {!loading && nearbyFallbackVenues.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 14px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
              color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
              letterSpacing: '0.1em', whiteSpace: 'nowrap',
            }}>
              Also nearby
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Group by adjacent suburb */}
          {(() => {
            const groups: Record<string, typeof nearbyFallbackVenues> = {};
            for (const v of nearbyFallbackVenues) {
              const key = v.neighborhood || v.city || 'Nearby';
              if (!groups[key]) groups[key] = [];
              groups[key].push(v);
            }
            return Object.entries(groups).map(([adjSuburb, adjVenues]) => (
              <div key={adjSuburb} style={{ marginBottom: '16px' }}>
                <div style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 700,
                  fontSize: '13px', color: 'rgba(255,255,255,0.45)',
                  marginBottom: '10px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <span style={{ fontSize: '11px' }}>📍</span>
                  Also nearby in {adjSuburb}
                </div>
                {adjVenues.map(venue => (
                  <div key={venue.id} style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute', top: '12px', right: '12px', zIndex: 1,
                      background: 'rgba(96,165,250,0.15)',
                      border: '1px solid rgba(96,165,250,0.3)',
                      borderRadius: '6px', padding: '2px 7px',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 700,
                      fontSize: '10px', color: '#93C5FD', letterSpacing: '0.06em',
                    }}>
                      NEARBY
                    </div>
                    <VenueCard
                      venue={venue}
                      headingCount={headingCounts[venue.id] ?? 0}
                      vibeWinner={vibeWinners[venue.id] ?? null}
                      hasActiveStory={activeStoryVenueIds.has(venue.id)}
                      onStoryTap={async () => {
                        const story = await getActiveVenueStory(venue.id);
                        if (story) setViewingStory({ story, venueName: venue.name, venueCategory: venue.category });
                      }}
                      recommendationReason={getRecommendationReason(venue, suburb) ?? undefined}
                    />
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>
      )}

      {/* ── From the neighbourhood (community posts — current suburb only) ── */}
      {!loading && !isFiltered && suburb && (
        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 16px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
              {suburb}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {userPosts.length > 0 ? (
            <>
              {userPosts.slice(0, 5).map(p => (
                <UserPostCard key={p.id} post={p} liked={likedPostIds.has(p.id)} onLike={handleLike} />
              ))}
              {userPosts.length > 5 && (
                <button
                  onClick={() => setShowComposer(true)}
                  style={{ width: '100%', background: 'none', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer', marginBottom: '10px' }}
                >
                  + {userPosts.length - 5} more posts — share yours
                </button>
              )}
            </>
          ) : (
            /* Honest empty state — neighbourhood is known but no posts yet */
            <button
              onClick={() => setShowComposer(true)}
              style={{
                width: '100%', background: 'rgba(57,217,138,0.04)',
                border: '1px dashed rgba(57,217,138,0.2)', borderRadius: '14px',
                padding: '20px 16px', cursor: 'pointer', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              }}
            >
              <span style={{ fontSize: '22px' }}>✍️</span>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'rgba(57,217,138,0.8)' }}>
                No posts in {suburb} yet
              </span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                Be the first to start the {suburb} conversation
              </span>
            </button>
          )}
        </div>
      )}

      {/* ── Hidden Gems ──────────────────────────────────────── */}
      {!loading && !isFiltered && (() => {
        const gems = venues
          .filter(v => {
            const ratio = v.regularsCount / Math.max(v.checkinCount, 1);
            return (
              v.regularsCount >= 20 &&
              v.regularsCount <= 300 &&
              ratio > 0.5 &&
              (v.checkinsThisWeek ?? 0) >= 3 &&
              v.checkinCount < 800
            );
          })
          .sort((a, b) => {
            const ra = a.regularsCount / Math.max(a.checkinCount, 1);
            const rb = b.regularsCount / Math.max(b.checkinCount, 1);
            return rb - ra;
          })
          .slice(0, 6);

        if (gems.length === 0) return null;

        return (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--color-text)', margin: 0 }}>
                💎 Hidden Gems
              </h2>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                High loyalty · low noise
              </span>
            </div>
            <div style={{
              display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none',
              marginLeft: '-16px', paddingLeft: '16px',
              marginRight: '-16px', paddingRight: '16px',
              paddingBottom: '4px', WebkitOverflowScrolling: 'touch',
            } as React.CSSProperties}>
              {gems.map(venue => {
                const catEmoji: Record<string, string> = {
                  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
                  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
                  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
                };
                const catColor: Record<string, string> = {
                  Barbershop: '#39D98A', Shisanyama: '#F5A623', Tavern: '#60A5FA',
                  Café: '#F59E0B', Church: '#A78BFA', Carwash: '#34D399',
                  'Spaza Shop': '#60A5FA', Salon: '#F472B6', Tutoring: '#34D399',
                  'Sports Ground': '#FB923C', 'Home Business': '#94A3B8',
                };
                const emoji = catEmoji[venue.category] ?? '📍';
                const color = catColor[venue.category] ?? '#39D98A';
                const loyaltyPct = Math.round((venue.regularsCount / Math.max(venue.checkinCount, 1)) * 100);
                return (
                  <div
                    key={venue.id}
                    onClick={() => navigate(`/venue/${venue.slug}`)}
                    style={{
                      flexShrink: 0, width: '148px', cursor: 'pointer',
                      background: 'var(--color-surface)',
                      border: '1px solid rgba(167,139,250,0.2)',
                      borderRadius: '14px', padding: '12px',
                    }}
                  >
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: `${color}18`, border: `1px solid ${color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', marginBottom: '8px',
                    }}>
                      {emoji}
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px', color: 'var(--color-text)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {venue.name}
                    </div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {venue.neighborhood}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#A78BFA', background: 'rgba(167,139,250,0.12)', padding: '2px 7px', borderRadius: '20px', display: 'inline-block' }}>
                      {loyaltyPct}% loyal
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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

      {/* Jobs teaser removed — Jobs lives under Board categories */}

      <InstallBanner />

      {/* In-app banner: new place just joined neighbourhood */}
      {!loading && <NewPlaceBanner venues={venues} areaLabel={suburb || areaLabel} />}

      {/* Neighbourhood gate — first run or manual area change */}
      {showAreaGate && (
        <NeighbourhoodGate onDone={() => setShowAreaGate(false)} />
      )}

      {/* Story viewer — fullscreen overlay */}
      {viewingStory && (
        <StoryViewer
          story={viewingStory.story}
          venueName={viewingStory.venueName}
          venueCategory={viewingStory.venueCategory}
          onClose={() => setViewingStory(null)}
        />
      )}

      {/* Floating Post button — the ONE main post action in Home */}
      <button
        onClick={() => setShowComposer(true)}
        title="Post to your neighbourhood"
        style={{
          position: 'fixed', bottom: '80px', right: '16px', zIndex: 50,
          width: '52px', height: '52px', borderRadius: '50%',
          background: '#39D98A', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(57,217,138,0.45)',
          cursor: 'pointer', transition: 'transform 0.15s, filter 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.filter = '')}
      >
        <PenSquare size={22} color="#0D1117" />
      </button>

      {/* Post composer */}
      {showComposer && (
        <PostComposer
          neighbourhood={suburb || areaLabel}
          onClose={() => setShowComposer(false)}
          onPosted={post => setUserPosts(prev => [post, ...prev])}
        />
      )}
    </div>
  );
}
