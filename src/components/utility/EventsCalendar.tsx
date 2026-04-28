import { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Users, Clock, Plus, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getVisitorId } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  type: 'church' | 'sports' | 'community' | 'stokvels' | 'kids' | 'other';
  location: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
}

type DateFilter = 'today' | 'week' | 'all';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  church:    '⛪',
  sports:    '⚽',
  community: '🤝',
  stokvels:  '💰',
  kids:      '🧒',
  other:     '📅',
};

const FILTER_LABELS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today'     },
  { key: 'week',  label: 'This Week' },
  { key: 'all',   label: 'All'       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOf(day: Date): Date {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOf(day: Date): Date {
  const d = new Date(day);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const today     = startOf(new Date());
  const tomorrow  = startOf(new Date(Date.now() + 86_400_000));
  if (d >= today     && d <= endOf(today))    return 'Today';
  if (d >= tomorrow  && d <= endOf(tomorrow)) return 'Tomorrow';
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEvent(r: any): CommunityEvent {
  return {
    id:             r.id,
    title:          r.title,
    description:    r.description ?? null,
    type:           r.type        ?? 'other',
    location:       r.location,
    startTime:      r.start_time,
    endTime:        r.end_time,
    attendeesCount: r.attendees_count ?? 0,
  };
}

// ─── Create-event mini-form ───────────────────────────────────────────────────

function CreateEventForm({ onDone }: { onDone: () => void }) {
  const [title,    setTitle]    = useState('');
  const [location, setLocation] = useState('');
  const [date,     setDate]     = useState('');
  const [time,     setTime]     = useState('');
  const [saving,   setSaving]   = useState(false);

  async function submit() {
    if (!title.trim() || !location.trim() || !date || !time) return;
    setSaving(true);
    const startTime = new Date(`${date}T${time}`).toISOString();
    const endTime   = new Date(new Date(startTime).getTime() + 2 * 3600_000).toISOString();
    await supabase.from('community_events').insert({
      title:       title.trim(),
      location:    location.trim(),
      type:        'other',
      start_time:  startTime,
      end_time:    endTime,
      organizer_id: getVisitorId(),
    });
    setSaving(false);
    onDone();
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    background: '#0D1117', border: '1px solid #30363D',
    borderRadius: '8px', padding: '9px 12px',
    color: '#F0F6FC', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none',
  };

  return (
    <div style={{ marginTop: '12px', padding: '14px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '12px' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>
        Create a community event:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input placeholder="Event title" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
        <input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
        <button
          onClick={submit}
          disabled={saving || !title.trim() || !location.trim() || !date || !time}
          style={{
            padding: '9px', borderRadius: '8px', border: 'none',
            background: title && location && date && time ? '#60A5FA' : 'rgba(255,255,255,0.07)',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
            color: title && location && date && time ? '#000' : 'rgba(255,255,255,0.3)',
            cursor: title && location && date && time ? 'pointer' : 'default',
          }}
        >
          {saving ? 'Creating…' : 'Create Event'}
        </button>
      </div>
    </div>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: CommunityEvent }) {
  const visitorId = getVisitorId();
  const storageKey = `rsvp_${event.id}`;
  const [going,    setGoing]    = useState(() => sessionStorage.getItem(storageKey) === '1');
  const [count,    setCount]    = useState(event.attendeesCount);
  const [toggling, setToggling] = useState(false);

  async function toggleRsvp() {
    if (toggling) return;
    setToggling(true);

    if (going) {
      // Cancel RSVP
      await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', event.id)
        .eq('visitor_id', visitorId);
      sessionStorage.removeItem(storageKey);
      setGoing(false);
      setCount(c => Math.max(0, c - 1));
    } else {
      // Add RSVP
      await supabase.from('event_attendees').upsert(
        { event_id: event.id, visitor_id: visitorId },
        { onConflict: 'event_id,visitor_id' },
      );
      sessionStorage.setItem(storageKey, '1');
      setGoing(true);
      setCount(c => c + 1);
    }

    setToggling(false);
  }

  const emoji = TYPE_EMOJI[event.type] ?? '📅';

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: going ? '1px solid rgba(57,217,138,0.3)' : '1px solid var(--color-border)',
      borderRadius: '12px', padding: '13px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{
          width: '40px', height: '40px', flexShrink: 0, borderRadius: '10px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
        }}>
          {emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC', marginBottom: '2px' }}>
            {event.title}
          </div>
          {event.description && (
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
              {event.description.slice(0, 70)}{event.description.length > 70 ? '…' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={11} color="rgba(255,255,255,0.35)" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
            {formatEventDate(event.startTime)} · {formatTime(event.startTime)} – {formatTime(event.endTime)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <MapPin size={11} color="rgba(255,255,255,0.35)" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            {event.location}
          </span>
        </div>
      </div>

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Users size={11} color="rgba(255,255,255,0.35)" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            {count} {count === 1 ? 'attending' : 'attending'}
          </span>
        </div>
        <button
          onClick={toggleRsvp}
          disabled={toggling}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 12px', borderRadius: '20px', border: 'none',
            background: going ? 'rgba(57,217,138,0.15)' : 'rgba(255,255,255,0.07)',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
            color: going ? '#39D98A' : 'rgba(255,255,255,0.55)',
            cursor: toggling ? 'default' : 'pointer',
          }}
        >
          {going
            ? <><CheckCircle size={12} /> Going · Cancel</>
            : <>I'm attending</>}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EventsCalendar() {
  const [events,      setEvents]      = useState<CommunityEvent[]>([]);
  const [filter,      setFilter]      = useState<DateFilter>('today');
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const now   = new Date();
    const start = now.toISOString();

    let end: string | undefined;
    if (filter === 'today') {
      end = endOf(now).toISOString();
    } else if (filter === 'week') {
      const weekEnd = new Date(now.getTime() + 7 * 86_400_000);
      end = endOf(weekEnd).toISOString();
    }

    let query = supabase
      .from('community_events')
      .select('*')
      .gte('start_time', start)
      .order('start_time', { ascending: true })
      .limit(20);

    if (end) query = query.lte('start_time', end);

    const { data } = await query;
    setEvents((data ?? []).map(rowToEvent));
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filtered = events; // server-side filter already applied

  return (
    <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: '16px', padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px', color: '#F0F6FC', margin: '0 0 2px' }}>
            Community Events
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            What's happening near you
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowCreate(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '20px', border: 'none',
              background: showCreate ? 'rgba(96,165,250,0.2)' : 'rgba(96,165,250,0.1)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
              color: '#60A5FA', cursor: 'pointer',
            }}
          >
            <Plus size={12} />
            {showCreate ? 'Cancel' : 'Create'}
          </button>
          <div style={{
            width: '36px', height: '36px', borderRadius: '12px',
            background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Calendar size={17} color="#60A5FA" />
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {FILTER_LABELS.map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                flex: 1, padding: '7px 4px', borderRadius: '8px', border: 'none',
                background: active ? '#60A5FA' : 'rgba(255,255,255,0.05)',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px',
                color: active ? '#000' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateEventForm onDone={() => { setShowCreate(false); fetchEvents(); }} />
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1,2].map(i => (
            <div key={i} style={{ height: '100px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }} />
          ))}
        </div>
      )}

      {/* Events list */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(e => <EventCard key={e.id} event={e} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && !showCreate && (
        <div style={{ textAlign: 'center', padding: '24px 16px', background: '#0D1117', borderRadius: '12px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' }}>
            No events {filter === 'today' ? 'today' : filter === 'week' ? 'this week' : 'yet'}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginBottom: '12px' }}>
            Be the first to post something happening near you
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: '8px 20px', borderRadius: '20px', border: 'none',
              background: 'rgba(96,165,250,0.15)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px',
              color: '#60A5FA', cursor: 'pointer',
            }}
          >
            + Create Event
          </button>
        </div>
      )}
    </div>
  );
}
