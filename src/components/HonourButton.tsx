/**
 * HonourButton — "Honour this place ✨"
 *
 * Honour expresses that a place holds memory, trust, routine, and local meaning —
 * it is not a generic like or favourite. The button shows the live honour count
 * so users feel they are joining a community, not acting alone.
 *
 * UX:
 *   - Fetches current count on mount (graceful fallback to 0)
 *   - Optimistic update: taps immediately, persists in background
 *   - localStorage prevents double-honouring across sessions
 *   - After honouring: warm confirmation copy + count increments
 */

import { useState, useEffect } from 'react';
import { hasHonouredVenue, honourVenue, getVenueHonourCount, getSessionId } from '../lib/honour';

interface Props {
  venueId:   string;
  venueName: string;
}

export default function HonourButton({ venueId, venueName: _venueName }: Props) {
  const [honoured,    setHonoured]    = useState(false);
  const [count,       setCount]       = useState(0);
  const [countLoaded, setCountLoaded] = useState(false);
  const [showThanks,  setShowThanks]  = useState(false);

  useEffect(() => {
    setHonoured(hasHonouredVenue(venueId));
    getVenueHonourCount(venueId).then(n => {
      setCount(n);
      setCountLoaded(true);
    });
  }, [venueId]);

  async function handleHonour() {
    if (honoured) return;
    // Optimistic update
    setHonoured(true);
    setCount(c => c + 1);
    setShowThanks(true);
    setTimeout(() => setShowThanks(false), 4000);
    // Persist to Supabase in the background
    const sessionId = getSessionId();
    await honourVenue(venueId, sessionId);
  }

  const displayCount = countLoaded ? count : null;

  return (
    <div style={{ margin: '0 0 14px' }}>

      {/* Main button */}
      <button
        onClick={handleHonour}
        disabled={honoured}
        style={{
          width: '100%',
          padding: '15px 20px',
          borderRadius: '16px',
          border: `1px solid ${honoured ? 'rgba(245,158,11,0.4)' : 'rgba(245,158,11,0.22)'}`,
          background: honoured
            ? 'rgba(245,158,11,0.09)'
            : 'rgba(245,158,11,0.04)',
          cursor: honoured ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'all 0.2s',
          WebkitTapHighlightColor: 'transparent',
          boxShadow: honoured ? '0 0 24px rgba(245,158,11,0.08)' : 'none',
        } as React.CSSProperties}
      >
        {/* Animated star */}
        <span style={{
          fontSize: '22px',
          lineHeight: 1,
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          transform: honoured ? 'scale(1.25) rotate(-8deg)' : 'scale(1)',
          display: 'block',
          flexShrink: 0,
        }}>
          {honoured ? '🌟' : '✨'}
        </span>

        {/* Text block */}
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '14px',
            color: honoured ? '#F59E0B' : 'rgba(245,158,11,0.75)',
            marginBottom: '1px',
            transition: 'color 0.2s',
          }}>
            {honoured ? 'You honoured this place' : 'Honour this place'}
          </div>
          {displayCount !== null && displayCount > 0 && (
            <div style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: 'rgba(245,158,11,0.5)',
            }}>
              {honoured
                ? `You and ${displayCount - 1 > 0 ? `${displayCount - 1} other${displayCount - 1 !== 1 ? 's' : ''}` : 'no one else yet'} honoured this`
                : `${displayCount} local${displayCount !== 1 ? 's' : ''} already honoured this place`}
            </div>
          )}
          {displayCount === 0 && !honoured && (
            <div style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: 'rgba(245,158,11,0.4)',
            }}>
              Be the first to honour this place
            </div>
          )}
        </div>

        {/* Count pill */}
        {displayCount !== null && displayCount > 0 && (
          <div style={{
            flexShrink: 0,
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '20px',
            padding: '3px 10px',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 700,
            fontSize: '12px',
            color: '#F59E0B',
          }}>
            {displayCount}
          </div>
        )}
      </button>

      {/* Meaning line — always visible */}
      <p style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.28)',
        margin: '6px 4px 0',
        lineHeight: 1.5,
      }}>
        Locals honour places that hold memory, trust, and meaning — not just utility.
      </p>

      {/* Thank-you note — appears after honouring */}
      {showThanks && (
        <div style={{
          marginTop: '10px',
          padding: '12px 14px',
          borderRadius: '12px',
          background: 'rgba(245,158,11,0.07)',
          border: '1px solid rgba(245,158,11,0.18)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          color: '#F59E0B',
          lineHeight: 1.55,
          animation: 'fadeIn 0.3s ease',
        }}>
          🙏 Thank you — your honour keeps this place alive on Kayaa
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
