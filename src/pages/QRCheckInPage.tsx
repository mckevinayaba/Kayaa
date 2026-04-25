// ─── QRCheckInPage ────────────────────────────────────────────────────────────
//
// Route: /checkin/:venueId
//
// This is the landing page that QR codes point to.
// Encodes: kayaa.co.za/checkin/[venue_id]
//
// Users land here directly after scanning a QR code.
// Tapping the single CTA checks them in with method = 'qr_link'.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { getVenueById, saveVisit, getVisitorId } from '../lib/api';
import type { UserVenueScore } from '../lib/api';
import type { Venue } from '../types';
import CelebrationScreen from '../components/CelebrationScreen';

// ── Category maps ─────────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

const CAT_COLOR: Record<string, string> = {
  Barbershop: '#39D98A', Shisanyama: '#F5A623', Tavern: '#60A5FA',
  Café: '#F59E0B', Church: '#A78BFA', Carwash: '#34D399',
  'Spaza Shop': '#60A5FA', Salon: '#F472B6', Tutoring: '#34D399',
  'Sports Ground': '#FB923C', 'Home Business': '#94A3B8',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QRCheckInPage() {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();

  const [venue, setVenue]       = useState<Venue | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [score, setScore]       = useState<UserVenueScore | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [done, setDone]         = useState(false);

  const visitorId = getVisitorId();

  useEffect(() => {
    if (!venueId) return;
    getVenueById(venueId).then(v => {
      setVenue(v);
      setLoading(false);
    });
  }, [venueId]);

  async function handleCheckIn() {
    if (!venue) return;
    setSaving(true);
    const result = await saveVisit({
      venueId:   venue.id,
      venueName: venue.name,
      venueSlug: venue.slug,
      venueType: venue.category,
      visitorId,
      method:    'qr_link',
    });
    setSaving(false);
    setScore(result.score);
    if (result.alreadyCheckedIn) setDuplicate(true);
    else setDone(true);
  }

  // ── Celebration ──────────────────────────────────────────────────────────────

  if (done && venue && score) {
    return (
      <CelebrationScreen
        venue={venue}
        score={score}
        onDismiss={() => navigate(`/venue/${venue.slug}`)}
      />
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <style>{`@keyframes qrSpin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          border: '2px solid rgba(57,217,138,0.3)', borderTopColor: '#39D98A',
          animation: 'qrSpin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────────

  if (!venue) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh',
        padding: '32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', marginBottom: '8px' }}>
          Place not found
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px' }}>
          This QR code doesn't match any place on Kayaa.
        </p>
        <button
          onClick={() => navigate('/feed')}
          style={{
            background: 'none', border: 'none', color: 'var(--color-accent)',
            fontSize: '14px', cursor: 'pointer', fontWeight: 600,
          }}
        >
          ← Back to feed
        </button>
      </div>
    );
  }

  // ── Ready to check in ─────────────────────────────────────────────────────────

  const emoji = CAT_EMOJI[venue.category] ?? '📍';
  const color = CAT_COLOR[venue.category] ?? '#39D98A';

  return (
    <div style={{
      padding: '32px 20px 48px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '72vh', textAlign: 'center',
    }}>
      <style>{`@keyframes qrSpin { to { transform: rotate(360deg); } }`}</style>

      {/* Venue icon */}
      <div style={{
        width: '84px', height: '84px', borderRadius: '22px',
        background: `${color}18`, border: `2px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '40px', marginBottom: '20px',
        boxShadow: `0 0 32px ${color}20`,
      }}>
        {emoji}
      </div>

      {/* Venue name */}
      <h1 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px',
        color: 'var(--color-text)', marginBottom: '8px', lineHeight: 1.2,
      }}>
        {venue.name}
      </h1>

      {/* Category badge */}
      <span style={{
        fontSize: '12px', fontWeight: 600, color,
        background: `${color}18`, padding: '4px 12px',
        borderRadius: '20px', marginBottom: '10px', display: 'inline-block',
      }}>
        {venue.category}
      </span>

      {/* Location */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        color: 'var(--color-muted)', fontSize: '13px', marginBottom: '36px',
      }}>
        <MapPin size={12} />
        {venue.neighborhood}, {venue.city}
      </div>

      {/* Already checked in banner */}
      {duplicate && score && (
        <div style={{
          background: 'rgba(57,217,138,0.07)', border: '1px solid rgba(57,217,138,0.18)',
          borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', width: '100%', maxWidth: '300px',
        }}>
          <p style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
            color: '#fff', marginBottom: '4px',
          }}>
            Already checked in today ✓
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
            Visit #{score.visitCount} · {score.badgeTier} · Come back soon!
          </p>
        </div>
      )}

      {/* CTA */}
      {!duplicate && (
        <button
          onClick={handleCheckIn}
          disabled={saving}
          style={{
            width: '100%', maxWidth: '300px',
            background: saving ? 'rgba(57,217,138,0.6)' : 'var(--color-accent)',
            color: '#000', border: 'none', borderRadius: '16px',
            padding: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '17px',
            cursor: saving ? 'default' : 'pointer',
            marginBottom: '16px',
          }}
        >
          {saving ? (
            <>
              <span style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000',
                display: 'inline-block', animation: 'qrSpin 0.7s linear infinite',
              }} />
              Checking in…
            </>
          ) : (
            `Check In at ${venue.name.split("'")[0].trim()}`
          )}
        </button>
      )}

      {/* Soft link to venue page */}
      <button
        onClick={() => navigate(`/venue/${venue.slug}`)}
        style={{
          background: 'none', border: 'none',
          color: 'var(--color-muted)', fontSize: '13px', cursor: 'pointer',
        }}
      >
        View venue page →
      </button>
    </div>
  );
}
