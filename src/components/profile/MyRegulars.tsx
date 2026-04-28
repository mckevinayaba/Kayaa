import { useNavigate } from 'react-router-dom';
import type { CheckInHistoryItem } from './MyCheckIns';

// A "regular" = you've visited a place 3+ times

interface MyRegularsProps {
  history: CheckInHistoryItem[];
}

const CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

const TIER_COLOR = ['#A855F7', '#F97316', '#F5A623', '#39D98A'];

export function MyRegulars({ history }: MyRegularsProps) {
  const navigate = useNavigate();
  const regulars = history
    .filter(h => h.visitCount >= 3)
    .sort((a, b) => b.visitCount - a.visitCount);

  if (regulars.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>❤️</div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '8px' }}>
          No regulars yet
        </h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          Visit a place 3 or more times to become a regular.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {regulars.map((item, i) => {
        const emoji = CAT_EMOJI[item.venueType] ?? '📍';
        const color = TIER_COLOR[Math.min(i, TIER_COLOR.length - 1)];

        return (
          <div
            key={item.venueId}
            onClick={() => navigate(`/venue/${item.venueSlug}`)}
            style={{
              background: '#161B22', border: `1px solid ${color}25`,
              borderRadius: '14px', padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: '14px',
              cursor: 'pointer',
            }}
          >
            {/* Rank circle */}
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: `${color}18`, border: `1.5px solid ${color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '14px', color,
            }}>
              {i + 1}
            </div>

            {/* Emoji */}
            <div style={{ fontSize: '22px', flexShrink: 0 }}>{emoji}</div>

            {/* Name + visit count */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {item.venueName}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color, marginTop: '2px', fontWeight: 600 }}>
                {item.visitCount} visits — you're a regular here
              </div>
            </div>

            <span style={{ fontSize: '18px', flexShrink: 0 }}>❤️</span>
          </div>
        );
      })}
    </div>
  );
}
