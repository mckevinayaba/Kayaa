import { useState } from 'react';
import { X, Globe, Lock, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// ── Category emoji lookup ─────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

// ── Offline queue ─────────────────────────────────────────────────────────────

const QUEUE_KEY = 'kayaa_offline_checkins';

function pushOfflineQueue(entry: object) {
  try {
    const existing = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as object[];
    existing.push(entry);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
  } catch { /* storage full — ignore */ }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CheckInModalProps {
  venue: {
    id: string;
    name: string;
    slug: string;
    category: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CheckInModal({ venue, onClose, onSuccess }: CheckInModalProps) {
  const [note,     setNote]     = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [offline]               = useState(() => !navigator.onLine);

  const emoji = CAT_EMOJI[venue.category] ?? '📍';

  async function handleCheckIn() {
    setLoading(true);
    try {
      if (!navigator.onLine) {
        // Queue for later sync
        pushOfflineQueue({
          venueId:   venue.id,
          venueName: venue.name,
          venueSlug: venue.slug,
          note:      note || null,
          isPublic,
          queuedAt:  new Date().toISOString(),
        });
        setSuccess(true);
        setTimeout(onSuccess, 1600);
        return;
      }

      // Insert into check_ins (note + is_public are bonus columns; silently ignored if missing)
      const payload: Record<string, unknown> = {
        venue_id:     venue.id,
        is_ghost:     false,
        is_first_visit: false,
        visit_number: 1,
      };
      if (note.trim()) payload.note = note.trim();
      // is_public column may not exist yet — include defensively
      payload.is_public = isPublic;

      const { error } = await supabase.from('check_ins').insert(payload);

      if (error) {
        // Fallback: store offline so the check-in isn't lost
        pushOfflineQueue({ venueId: venue.id, venueName: venue.name, note: note || null, queuedAt: new Date().toISOString() });
      }

      setSuccess(true);
      setTimeout(onSuccess, 1600);
    } catch {
      // Network or unexpected error — queue offline
      pushOfflineQueue({ venueId: venue.id, venueName: venue.name, note: note || null, queuedAt: new Date().toISOString() });
      setSuccess(true);
      setTimeout(onSuccess, 1600);
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (success) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div style={{
          background: '#161B22', border: '1px solid rgba(57,217,138,0.25)',
          borderRadius: '20px', padding: '40px 32px', textAlign: 'center',
          width: '100%', maxWidth: '360px',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>{emoji}</div>
          <div style={{ fontSize: '28px', marginBottom: '12px' }}>✅</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', marginBottom: '8px' }}>
            Checked in!
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            You're at {venue.name}
          </p>
          {!navigator.onLine && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#F59E0B', marginTop: '8px' }}>
              📡 Will sync when you're back online
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Check-in form ─────────────────────────────────────────────────────────

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: '#161B22',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px 20px 0 0',
          overflow: 'hidden',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 16px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff', margin: 0 }}>
              {emoji} Check in at {venue.name}
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
              {venue.category}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} color="rgba(255,255,255,0.6)" />
          </button>
        </div>

        <div style={{ padding: '16px' }}>

          {/* Offline warning */}
          {offline && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: '10px', padding: '10px 12px', marginBottom: '14px',
            }}>
              <WifiOff size={14} color="#F59E0B" />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#F59E0B' }}>
                You're offline — check-in will sync when you reconnect
              </span>
            </div>
          )}

          {/* Note textarea */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block', fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px',
            }}>
              Add a note (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={`How's the vibe? What did you get?`}
              maxLength={280}
              rows={3}
              style={{
                width: '100%', background: '#0D1117',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                padding: '12px', color: '#fff',
                fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
                resize: 'none', outline: 'none', boxSizing: 'border-box',
                lineHeight: 1.55,
              }}
            />
            <div style={{ textAlign: 'right', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
              {note.length} / 280
            </div>
          </div>

          {/* Visibility toggle */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block', fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px',
            }}>
              Visibility
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([
                { val: true,  icon: <Globe size={14} />,  label: 'Public',  sub: 'Neighbours can see this' },
                { val: false, icon: <Lock  size={14} />,  label: 'Private', sub: 'Only you' },
              ] as const).map(({ val, icon, label, sub }) => (
                <button
                  key={String(val)}
                  onClick={() => setIsPublic(val)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '11px 12px', borderRadius: '12px',
                    background: isPublic === val ? 'rgba(57,217,138,0.1)' : 'rgba(255,255,255,0.04)',
                    border: isPublic === val ? '1px solid rgba(57,217,138,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ color: isPublic === val ? '#39D98A' : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                    {icon}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px', color: isPublic === val ? '#39D98A' : 'rgba(255,255,255,0.7)' }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>
                      {sub}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleCheckIn}
            disabled={loading}
            style={{
              width: '100%', background: loading ? 'rgba(57,217,138,0.5)' : '#39D98A',
              border: 'none', borderRadius: '14px', padding: '16px',
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '15px',
              color: '#000', cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.15s',
              marginBottom: '10px',
            }}
          >
            {offline
              ? <WifiOff size={16} color="#000" />
              : loading
                ? <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', animation: 'spin 0.7s linear infinite' }} />
                : null}
            {loading ? 'Checking in…' : `Check in at ${venue.name.split(' ')[0]}`}
          </button>

          {/* Alternative: full GPS flow */}
          <Link
            to={`/venue/${venue.slug}/checkin`}
            onClick={onClose}
            style={{
              display: 'block', textAlign: 'center',
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
              color: 'rgba(255,255,255,0.35)', textDecoration: 'none',
              padding: '4px 0 8px',
            }}
          >
            Use GPS-verified check-in instead →
          </Link>
        </div>
      </div>
    </div>
  );
}
