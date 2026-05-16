/**
 * HonourButton — "Honour this place ✨"
 *
 * One-tap appreciation for a venue. Optimistic UI: taps immediately,
 * persists to Supabase in the background. localStorage prevents double-honouring.
 */

import { useState, useEffect } from 'react';
import { hasHonouredVenue, honourVenue, getSessionId } from '../lib/honour';

interface Props {
  venueId: string;
  venueName: string;
}

export default function HonourButton({ venueId, venueName: _venueName }: Props) {
  const [honoured,   setHonoured]   = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  useEffect(() => {
    setHonoured(hasHonouredVenue(venueId));
  }, [venueId]);

  async function handleHonour() {
    if (honoured) return;
    // Optimistic update
    setHonoured(true);
    setShowThanks(true);
    setTimeout(() => setShowThanks(false), 3000);
    // Persist
    const sessionId = getSessionId();
    await honourVenue(venueId, sessionId);
  }

  return (
    <div style={{ margin: '8px 0 16px' }}>
      <button
        onClick={handleHonour}
        disabled={honoured}
        style={{
          width: '100%',
          padding: '13px 20px',
          borderRadius: '14px',
          border: `1px solid ${honoured ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.25)'}`,
          background: honoured
            ? 'rgba(245,158,11,0.08)'
            : 'rgba(245,158,11,0.05)',
          cursor: honoured ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.2s',
          WebkitTapHighlightColor: 'transparent',
        } as React.CSSProperties}
      >
        <span style={{ fontSize: '20px', lineHeight: 1 }}>
          {honoured ? '🌟' : '✨'}
        </span>
        <span style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 700,
          fontSize: '14px',
          color: honoured ? '#F59E0B' : 'rgba(245,158,11,0.7)',
          transition: 'color 0.2s',
        }}>
          {honoured ? 'You honoured this place' : 'Honour this place'}
        </span>
      </button>

      {/* Thank-you note */}
      {showThanks && (
        <div style={{
          marginTop: '8px',
          padding: '10px 14px',
          borderRadius: '10px',
          background: 'rgba(245,158,11,0.07)',
          border: '1px solid rgba(245,158,11,0.15)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          color: '#F59E0B',
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          Thank you — your honour keeps this place alive on Kayaa 🙏
        </div>
      )}
    </div>
  );
}
