import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { getVenueBySlug, createCheckIn, getVisitNumber } from '../lib/api';
import type { Venue } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatus(venue: Venue): { label: string; color: string } {
  if (!venue.isOpen) return { label: 'Closed', color: '#6B7280' };
  if (venue.checkinCount > 1000) return { label: 'Busy now', color: '#F5A623' };
  return { label: 'Open now', color: '#39D98A' };
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: '46px', height: '26px', borderRadius: '13px', flexShrink: 0,
        background: checked ? 'var(--color-accent)' : 'var(--color-surface2)',
        border: `1px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`,
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: '4px',
        left: checked ? '23px' : '4px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: checked ? '#000' : '#6B7280',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

// ─── 404 ─────────────────────────────────────────────────────────────────────

function VenueNotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', padding: '32px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', marginBottom: '8px' }}>
        Place not found
      </h2>
      <Link to="/feed" style={{ color: 'var(--color-accent)', fontSize: '14px', textDecoration: 'none' }}>
        ← Back to feed
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Step = 'loading-venue' | 'form' | 'submitting' | 'success';

export default function CheckInPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [venueLoading, setVenueLoading] = useState(true);

  const [step, setStep] = useState<Step>('loading-venue');
  const [name, setName] = useState('');
  const [isRegular, setIsRegular] = useState(true);
  const [ghostMode, setGhostMode] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [visitNumber, setVisitNumber] = useState(1);

  useEffect(() => {
    if (!slug) return;
    getVenueBySlug(slug).then(v => {
      setVenue(v);
      setVenueLoading(false);
      setStep(v ? 'form' : 'form');
    });
  }, [slug]);

  if (venueLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          border: '2px solid rgba(57,217,138,0.3)', borderTopColor: 'var(--color-accent)',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!venue) return <VenueNotFound />;

  const emoji = CATEGORY_EMOJI[venue.category] ?? '📍';
  const color = CATEGORY_COLOR[venue.category] ?? '#39D98A';
  const status = getStatus(venue);

  async function handleSubmit() {
    if (!name.trim() && !ghostMode) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setStep('submitting');

    let vn = 1;
    if (!ghostMode && name.trim() && venue) {
      vn = await getVisitNumber(venue.id, name.trim());
    }
    setVisitNumber(vn);

    if (venue) {
      const { error } = await createCheckIn({
        venue_id: venue.id,
        visitor_name: ghostMode ? undefined : name.trim() || undefined,
        is_ghost: ghostMode,
        is_first_visit: !isRegular,
        visit_number: vn,
      });
      if (error) console.error('Check-in error:', error);
    }

    setStep('success');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--color-surface)',
    border: `1px solid ${nameError ? '#F87171' : 'var(--color-border)'}`,
    borderRadius: '14px',
    padding: '16px',
    color: 'var(--color-text)',
    fontSize: '16px',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: '56px',
  };

  // ── Success screen ──────────────────────────────────────────────────────────

  if (step === 'success') {
    const displayName = name.trim().split(' ')[0];
    const isGhost = ghostMode;
    const MILESTONES = new Set([1, 5, 10, 25, 50]);
    const isMilestone = !isGhost && MILESTONES.has(visitNumber);

    function getMilestoneMessage(): string {
      switch (visitNumber) {
        case 1:  return `Welcome to ${venue!.name}. You're part of the neighbourhood.`;
        case 5:  return `5 visits. You're officially a regular at ${venue!.name}.`;
        case 10: return `Visit 10. ${venue!.name} knows your name.`;
        case 25: return `25 visits. You're one of ${venue!.name}'s most loyal regulars.`;
        case 50: return `50 visits. Legend status at ${venue!.name}.`;
        default: return `Visit ${visitNumber} at ${venue!.name}. Good to have you back.`;
      }
    }

    const waText = encodeURIComponent(
      `I just hit visit ${visitNumber} at ${venue!.name} on Kayaa! Check them out — https://kayaa.co.za/${slug}`
    );

    return (
      <>
        <style>{`
          @keyframes scaleIn {
            from { transform: scale(0.4); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
          @keyframes fadeUp {
            from { transform: translateY(16px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          .checkin-success-icon  { animation: scaleIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
          .checkin-success-text  { animation: fadeUp  0.4s ease 0.3s both; }
          .checkin-success-sub   { animation: fadeUp  0.4s ease 0.45s both; }
          .checkin-success-ctas  { animation: fadeUp  0.4s ease 0.6s both; }
          @keyframes cf1 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(-28px,-72px) scale(0);opacity:0} }
          @keyframes cf2 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(28px,-80px) scale(0);opacity:0} }
          @keyframes cf3 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(-44px,-56px) scale(0);opacity:0} }
          @keyframes cf4 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(44px,-60px) scale(0);opacity:0} }
          @keyframes cf5 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(-14px,-88px) scale(0);opacity:0} }
          @keyframes cf6 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(18px,-76px) scale(0);opacity:0} }
          @keyframes cf7 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(-36px,-64px) scale(0);opacity:0} }
          @keyframes cf8 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(36px,-68px) scale(0);opacity:0} }
          .cf { position:absolute; width:7px; height:7px; borderRadius:50%; background:#39D98A; animation-duration:1.4s; animation-fill-mode:both; animation-timing-function:ease-out; }
          .cf1{animation-name:cf1;animation-delay:0.1s}
          .cf2{animation-name:cf2;animation-delay:0.15s}
          .cf3{animation-name:cf3;animation-delay:0.05s}
          .cf4{animation-name:cf4;animation-delay:0.2s}
          .cf5{animation-name:cf5;animation-delay:0.1s}
          .cf6{animation-name:cf6;animation-delay:0.08s}
          .cf7{animation-name:cf7;animation-delay:0.18s;background:rgba(57,217,138,0.6)}
          .cf8{animation-name:cf8;animation-delay:0.12s;background:rgba(57,217,138,0.7)}
        `}</style>

        <div style={{ padding: '24px 16px', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>

          <div className="checkin-success-icon" style={{
            position: 'relative',
            width: isMilestone ? '96px' : '88px',
            height: isMilestone ? '96px' : '88px',
            borderRadius: '50%',
            background: isGhost ? 'rgba(255,255,255,0.04)' : 'rgba(57,217,138,0.12)',
            border: `${isMilestone ? '3px' : '2px'} solid ${isGhost ? 'rgba(255,255,255,0.15)' : 'var(--color-accent)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '28px', fontSize: isMilestone ? '44px' : '40px',
          }}>
            {isGhost ? '👤' : '✓'}
            {isMilestone && (
              <>
                <span className="cf cf1" />
                <span className="cf cf2" />
                <span className="cf cf3" />
                <span className="cf cf4" />
                <span className="cf cf5" />
                <span className="cf cf6" />
                <span className="cf cf7" />
                <span className="cf cf8" />
              </>
            )}
          </div>

          <h1 className="checkin-success-text" style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: isMilestone ? '30px' : '28px',
            color: 'var(--color-text)', marginBottom: '12px', lineHeight: 1.2,
          }}>
            {isGhost ? "You're in — quietly." : `You're in, ${displayName}.`}
          </h1>

          <p className="checkin-success-sub" style={{
            fontSize: isMilestone ? '17px' : '15px',
            color: 'var(--color-muted)', lineHeight: 1.65,
            marginBottom: '40px', maxWidth: '300px',
          }}>
            {isGhost ? (
              <>The count went up.{' '}<span style={{ color: 'var(--color-text)' }}>The vibe is better.</span></>
            ) : isMilestone ? (
              <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{getMilestoneMessage()}</span>
            ) : isRegular ? (
              <>Visit {visitNumber} at{' '}
                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{venue!.name}</span>
                . Good to have you back.
              </>
            ) : (
              <>Welcome to{' '}
                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{venue!.name}</span>
                . You're officially part of the neighbourhood.
              </>
            )}
          </p>

          <div className="checkin-success-ctas" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isMilestone && (
              <a
                href={`https://wa.me/?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', textDecoration: 'none',
                  background: 'transparent',
                  border: '1.5px solid rgba(57,217,138,0.4)',
                  borderRadius: '14px', padding: '14px',
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
                  textAlign: 'center', color: '#39D98A',
                }}
              >
                Share on WhatsApp
              </a>
            )}
            <Link
              to={`/venue/${slug}`}
              style={{
                display: 'block', textDecoration: 'none',
                background: 'var(--color-accent)', color: '#000',
                borderRadius: '14px', padding: '16px',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', textAlign: 'center',
              }}
            >
              Back to {venue!.name.split("'")[0].trim()}
            </Link>
            <Link
              to="/feed"
              style={{
                display: 'block', textDecoration: 'none',
                color: 'var(--color-muted)', fontSize: '14px',
                padding: '12px', textAlign: 'center',
              }}
            >
              See what's near me →
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ── Form + submitting ───────────────────────────────────────────────────────

  const isSubmitting = step === 'submitting';

  return (
    <div style={{ padding: '16px', paddingBottom: '40px' }}>

      {/* Sub-header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} color="var(--color-text)" />
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '1px' }}>
            {emoji} {venue.name}
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px' }}>Check in</div>
        </div>

        <div style={{ width: '36px' }} />
      </div>

      {/* Venue card */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '16px', padding: '14px',
        display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '28px',
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
          background: `${color}18`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
        }}>
          {emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
            {venue.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '11px', fontWeight: 600, color,
              background: `${color}18`, padding: '2px 8px', borderRadius: '20px',
            }}>
              {venue.category}
            </span>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: status.color, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: status.color }}>{status.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
            <MapPin size={11} color="var(--color-muted)" />
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              {venue.neighborhood}, {venue.city}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>

        {/* Name input */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '8px' }}>
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setNameError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="What do people call you?"
            autoComplete="given-name"
            style={inputStyle}
            disabled={isSubmitting}
          />
          {nameError && (
            <p style={{ fontSize: '12px', color: '#F87171', marginTop: '6px' }}>
              We need something to call you 👋
            </p>
          )}
        </div>

        {/* Visit type toggle */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '8px' }}>
            How do you know this place?
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {([true, false] as const).map(val => (
              <button
                key={String(val)}
                onClick={() => setIsRegular(val)}
                disabled={isSubmitting}
                style={{
                  flex: 1, padding: '13px 8px', borderRadius: '12px', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px',
                  border: isRegular === val ? 'none' : '1px solid var(--color-border)',
                  background: isRegular === val ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: isRegular === val ? '#000' : 'var(--color-muted)',
                  transition: 'all 0.15s', minHeight: '48px',
                }}
              >
                {val ? "I'm a regular here" : 'First time here'}
              </button>
            ))}
          </div>
        </div>

        {/* Ghost mode toggle */}
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '14px', padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px' }}>
              Check in quietly
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.4 }}>
              You show up in the count but stay anonymous
            </div>
          </div>
          <ToggleSwitch checked={ghostMode} onChange={setGhostMode} />
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        style={{
          width: '100%', minHeight: '56px',
          background: isSubmitting ? 'rgba(57,217,138,0.6)' : 'var(--color-accent)',
          color: '#000', border: 'none', borderRadius: '14px',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '17px',
          cursor: isSubmitting ? 'default' : 'pointer',
          transition: 'background 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        {isSubmitting ? (
          <>
            <span style={{
              width: '18px', height: '18px', borderRadius: '50%',
              border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000',
              display: 'inline-block', animation: 'spin 0.7s linear infinite',
            }} />
            Checking you in…
          </>
        ) : (
          'Check me in'
        )}
      </button>

      {isSubmitting && (
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      )}
    </div>
  );
}
