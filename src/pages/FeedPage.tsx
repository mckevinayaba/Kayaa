import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { getAllVenues, getAllEvents, getActiveStories } from '../lib/api';
import type { Venue, Event, Story } from '../types';
import VenueCard from '../components/VenueCard';
import ActivityMoment from '../components/ActivityMoment';
import EventRail from '../components/EventRail';
import StoriesStrip from '../components/StoriesStrip';

// --- Helpers ---

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

type FilterKey = 'All' | 'Open now' | 'Busy now' | 'Events today';
const FILTERS: FilterKey[] = ['All', 'Open now', 'Busy now', 'Events today'];

function applyFilter(venues: Venue[], filter: FilterKey, venueIdsWithEvents: Set<string>): Venue[] {
  switch (filter) {
    case 'Open now':     return venues.filter(v => v.isOpen);
    case 'Busy now':     return venues.filter(v => v.checkinCount > 1000);
    case 'Events today': return venues.filter(v => venueIdsWithEvents.has(v.id));
    default:             return venues;
  }
}

const ACTIVITY_MOMENTS = [
  { id: 'a1', text: "Lerato just checked in at Uncle Dee's 💈", time: '2 min ago', initial: 'L' },
  { id: 'a2', text: "3 new regulars this week at Mama Zulu's 🔥", time: '18 min ago', initial: 'M' },
  { id: 'a3', text: 'Ayanda grabbed airtime at Sipho Corner at 10pm — still open 🏪', time: '1 hr ago', initial: 'A' },
];
const ACTIVITY_AFTER: Set<number> = new Set([0, 1, 2]);

// --- Skeleton ---

function VenueCardSkeleton() {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: '16px', padding: '16px', marginBottom: '12px',
    }}>
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

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '56px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.5 }}>🔍</div>
      <h3 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
        color: 'var(--color-text)', marginBottom: '8px',
      }}>
        No places found
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
        Try a different filter or check back later
      </p>
    </div>
  );
}

// --- PWA Install Banner ---

function InstallBanner() {
  const [show, setShow] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const deferredRef = useRef<Event | null>(null);

  useEffect(() => {
    // Capture the browser install prompt
    function onPrompt(e: Event) {
      e.preventDefault();
      deferredRef.current = e;
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true;
    if (isStandalone) return;

    const dismissed = localStorage.getItem('kayaa_install_dismissed');
    if (dismissed) return;

    const visits = parseInt(localStorage.getItem('kayaa_feed_visits') ?? '0') + 1;
    localStorage.setItem('kayaa_feed_visits', String(visits));

    if (visits >= 2) setShow(true);
  }, []);

  if (!show) return null;

  function handleAdd() {
    if (deferredRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (deferredRef.current as any).prompt?.();
      setShow(false);
    } else {
      setShowFallback(true);
    }
  }

  function handleDismiss() {
    localStorage.setItem('kayaa_install_dismissed', '1');
    setShow(false);
  }

  return (
    <div style={{
      position: 'fixed', bottom: '64px', left: 0, right: 0, zIndex: 40,
      background: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
          color: 'var(--color-text)', marginBottom: '2px',
        }}>
          Add Kayaa to your home screen
        </div>
        {showFallback ? (
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.4 }}>
            Tap the share button in your browser, then tap <strong>Add to Home Screen</strong>
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
            Open it like an app, any time.
          </div>
        )}
      </div>
      {!showFallback && (
        <button
          onClick={handleAdd}
          style={{
            background: 'var(--color-accent)', color: '#000', border: 'none',
            borderRadius: '10px', padding: '8px 18px',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          Add
        </button>
      )}
      <button
        onClick={handleDismiss}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-muted)', flexShrink: 0, padding: '4px',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

// --- Main page ---

export default function FeedPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([getAllVenues(), getAllEvents(), getActiveStories()]).then(([v, e, s]) => {
      setVenues(v);
      setEvents(e);
      setStories(s);
      setLoading(false);
    });
  }, []);

  const venueIdsWithEvents = useMemo(() => new Set(events.map(e => e.venueId)), [events]);

  const filteredVenues = useMemo(() => {
    let result = applyFilter(venues, filter, venueIdsWithEvents);
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
  }, [venues, filter, search, venueIdsWithEvents]);

  const openCount = venues.filter(v => v.isOpen).length;
  let activityIndex = 0;

  return (
    <div style={{ padding: '16px' }}>

      {/* Stories */}
      <StoriesStrip stories={stories} />

      {/* Greeting + neighbourhood label */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '2px' }}>
          {getGreeting()} 👋
        </p>
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px',
          color: 'var(--color-text)', marginBottom: '2px', lineHeight: 1.2,
        }}>
          Soweto
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-accent)', fontWeight: 600 }}>
          {loading ? 'Loading…' : `${openCount} places active now`}
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '14px' }}>
        <Search
          size={15}
          color="var(--color-muted)"
          style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your neighbourhood..."
          style={{
            width: '100%', background: 'var(--color-surface)',
            border: '1px solid var(--color-border)', borderRadius: '12px',
            padding: '11px 14px 11px 36px', color: 'var(--color-text)',
            fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none',
        marginLeft: '-16px', paddingLeft: '16px',
        marginRight: '-16px', paddingRight: '16px',
        paddingBottom: '4px', marginBottom: '20px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flexShrink: 0, padding: '7px 16px', borderRadius: '20px',
              border: filter === f ? 'none' : '1px solid var(--color-border)',
              background: filter === f ? 'var(--color-accent)' : 'var(--color-surface)',
              color: filter === f ? '#000' : 'var(--color-muted)',
              fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Event rail */}
      {filter === 'All' && !search && events.length > 0 && (
        <EventRail events={events} venues={venues} />
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div>
          <VenueCardSkeleton />
          <VenueCardSkeleton />
          <VenueCardSkeleton />
        </div>
      ) : filteredVenues.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {filteredVenues.map((venue, i) => {
            const showActivity = ACTIVITY_AFTER.has(i) && activityIndex < ACTIVITY_MOMENTS.length;
            const moment = showActivity ? ACTIVITY_MOMENTS[activityIndex] : null;
            if (showActivity) activityIndex++;

            return (
              <div key={venue.id}>
                <VenueCard venue={venue} />
                {moment && (
                  <ActivityMoment
                    key={moment.id}
                    text={moment.text}
                    time={moment.time}
                    initial={moment.initial}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <InstallBanner />
    </div>
  );
}
