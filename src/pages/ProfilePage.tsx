import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getUserCheckInHistoryLocal, getVisitorId, calcBadgeTier } from '../lib/api';

const BADGE_ICON: Record<string, string>  = { newcomer: '🌱', regular: '⭐', loyal: '🔥', legend: '👑' };
const BADGE_COLOR: Record<string, string> = { newcomer: '#34D399', regular: '#F5A623', loyal: '#F97316', legend: '#A855F7' };
const BADGE_LABEL: Record<string, string> = { newcomer: 'Newcomer', regular: 'Regular', loyal: 'Loyal', legend: 'Legend' };

const CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1)  return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)  return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default function ProfilePage() {
  const navigate  = useNavigate();
  const visitorId = getVisitorId();
  const history   = useMemo(() => getUserCheckInHistoryLocal(visitorId), [visitorId]);

  const totalVisits  = history.reduce((s, h) => s + h.visitCount, 0);
  const topBadgeTier = calcBadgeTier(totalVisits);
  const uniquePlaces = history.length;

  return (
    <div style={{ padding: '20px 16px 20px', minHeight: '100vh' }}>

      {/* Hero card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(57,217,138,0.12) 0%, rgba(57,217,138,0.04) 100%)',
        border: '1px solid rgba(57,217,138,0.2)',
        borderRadius: '20px', padding: '24px 20px',
        textAlign: 'center', marginBottom: '24px',
      }}>
        {/* Badge icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 14px',
          background: `${BADGE_COLOR[topBadgeTier]}18`,
          border: `2px solid ${BADGE_COLOR[topBadgeTier]}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '36px',
        }}>
          {BADGE_ICON[topBadgeTier]}
        </div>

        <div style={{
          display: 'inline-block', background: `${BADGE_COLOR[topBadgeTier]}20`,
          border: `1px solid ${BADGE_COLOR[topBadgeTier]}40`,
          borderRadius: '20px', padding: '4px 14px',
          fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 700,
          color: BADGE_COLOR[topBadgeTier], marginBottom: '12px',
        }}>
          {BADGE_LABEL[topBadgeTier]}
        </div>

        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', margin: '0 0 4px' }}>
          Your Kayaa Profile
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Anonymous · ID …{visitorId.slice(-6)}
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '20px' }}>
          {[
            { label: 'Check-ins', value: totalVisits },
            { label: 'Places', value: uniquePlaces },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: '#39D98A' }}>
                {value}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Check-in history */}
      {history.length > 0 ? (
        <>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '12px' }}>
            Your places
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map(item => {
              const tier  = item.badgeTier;
              const emoji = CAT_EMOJI[item.venueType] ?? '📍';
              return (
                <div
                  key={item.venueId}
                  onClick={() => navigate(`/venue/${item.venueSlug}`)}
                  style={{
                    background: '#161B22', border: '1px solid #21262D',
                    borderRadius: '14px', padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {/* Emoji avatar */}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: 'rgba(57,217,138,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', flexShrink: 0,
                  }}>
                    {emoji}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.venueName}
                    </div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                      {item.visitCount} visit{item.visitCount !== 1 ? 's' : ''} · {timeAgo(item.lastVisit)}
                    </div>
                  </div>

                  {/* Badge */}
                  <span style={{
                    fontSize: '16px', flexShrink: 0,
                    filter: `drop-shadow(0 0 4px ${BADGE_COLOR[tier]}88)`,
                  }}>
                    {BADGE_ICON[tier]}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📍</div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '8px' }}>
            No check-ins yet
          </h3>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: '20px' }}>
            Start checking into places in your neighbourhood to build your profile.
          </p>
          <Link
            to="/feed"
            style={{
              display: 'inline-block', background: '#39D98A', color: '#000',
              textDecoration: 'none', borderRadius: '12px', padding: '12px 24px',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
            }}
          >
            Explore places →
          </Link>
        </div>
      )}
    </div>
  );
}
