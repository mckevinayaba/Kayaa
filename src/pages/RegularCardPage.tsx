import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getVisitorCheckIns, type VisitorVenueCheckin } from '../lib/api';
import useLocation from '../hooks/useLocation';

const CATEGORY_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

const CATEGORY_COLOR: Record<string, string> = {
  Barbershop: '#39D98A', Shisanyama: '#F5A623', Tavern: '#60A5FA',
  Café: '#F59E0B', Church: '#A78BFA', Carwash: '#34D399',
  'Spaza Shop': '#60A5FA', Salon: '#F472B6', Tutoring: '#34D399',
  'Sports Ground': '#FB923C', 'Home Business': '#94A3B8',
};

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
}


export default function RegularCardPage() {
  const { name: rawName } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const visitorName = decodeURIComponent(rawName ?? '');
  const { suburb, city } = useLocation();
  const neighbourhood = suburb || city;

  const [checkins, setCheckins] = useState<VisitorVenueCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visitorName) { setLoading(false); return; }
    getVisitorCheckIns(visitorName).then(data => {
      setCheckins(data);
      setLoading(false);
    });
  }, [visitorName]);

  const totalVisits = checkins.reduce((sum, c) => sum + c.visitCount, 0);
  const memberSince = checkins.length > 0
    ? formatMemberSince(
        checkins.reduce((earliest, c) =>
          c.firstVisitAt < earliest ? c.firstVisitAt : earliest,
          checkins[0].firstVisitAt
        )
      )
    : null;

  const topPlace = checkins[0];
  const otherCount = checkins.length - 1;

  const shareText = topPlace
    ? `I'm a regular at ${topPlace.venueName}${otherCount > 0 ? ` and ${otherCount} other neighbourhood place${otherCount > 1 ? 's' : ''}` : ''} on Kayaa. Find local places near you — https://kayaa.co.za`
    : `I'm building my neighbourhood card on Kayaa. Find local places near you — https://kayaa.co.za`;

  const shareHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const initial = visitorName.trim()[0]?.toUpperCase() ?? '?';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          border: '2px solid rgba(57,217,138,0.3)', borderTopColor: '#39D98A',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', paddingBottom: '40px', maxWidth: '480px', margin: '0 auto' }}>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginBottom: '28px',
        }}
      >
        <ArrowLeft size={16} color="var(--color-text)" />
      </button>

      {/* Identity section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', textAlign: 'center' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(57,217,138,0.12)',
          border: '2.5px solid #39D98A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '32px',
          color: '#39D98A', marginBottom: '16px',
          boxShadow: '0 0 24px rgba(57,217,138,0.18)',
        }}>
          {initial}
        </div>

        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px',
          color: 'var(--color-text)', marginBottom: '4px', lineHeight: 1.2,
        }}>
          {visitorName}'s Regular Card
        </h1>

        <p style={{ fontSize: '13px', color: 'var(--color-accent)', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
          {neighbourhood} Regular
          {checkins.length > 0 && (
            <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
              {' '}· {checkins.length} place{checkins.length > 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      {/* Card body */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid rgba(57,217,138,0.2)',
        borderRadius: '20px',
        overflow: 'hidden',
        marginBottom: '16px',
      }}>

        {/* Places list */}
        {checkins.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📍</div>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.55 }}>
              No check-ins recorded yet for {visitorName}
            </p>
          </div>
        ) : (
          checkins.map((c, i) => {
            const emoji = CATEGORY_EMOJI[c.venueType] ?? '📍';
            const color = CATEGORY_COLOR[c.venueType] ?? '#39D98A';
            const isRegular = c.visitCount >= 5;

            return (
              <div
                key={c.venueId}
                onClick={() => navigate(`/venue/${c.venueSlug}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px',
                  borderBottom: i < checkins.length - 1 ? '1px solid var(--color-border)' : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                  background: `${color}18`, border: `1px solid ${color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {emoji}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
                    color: 'var(--color-text)', marginBottom: '2px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {c.venueName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                    {c.visitCount} visit{c.visitCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {isRegular && (
                  <span style={{
                    fontSize: '10px', fontWeight: 700, color: '#39D98A',
                    background: 'rgba(57,217,138,0.12)', padding: '3px 8px',
                    borderRadius: '20px', flexShrink: 0,
                  }}>
                    Regular
                  </span>
                )}
              </div>
            );
          })
        )}

        {/* Stats footer */}
        {checkins.length > 0 && (
          <div style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--color-border)',
            background: 'rgba(57,217,138,0.04)',
            display: 'flex', gap: '0', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>Total check-ins</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'Syne, sans-serif' }}>
                {totalVisits}
              </span>
            </div>
            {memberSince && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>Member since</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'Syne, sans-serif' }}>
                  {memberSince}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share button */}
      <a
        href={shareHref}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          background: '#39D98A', color: '#000',
          borderRadius: '14px', padding: '16px',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
          textDecoration: 'none', width: '100%', boxSizing: 'border-box',
        }}
      >
        <span>💬</span>
        Share my Regular Card
      </a>

      {/* Branding */}
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-muted)', marginTop: '16px', fontFamily: 'DM Sans, sans-serif' }}>
        Powered by{' '}
        <span style={{ color: '#39D98A', fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>kayaa</span>
      </p>
    </div>
  );
}
