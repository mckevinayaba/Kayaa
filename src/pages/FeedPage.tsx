import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { mockVenues, mockEvents } from '../lib/mockData';
import type { Venue } from '../types';
import VenueCard from '../components/VenueCard';
import ActivityMoment from '../components/ActivityMoment';
import EventRail from '../components/EventRail';

// --- Helpers ---

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

type FilterKey = 'All' | 'Open now' | 'Busy now' | 'Events today';

const FILTERS: FilterKey[] = ['All', 'Open now', 'Busy now', 'Events today'];

const venueIdsWithEvents = new Set(mockEvents.map(e => e.venueId));

function applyFilter(venues: Venue[], filter: FilterKey): Venue[] {
  switch (filter) {
    case 'Open now':    return venues.filter(v => v.isOpen);
    case 'Busy now':    return venues.filter(v => v.checkinCount > 1000);
    case 'Events today': return venues.filter(v => venueIdsWithEvents.has(v.id));
    default:            return venues;
  }
}

// Static activity moments keyed by venue slot index (into filtered list)
const ACTIVITY_MOMENTS = [
  { id: 'a1', text: "Lerato just checked in at Uncle Dee's 💈", time: '2 min ago', initial: 'L' },
  { id: 'a2', text: "3 new regulars this week at Mama Zulu's 🔥", time: '18 min ago', initial: 'M' },
  { id: 'a3', text: 'Ayanda grabbed airtime at Sipho Corner at 10pm — still open 🏪', time: '1 hr ago', initial: 'A' },
];

// Insert an activity moment after these 0-based venue indices
const ACTIVITY_AFTER: Set<number> = new Set([0, 1, 2]);

// --- Empty state ---

function EmptyState() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '56px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '40px',
        marginBottom: '16px',
        opacity: 0.5,
      }}>
        🔍
      </div>
      <h3 style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 700,
        fontSize: '16px',
        color: 'var(--color-text)',
        marginBottom: '8px',
      }}>
        No places found
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
        Try a different filter or check back later
      </p>
    </div>
  );
}

// --- Main page ---

export default function FeedPage() {
  const [filter, setFilter] = useState<FilterKey>('All');
  const [search, setSearch] = useState('');

  const filteredVenues = useMemo(() => {
    let venues = applyFilter(mockVenues, filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      venues = venues.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.neighborhood.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q)
      );
    }
    return venues;
  }, [filter, search]);

  const openCount = mockVenues.filter(v => v.isOpen).length;
  let activityIndex = 0;

  return (
    <div style={{ padding: '16px' }}>

      {/* Greeting + neighbourhood label */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '2px' }}>
          {getGreeting()} 👋
        </p>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: '22px',
          color: 'var(--color-text)',
          marginBottom: '2px',
          lineHeight: 1.2,
        }}>
          Soweto
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-accent)', fontWeight: 600 }}>
          {openCount} places active now
        </p>
      </div>

      {/* Search */}
      <div style={{
        position: 'relative',
        marginBottom: '14px',
      }}>
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
            width: '100%',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '11px 14px 11px 36px',
            color: 'var(--color-text)',
            fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        marginLeft: '-16px',
        paddingLeft: '16px',
        marginRight: '-16px',
        paddingRight: '16px',
        paddingBottom: '4px',
        marginBottom: '20px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flexShrink: 0,
              padding: '7px 16px',
              borderRadius: '20px',
              border: filter === f ? 'none' : '1px solid var(--color-border)',
              background: filter === f ? 'var(--color-accent)' : 'var(--color-surface)',
              color: filter === f ? '#000' : 'var(--color-muted)',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Event rail — only on All filter, no search active */}
      {filter === 'All' && !search && (
        <EventRail events={mockEvents} venues={mockVenues} />
      )}

      {/* Main feed */}
      {filteredVenues.length === 0 ? (
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
    </div>
  );
}
