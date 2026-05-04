import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Check, X, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getVenueOwnerByUserId } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VenueEvent {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  price: number;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short',
  }) + ' · ' + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function isPast(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({
  event,
  onDelete,
}: {
  event: VenueEvent;
  onDelete: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const past = isPast(event.eventDate);

  return (
    <div style={{
      background: '#161B22', border: `1px solid ${past ? '#21262D' : 'rgba(244,114,182,0.2)'}`,
      borderRadius: '14px', padding: '14px', marginBottom: '10px',
      opacity: past ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Date block */}
        <div style={{
          width: '44px', flexShrink: 0, textAlign: 'center',
          background: past ? 'rgba(255,255,255,0.04)' : 'rgba(244,114,182,0.1)',
          border: `1px solid ${past ? '#21262D' : 'rgba(244,114,182,0.25)'}`,
          borderRadius: '10px', padding: '6px 4px',
        }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: past ? 'rgba(255,255,255,0.4)' : '#F472B6', lineHeight: 1 }}>
            {new Date(event.eventDate).getDate()}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
            {new Date(event.eventDate).toLocaleDateString('en-ZA', { month: 'short' })}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC' }}>
              {event.title}
            </span>
            {past && (
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', padding: '2px 6px' }}>
                Past
              </span>
            )}
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '11px',
              color: event.price === 0 ? '#39D98A' : '#FBBF24',
              background: event.price === 0 ? 'rgba(57,217,138,0.1)' : 'rgba(251,191,36,0.1)',
              borderRadius: '6px', padding: '2px 7px',
            }}>
              {event.price === 0 ? 'Free' : `R${event.price}`}
            </span>
          </div>

          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
            📅 {fmtEventDate(event.eventDate)}
          </div>

          {event.description && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '6px 0 0', lineHeight: 1.5 }}>
              {event.description}
            </p>
          )}
        </div>

        {/* Delete */}
        {confirm ? (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={() => onDelete(event.id)}
              style={{ background: '#EF4444', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Check size={14} color="#fff" />
            </button>
            <button
              onClick={() => setConfirm(false)}
              style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={14} color="rgba(255,255,255,0.5)" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            <Trash2 size={15} color="rgba(255,255,255,0.2)" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Create event form ────────────────────────────────────────────────────────

function CreateEventForm({
  onPost,
  onCancel,
}: {
  onPost: (data: { title: string; description: string; date: string; time: string; isFree: boolean; price: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [date,        setDate]        = useState('');
  const [time,        setTime]        = useState('18:00');
  const [isFree,      setIsFree]      = useState(true);
  const [price,       setPrice]       = useState('');
  const [posting,     setPosting]     = useState(false);

  // Default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    setDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const inputStyle = {
    width: '100%', background: '#0D1117', border: '1px solid #30363D',
    borderRadius: '10px', padding: '11px 12px',
    fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#F0F6FC',
    outline: 'none', boxSizing: 'border-box' as const,
  };

  const canPost = title.trim() && date && time;

  async function handlePost() {
    if (!canPost) return;
    setPosting(true);
    await onPost({
      title,
      description,
      date,
      time,
      isFree,
      price: isFree ? 0 : (parseFloat(price) || 0),
    });
    setPosting(false);
  }

  return (
    <div style={{
      background: '#161B22', border: '1px solid rgba(244,114,182,0.25)',
      borderRadius: '16px', padding: '16px', marginBottom: '16px',
    }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '14px' }}>
        New Event
      </div>

      {/* Title */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Event name *</div>
        <input
          type="text"
          placeholder="e.g. Saturday Night Braai, Gospel Service, Stokvel…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={80}
          style={inputStyle}
        />
      </div>

      {/* Date + Time */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Date *</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Time *</div>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Description (optional)</div>
        <textarea
          placeholder="What's happening? Who should come? Any special guests?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          maxLength={400}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
        />
      </div>

      {/* Pricing */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Admission</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: isFree ? 0 : '10px' }}>
          {[{ val: true, label: '🎟️ Free' }, { val: false, label: '💳 Paid' }].map(opt => (
            <button
              key={String(opt.val)}
              onClick={() => setIsFree(opt.val)}
              style={{
                flex: 1, padding: '9px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: isFree === opt.val ? 'rgba(57,217,138,0.12)' : 'rgba(255,255,255,0.04)',
                outline: isFree === opt.val ? '1px solid rgba(57,217,138,0.4)' : '1px solid transparent',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px',
                color: isFree === opt.val ? '#39D98A' : 'rgba(255,255,255,0.5)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {!isFree && (
          <input
            type="number"
            placeholder="Price in Rand (e.g. 50)"
            value={price}
            onChange={e => setPrice(e.target.value)}
            min="0"
            step="10"
            style={{ ...inputStyle, marginTop: '10px' }}
          />
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handlePost}
          disabled={!canPost || posting}
          style={{
            flex: 1, padding: '13px', borderRadius: '12px', border: 'none', cursor: canPost && !posting ? 'pointer' : 'default',
            background: canPost && !posting ? '#39D98A' : 'rgba(57,217,138,0.3)',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#000',
          }}
        >
          {posting ? 'Adding…' : 'Add Event'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '13px 16px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid #30363D', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: 'rgba(255,255,255,0.5)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '70px 16px 16px' }}>
      {[80, 80, 80].map((h, i) => (
        <div key={i} style={{ height: `${h}px`, background: 'rgba(255,255,255,0.04)', borderRadius: '14px', marginBottom: '10px' }} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenueEvents() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [venueId,   setVenueId]   = useState<string | null>(null);
  const [events,    setEvents]    = useState<VenueEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [showPast,  setShowPast]  = useState(false);
  const [added,     setAdded]     = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const ownership = await getVenueOwnerByUserId(user.id);
      if (!ownership) { setLoading(false); return; }
      setVenueId(ownership.venueId);
      await loadEvents(ownership.venueId);
      setLoading(false);
    })();
  }, [user]);

  async function loadEvents(vid: string) {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('venue_id', vid)
      .order('event_date', { ascending: false })
      .limit(50);

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setEvents(data.map((r: any) => ({
        id:          r.id,
        title:       r.title,
        description: r.description ?? null,
        eventDate:   r.event_date,
        price:       r.price ?? 0,
        createdAt:   r.created_at,
      })));
    }
  }

  async function handlePost(data: {
    title: string;
    description: string;
    date: string;
    time: string;
    isFree: boolean;
    price: number;
  }) {
    if (!venueId) return;
    const event_date = `${data.date}T${data.time}:00`;
    await supabase.from('events').insert({
      venue_id:    venueId,
      title:       data.title.trim(),
      description: data.description.trim() || null,
      event_date,
      price:       data.isFree ? 0 : data.price,
    });
    setShowForm(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
    await loadEvents(venueId);
  }

  async function handleDelete(id: string) {
    await supabase.from('events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  const upcoming = events.filter(e => !isPast(e.eventDate));
  const past     = events.filter(e => isPast(e.eventDate));

  if (loading) return <Skeleton />;

  return (
    <div style={{ paddingBottom: '100px' }}>

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.94)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #21262D',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.6)" />
        </button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: '#F0F6FC', margin: 0, flex: 1 }}>
          Events
        </h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '8px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: '#39D98A',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px', color: '#000',
            }}
          >
            <Plus size={14} /> New
          </button>
        )}
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── Success banner ─────────────────────────────────────────────── */}
        {added && (
          <div style={{
            marginBottom: '14px', padding: '12px 14px',
            background: 'rgba(57,217,138,0.08)', border: '1px solid rgba(57,217,138,0.25)',
            borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Check size={16} color="#39D98A" />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#39D98A' }}>
              Event added! It will appear on your venue page and in the community calendar.
            </span>
          </div>
        )}

        {/* ── No venue ─────────────────────────────────────────────────── */}
        {!venueId && (
          <div style={{ textAlign: 'center', padding: '60px 16px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
            No venue found. <a href="/onboarding" style={{ color: '#39D98A' }}>Add your place first.</a>
          </div>
        )}

        {/* ── Create form ────────────────────────────────────────────────── */}
        {showForm && venueId && (
          <CreateEventForm onPost={handlePost} onCancel={() => setShowForm(false)} />
        )}

        {/* ── Upcoming events ────────────────────────────────────────────── */}
        {venueId && (
          <>
            {upcoming.length === 0 && !showForm ? (
              <div style={{
                textAlign: 'center', padding: '48px 24px',
                background: '#161B22', border: '1px dashed #30363D',
                borderRadius: '16px', marginBottom: '16px',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F0F6FC', marginBottom: '6px' }}>
                  No upcoming events
                </div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: '260px', margin: '0 auto 20px' }}>
                  Add a braai, service, stokvel or gig — it appears in the community events calendar.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: '#39D98A',
                    fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#000',
                  }}
                >
                  <Plus size={16} />
                  Add Event
                </button>
              </div>
            ) : (
              upcoming.length > 0 && (
                <>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={12} />
                    {upcoming.length} upcoming event{upcoming.length !== 1 ? 's' : ''}
                  </div>
                  {upcoming.map(e => (
                    <EventCard key={e.id} event={e} onDelete={handleDelete} />
                  ))}
                </>
              )
            )}

            {/* Past events toggle */}
            {past.length > 0 && (
              <>
                <button
                  onClick={() => setShowPast(v => !v)}
                  style={{
                    width: '100%', padding: '10px', marginTop: '8px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid #21262D',
                    borderRadius: '10px', cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '12px',
                    color: 'rgba(255,255,255,0.35)',
                  }}
                >
                  {showPast ? '▲' : '▼'} {past.length} past event{past.length !== 1 ? 's' : ''}
                </button>
                {showPast && (
                  <div style={{ marginTop: '10px' }}>
                    {past.map(e => (
                      <EventCard key={e.id} event={e} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}
