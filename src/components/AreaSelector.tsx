import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Search, ChevronRight, Plus, Navigation, Loader } from 'lucide-react';
import {
  searchCommunities, getFeaturedCommunities, groupByMetro,
  inferLocation, COMMUNITY_TYPE_LABEL,
  type Community,
} from '../lib/communities';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useGPSLocation } from '../hooks/useGPSLocation';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AreaSelectorProps {
  currentSuburb:     string;
  onSelect:          (suburb: string, city: string) => void;
  onClose:           () => void;
  /** Pre-detected suburb from LocationContext GPS (show confirm card at top) */
  suggestedSuburb?:  string;
  suggestedCity?:    string;
}

// ─── Community type badge ──────────────────────────────────────────────────────

const TYPE_COLOR: Record<Community['type'], string> = {
  cbd:                 'rgba(57,217,138,0.15)',
  precinct:            'rgba(167,139,250,0.15)',
  suburb:              'rgba(96,165,250,0.10)',
  township:            'rgba(245,158,11,0.12)',
  village:             'rgba(52,211,153,0.12)',
  informal_settlement: 'rgba(248,113,113,0.12)',
};
const TYPE_TEXT: Record<Community['type'], string> = {
  cbd:                 '#39D98A',
  precinct:            '#A78BFA',
  suburb:              '#60A5FA',
  township:            '#F59E0B',
  village:             '#34D399',
  informal_settlement: '#F87171',
};

function TypeBadge({ type }: { type: Community['type'] }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
      padding: '2px 7px', borderRadius: '10px',
      background: TYPE_COLOR[type], color: TYPE_TEXT[type],
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {COMMUNITY_TYPE_LABEL[type]}
    </span>
  );
}

// ─── GPS button + detected suburb panel ───────────────────────────────────────

