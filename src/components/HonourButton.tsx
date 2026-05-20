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
  venueSlug: string;
}

export default function HonourButton({ venueId, venueName, venueSlug }: Props) {
  const [honoured,    setHonoured]    = useState(false);
  const [count,       setCount]       = useState(0);
  const [countLoaded, setCountLoaded] = useState(false);
  const [showThanks,  setShowThanks]  = useState(false);
  const [blooming,    setBlooming]    = useState(false);

  useEffect(() => {
    setHonoured(hasHonouredVenue(venueId));
    getVenueHonourCount(venueId).then(n => {
      setCount(n);
      setCountLoaded(true);
    });
  }, [venueId]);

  function handleHonourShare() {
    const text =
      `🌟 I just honoured ${venueName} on Kayaa — ` +
      `one of those local spots that deserves to be known. ` +
      `Have a look 👉 https://kayaa.africa/venue/${venueSlug}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  async function handleHonour() {
    if (honoured) return;
    // Trigger bloom animation
    setBlooming(true);
    setTimeout(() => setBlooming(false), 700);
    // Optimistic update
    setHonoured(true);
    setCount(c => c + 1);
    setShowThanks(true);
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
          border: `1px solid ${honoured ? 'rgba(245,158,11,0.38)' : 'rgba(245,158,11,0.18)'}`,
          background: honoured
            ? 'rgba(245,158,11,0.08)'
            : 'rgba(245,158,11,0.03)',
          cursor: honoured ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'border-color 0.3s, background 0.3s, box-shadow 0.3s',
          WebkitTapHighlightColor: 'transparent',
          boxShadow: honoured
            ? '0 0 28px rgba(245,158,11,0.1), inset 0 1px 0 rgba(245,158,11,0.08)'
            : 'none',
          position: 'relative',
          overflow: 'hidden',
        } as React.CSSProperties}
      >
        {/* Bloom rings — burst outward on tap */}
        {blooming && (
          <>
            <span style={{
              position: 'absolute', left: '28px', top: '50%',
              width: '40px', height: '40px', marginTop: '-20px',
              borderRadius: '50%',
              border: '2px solid rgba(245,158,11,0.6)',
              animation: 'kHonourRing 0.65s ease-out forwards',
              pointerEvents: 'none',
            }} />
            <span style={{
              position: 'absolute', left: '28px', top: '50%',
              width: '40px', height: '40px', marginTop: '-20px',
              borderRadius: '50%',
              border: '2px solid rgba(245,158,11,0.35)',
              animation: 'kHonourRing 0.65s 0.12s ease-out forwards',
              pointerEvents: 'none',
            }} />
            <span style={{
              position: 'absolute', left: '28px', top: '50%',
              width: '40px', height: '40px', marginTop: '-20px',
              borderRadius: '50%',
              border: '1px solid rgba(245,158,11,0.18)',
              animation: 'kHonourRing 0.65s 0.22s ease-out forwards',
              pointerEvents: 'none',
            }} />
          </>
        )}

        {/* Star — spring-animates on honour */}
        <span style={{
          fontSize: '22px',
          lineHeight: 1,
          animation: blooming ? 'kStarBurst 0.5s var(--ease-spring) forwards' : 'none',
          transform: honoured && !blooming ? 'scale(1.2) rotate(-8deg)' : 'scale(1)',
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'block',
          flexShrink: 0,
          position: 'relative', zIndex: 1,
        }}>
          {honoured ? '🌟' : '✨'}
        </span>

        {/* Text block */}
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{
            fontFamily: 'Inter, sans-serif',
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
              fontFamily: 'Inter, sans-serif',
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
              fontFamily: 'Inter, sans-serif',
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
            fontFamily: 'Inter, sans-serif',
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
        fontFamily: 'Inter, sans-serif',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.28)',
        margin: '6px 4px 0',
        lineHeight: 1.5,
      }}>
        Locals honour places that hold memory, trust, and meaning — not just utility.
      </p>

      {/* Post-honour panel — thanks + share moment */}
      {showThanks && (
        <div style={{
          marginTop: '10px',
          borderRadius: '14px',
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.18)',
          overflow: 'hidden',
          animation: 'fadeIn 0.3s ease',
        }}>
          {/* Thank-you line */}
          <div style={{
            padding: '12px 14px 10px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            color: '#F59E0B',
            lineHeight: 1.55,
          }}>
            🙏 Thank you — your honour keeps this place alive on Kayaa
          </div>

          {/* Share nudge */}
          <div style={{
            padding: '0 14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <p style={{
              margin: 0,
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              color: 'rgba(245,158,11,0.6)',
              lineHeight: 1.5,
            }}>
              Know someone who belongs here? Share it with them.
            </p>
            <button
              onClick={handleHonourShare}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#25D366',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              {/* WhatsApp icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#000">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '13px',
                color: '#000',
              }}>
                Share on WhatsApp
              </span>
            </button>
          </div>
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
