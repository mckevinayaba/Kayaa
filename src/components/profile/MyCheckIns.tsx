import { useNavigate } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CheckInHistoryItem {
  venueId:   string;
  venueName: string;
  venueSlug: string;
  venueType: string;
  visitCount: number;
  lastVisit:  string;
  badgeTier:  string;
}

interface MyCheckInsProps {
  history: CheckInHistoryItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

const BADGE_ICON: Record<string, string>  = { newcomer: '🌱', regular: '⭐', loyal: '🔥', legend: '👑' };
const BADGE_COLOR: Record<string, string> = { newcomer: '#34D399', regular: '#F5A623', loyal: '#F97316', legend: '#A855F7' };

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1)  return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)  return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MyCheckIns({ history }: MyCheckInsProps) {
  const navigate = useNavigate();

  if (history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📍</div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '8px' }}>
          No check-ins yet
        </h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: '20px' }}>
          Start exploring places in your neighbourhood to build your history.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {history.map(item => {
        const emoji = CAT_EMOJI[item.venueType] ?? '📍';
        const tier  = item.badgeTier;
        return (
          <div
            key={item.venueId}
            onClick={() => navigate(`/venue/${item.venueSlug}`)}
            style={{
              background: '#161B22', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px', padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: '14px',
              cursor: 'pointer',
            }}
          >
            {/* Emoji avatar */}
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: 'rgba(57,217,138,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
            }}>
              {emoji}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {item.venueName}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                {item.visitCount} visit{item.visitCount !== 1 ? 's' : ''} · {timeAgo(item.lastVisit)}
              </div>
            </div>

            {/* Badge */}
            <span style={{
              fontSize: '18px', flexShrink: 0,
              filter: `drop-shadow(0 0 4px ${BADGE_COLOR[tier]}80)`,
            }}>
              {BADGE_ICON[tier]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