function GPSPanel({
  suggestedSuburb,
  suggestedCity,
  onConfirm,
}: {
  suggestedSuburb?: string;
  suggestedCity?:   string;
  onConfirm: (suburb: string, city: string) => void;
}) {
  const gps = useGPSLocation();

  // If LocationContext already detected a suburb before the sheet opened,
  // show that as a suggestion without triggering GPS again.
  const effectiveSuburb = gps.state === 'success' ? gps.suburb : (suggestedSuburb ?? '');
  const effectiveCity   = gps.state === 'success' ? gps.city   : (suggestedCity   ?? '');

  // Success card (either from hook or from passed suggestion)
  if (effectiveSuburb && (gps.state === 'success' || (gps.state === 'idle' && suggestedSuburb))) {
    return (
      <div style={{
        background: 'rgba(57,217,138,0.07)',
        border: '1px solid rgba(57,217,138,0.25)',
        borderRadius: '12px',
        padding: '12px 14px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
            background: 'rgba(57,217,138,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Navigation size={14} color="#39D98A" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '1px' }}>
              Detected location
            </div>
            <div style={{
              fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#39D98A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {effectiveSuburb}
            </div>
          </div>
        </div>
        <button
          onClick={() => onConfirm(effectiveSuburb, effectiveCity)}
          style={{
            padding: '8px 16px', borderRadius: '20px', flexShrink: 0,
            background: '#39D98A', border: 'none',
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
            color: '#000', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          That's me
        </button>
      </div>
    );
  }

  // In-progress states
  if (gps.state === 'requesting' || gps.state === 'geocoding') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '11px 14px', borderRadius: '12px', marginBottom: '14px',
        background: 'rgba(57,217,138,0.05)', border: '1px solid rgba(57,217,138,0.15)',
        flexShrink: 0,
      }}>
        <Loader size={14} color="#39D98A" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
          {gps.state === 'requesting' ? 'Waiting for permission…' : 'Finding your suburb…'}
        </span>
      </div>
    );
  }

  // Error states
  if (gps.state === 'denied') {
    return (
      <div style={{
        padding: '10px 14px', borderRadius: '12px', marginBottom: '14px',
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
          <strong style={{ color: '#F59E0B' }}>Location access denied.</strong>{' '}
          To enable it: tap the lock icon in your browser's address bar → Allow Location.
          Or search for your suburb below.
        </div>
      </div>
    );
  }

  if (gps.state === 'inaccurate') {
    return (
      <div style={{
        padding: '10px 14px', borderRadius: '12px', marginBottom: '14px',
        background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.15)',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
          <strong style={{ color: '#60A5FA' }}>Can't detect suburb on this device.</strong>{' '}
          Desktop browsers use IP-based location which isn't accurate enough.
          Search for your suburb below — it takes 5 seconds.
        </div>
      </div>
    );
  }

  if (gps.state === 'failed' || gps.state === 'unavailable') {
    return (
      <button
        onClick={gps.trigger}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '11px 14px', borderRadius: '12px', cursor: 'pointer',
          background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)',
          marginBottom: '14px', flexShrink: 0, textAlign: 'left',
        }}
      >
        <Navigation size={14} color="rgba(255,255,255,0.3)" />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          Location detection failed — <span style={{ color: '#39D98A' }}>try again</span>
        </span>
      </button>
    );
  }

  // Idle — show the "Use my location" button
  return (
    <button
      onClick={gps.trigger}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
        padding: '11px 14px', borderRadius: '12px', cursor: 'pointer',
        background: 'rgba(57,217,138,0.05)',
        border: '1px solid rgba(57,217,138,0.2)',
        marginBottom: '14px', flexShrink: 0, textAlign: 'left',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(57,217,138,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(57,217,138,0.05)')}
    >
      <div style={{
        width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
        background: 'rgba(57,217,138,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Navigation size={14} color="#39D98A" />
      </div>
      <div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#F0F6FC' }}>
          Use my location
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
          Detect your suburb automatically
        </div>
      </div>
    </button>
  );
}

// ─── Request form ──────────────────────────────────────────────────────────────

function RequestForm({
  query,
  onSubmitted,
  onCancel,
}: {
  query: string;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const [name,     setName]     = useState(query);
  const [province, setProvince] = useState('');
  const [metro,    setMetro]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  useEffect(() => {
    const inferred = inferLocation(query);
    if (inferred.province) setProvince(inferred.province);
    if (inferred.metro)    setMetro(inferred.metro);
  }, [query]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSending(true);
    try {
      await supabase.from('community_requests').insert({
        community_name:    name.trim(),
        province:          province || null,
        metro_or_city:     metro    || null,
        community_type:    'suburb',
        status:            'requested',
        search_count:      1,
        requested_by_user: true,
        user_id:           user?.id ?? null,
        last_requested_at: new Date().toISOString(),
      });
    } catch {
      // Non-fatal
    } finally {
      setSending(false);
      setSent(true);
      setTimeout(onSubmitted, 1800);
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC', marginBottom: '6px' }}>
          Request sent
        </div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          We'll add <strong style={{ color: '#39D98A' }}>{name}</strong> when we expand to your area.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ paddingTop: '4px' }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '4px' }}>
        Request a community
      </div>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '14px', lineHeight: 1.5 }}>
        We'll review it and add it when we expand to your area. Missing-community searches help us prioritise.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Community name" required style={inputStyle} />
        <input type="text" value={province} onChange={e => setProvince(e.target.value)} placeholder="Province (optional)" style={inputStyle} />
        <input type="text" value={metro} onChange={e => setMetro(e.target.value)} placeholder="City / metro (optional)" style={inputStyle} />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="submit"
          disabled={sending || !name.trim()}
          style={{
            flex: 1, padding: '10px', borderRadius: '10px',
            background: sending ? 'rgba(57,217,138,0.5)' : '#39D98A',
            border: 'none', fontFamily: 'Inter, sans-serif', fontWeight: 700,
            fontSize: '13px', color: '#000', cursor: sending ? 'default' : 'pointer',
          }}
        >
          {sending ? 'Sending…' : 'Submit request'}
        </button>
        <button
          type="button" onClick={onCancel}
          style={{
            padding: '10px 16px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'Inter, sans-serif', fontSize: '13px',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
          }}
        >
          Back
        </button>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-bg)',
  border: '1px solid var(--color-border)', borderRadius: '10px',
  padding: '9px 12px', color: 'var(--color-text)',
  fontSize: '16px', fontFamily: 'Inter, sans-serif',
  outline: 'none', boxSizing: 'border-box',
};

// ─── Main component ────────────────────────────────────────────────────────────

export default function AreaSelector({
  currentSuburb,
  onSelect,
  onClose,
  suggestedSuburb,
  suggestedCity,
}: AreaSelectorProps) {
  const [query,       setQuery]       = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const results  = searchCommunities(query);
  const featured = getFeaturedCommunities();
  const grouped  = query.trim() ? groupByMetro(results) : [];
  const noResults = query.trim().length > 1 && results.length === 0;

  function pick(c: Community) {
    onSelect(c.name, c.metro);
    onClose();
  }

  function confirmDetected(suburb: string, city: string) {
    onSelect(suburb, city);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: 'var(--color-surface)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 44px',
        maxWidth: '560px', margin: '0 auto',
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
          <div>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '16px', color: '#F0F6FC' }}>
              {showRequest ? 'Request a community' : 'Choose your area'}
            </span>
            {currentSuburb && !showRequest && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                <MapPin size={11} color="#39D98A" />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#39D98A', fontWeight: 600 }}>
                  Currently: {currentSuburb}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={15} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* ── Request form (replaces everything when active) ───────────────── */}
        {showRequest ? (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <RequestForm
              query={query}
              onSubmitted={onClose}
              onCancel={() => setShowRequest(false)}
            />
          </div>
        ) : (
          <>
            {/* ── GPS Panel ───────────────────────────────────────────────── */}
            <GPSPanel
              suggestedSuburb={suggestedSuburb}
              suggestedCity={suggestedCity}
              onConfirm={confirmDetected}
            />

            {/* ── Divider ─────────────────────────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '14px', flexShrink: 0,
            }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
                or search
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            </div>

            {/* ── Search input ────────────────────────────────────────────── */}
            <div style={{ position: 'relative', marginBottom: '16px', flexShrink: 0 }}>
              <Search
                size={14} color="rgba(255,255,255,0.3)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search suburbs, townships, cities…"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                  padding: '11px 12px 11px 34px', color: '#F0F6FC',
                  fontSize: '14px', fontFamily: 'Inter, sans-serif',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={13} color="rgba(255,255,255,0.3)" />
                </button>
              )}
            </div>

            {/* ── Scrollable content ──────────────────────────────────────── */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '2px' }}>

              {/* No query: featured chips */}
              {!query.trim() && (
                <>
                  <div style={{
                    fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
                    color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em',
                    textTransform: 'uppercase', marginBottom: '12px',
                  }}>
                    Popular areas
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                    {featured.map(c => (
                      <button
                        key={c.slug}
                        onClick={() => pick(c)}
                        style={{
                          padding: '7px 14px', borderRadius: '20px', cursor: 'pointer',
                          background: c.name === currentSuburb ? 'rgba(57,217,138,0.12)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${c.name === currentSuburb ? 'rgba(57,217,138,0.35)' : 'rgba(255,255,255,0.08)'}`,
                          fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500,
                          color: c.name === currentSuburb ? '#39D98A' : 'rgba(255,255,255,0.75)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowRequest(true)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                      background: 'rgba(57,217,138,0.05)', border: '1px dashed rgba(57,217,138,0.2)',
                      textAlign: 'left',
                    }}
                  >
                    <Plus size={16} color="#39D98A" />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                      Can't find your community?{' '}
                      <span style={{ color: '#39D98A', fontWeight: 600 }}>Request it</span>
                    </span>
                  </button>
                </>
              )}

              {/* Grouped search results */}
              {query.trim() && !noResults && grouped.map(group => (
                <div key={group.metro} style={{ marginBottom: '18px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'baseline', gap: '6px',
                    marginBottom: '8px', paddingBottom: '6px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                      {group.metro}
                    </span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                      {group.province}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {group.communities.map(c => (
                      <button
                        key={c.slug}
                        onClick={() => pick(c)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                          background: c.name === currentSuburb ? 'rgba(57,217,138,0.08)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${c.name === currentSuburb ? 'rgba(57,217,138,0.2)' : 'transparent'}`,
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = c.name === currentSuburb ? 'rgba(57,217,138,0.08)' : 'rgba(255,255,255,0.02)')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <MapPin size={13} color={c.name === currentSuburb ? '#39D98A' : 'rgba(255,255,255,0.25)'} style={{ flexShrink: 0 }} />
                          <span style={{
                            fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500,
                            color: c.name === currentSuburb ? '#39D98A' : '#F0F6FC',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {c.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <TypeBadge type={c.type} />
                          <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* No results */}
              {noResults && (
                <div style={{ paddingTop: '8px' }}>
                  <div style={{
                    textAlign: 'center', padding: '20px 0 16px',
                    fontFamily: 'Inter, sans-serif', fontSize: '13px',
                    color: 'rgba(255,255,255,0.35)', lineHeight: 1.6,
                  }}>
                    No communities found for{' '}
                    <strong style={{ color: 'rgba(255,255,255,0.6)' }}>"{query}"</strong>
                  </div>

                  <div style={{
                    background: 'rgba(57,217,138,0.05)', border: '1px solid rgba(57,217,138,0.15)',
                    borderRadius: '14px', padding: '16px',
                  }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '4px' }}>
                      "{query}" isn't on Kayaa yet
                    </div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 14px', lineHeight: 1.55 }}>
                      Request it and we'll add it when we expand to your area. Every request helps us prioritise.
                    </p>
                    <button
                      onClick={() => setShowRequest(true)}
                      style={{
                        width: '100%', padding: '10px', borderRadius: '10px',
                        background: '#39D98A', border: 'none',
                        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px',
                        color: '#000', cursor: 'pointer',
                      }}
                    >
                      Request "{query}"
                    </button>
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </div>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
