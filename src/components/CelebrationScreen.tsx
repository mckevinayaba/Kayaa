// ─── CelebrationScreen ────────────────────────────────────────────────────────
//
// The check-in success moment. The most emotionally precise screen in Kayaa.
//
// Philosophy: A check-in is not a tap, a streak, or a badge.
// It is a visible act of presence — a way of saying "I was here."
// Kayaa is the neighbourhood's memory. This screen must feel that way.
//
// Milestone states by visit count:
//   1       → first visit
//   2–4     → becoming familiar
//   5       → you're a regular (confetti, WhatsApp)
//   10      → ten visits (stronger moment, WhatsApp)
//   25      → part of the rhythm (elevated, WhatsApp)
//   50      → part of your life (gold accent, WhatsApp)
//   ghost   → quiet presence (private mode)
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { UserVenueScore } from '../lib/api';
import type { Venue } from '../types';

// ── Milestone config ───────────────────────────────────────────────────────────

interface MilestoneConfig {
  heading:    (venueName: string) => string;
  message:    (venueName: string) => string;
  subtext:    string;
  accentColor: string;
  showConfetti: boolean;
  confettiScale: number;     // 1 = subtle, 2 = stronger, 3 = elevated
  showWhatsApp: boolean;
  waText:     (venueName: string, visitCount: number) => string;
}

function getMilestone(visitCount: number): MilestoneConfig {
  if (visitCount === 1) return {
    heading:      ()  => 'You showed up! ✓',
    message:      (v) => `This place knows you were here. Welcome to ${v}.`,
    subtext:      'First visit.',
    accentColor:  '#39D98A',
    showConfetti: false,
    confettiScale: 0,
    showWhatsApp: false,
    waText:       (v) => `I just checked in at ${v} on Kayaa. https://kayaa.co.za`,
  };

  if (visitCount <= 4) return {
    heading:      ()  => 'Good to see you again.',
    message:      (v) => `You're becoming a familiar face at ${v}.`,
    subtext:      `Visit ${visitCount}.`,
    accentColor:  '#39D98A',
    showConfetti: false,
    confettiScale: 0,
    showWhatsApp: false,
    waText:       (v) => `I just checked in at ${v} on Kayaa. https://kayaa.co.za`,
  };

  if (visitCount === 5) return {
    heading:      ()  => "You're a regular now. 🎉",
    message:      ()  => '5 visits. They know your face here.',
    subtext:      'Visit 5.',
    accentColor:  '#39D98A',
    showConfetti: true,
    confettiScale: 1,
    showWhatsApp: true,
    waText:       (v) => `I'm now a regular at ${v} on Kayaa. https://kayaa.co.za`,
  };

  if (visitCount === 10) return {
    heading:      ()  => '10 visits! You keep coming back.',
    message:      ()  => 'That is what being a regular looks like.',
    subtext:      'Visit 10.',
    accentColor:  '#39D98A',
    showConfetti: true,
    confettiScale: 2,
    showWhatsApp: true,
    waText:       (v) => `Ten visits at ${v}. One of the places that makes this neighbourhood feel like itself. https://kayaa.co.za`,
  };

  if (visitCount === 25) return {
    heading:      ()  => '25 visits.',
    message:      (v) => `${v} is part of your neighbourhood rhythm.`,
    subtext:      'You keep coming back.',
    accentColor:  '#60A5FA',
    showConfetti: true,
    confettiScale: 2,
    showWhatsApp: true,
    waText:       (v) => `25 visits at ${v}. One of the places that makes this neighbourhood feel like itself. https://kayaa.co.za`,
  };

  if (visitCount === 50) return {
    heading:      ()  => '50 visits.',
    message:      ()  => 'This place is part of your life now.',
    subtext:      'That kind of loyalty means something.',
    accentColor:  '#F5A623',
    showConfetti: true,
    confettiScale: 3,
    showWhatsApp: true,
    waText:       (v) => `50 visits at ${v}. One of the places that makes this neighbourhood feel like itself. https://kayaa.co.za`,
  };

  // Visits > 50 — occasional milestone echoes at round numbers
  if (visitCount % 25 === 0) return {
    heading:      (v) => `${visitCount} visits at ${v}.`,
    message:      ()  => 'You keep showing up. That matters.',
    subtext:      'The place remembers.',
    accentColor:  '#F5A623',
    showConfetti: true,
    confettiScale: 2,
    showWhatsApp: true,
    waText:       (v) => `${visitCount} visits at ${v}. One of the places that makes this neighbourhood feel like itself. https://kayaa.co.za`,
  };

  // All other visits (2–4 already handled, remaining 6–9, 11–24, 26–49, 51+)
  return {
    heading:      ()  => 'Good to see you again.',
    message:      (v) => `You're a familiar face at ${v}.`,
    subtext:      `Visit ${visitCount}.`,
    accentColor:  '#39D98A',
    showConfetti: false,
    confettiScale: 0,
    showWhatsApp: false,
    waText:       (v) => `I just checked in at ${v} on Kayaa. https://kayaa.co.za`,
  };
}

const GHOST_CONFIG: MilestoneConfig = {
  heading:      ()  => 'Quiet visit done. ✓',
  message:      ()  => 'You were here. Only you know it.',
  subtext:      'Ghost mode.',
  accentColor:  'rgba(255,255,255,0.35)',
  showConfetti: false,
  confettiScale: 0,
  showWhatsApp: false,
  waText:       () => '',
};

// ── Confetti particles ────────────────────────────────────────────────────────
// Restrained, not childish. Scale controls intensity.

interface ConfettiProps {
  color: string;
  scale: number; // 1 | 2 | 3
}

function ConfettiBurst({ color, scale }: ConfettiProps) {
  const count  = scale === 1 ? 6 : scale === 2 ? 10 : 14;
  const spread = scale === 1 ? 64 : scale === 2 ? 90 : 120;
  const dur    = scale === 1 ? 1.2 : scale === 2 ? 1.6 : 2.0;
  const size   = scale === 3 ? 10 : 8;

  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i;
    const rad   = (angle * Math.PI) / 180;
    const dx    = Math.round(Math.cos(rad) * spread);
    const dy    = Math.round(Math.sin(rad) * spread);
    const delay = (i * 0.04).toFixed(2);
    const id    = `cf${i}`;

    return { dx, dy, delay, id };
  });

  return (
    <>
      <style>{`
        ${particles.map(p => `
          @keyframes cfBurst_${p.id} {
            0%   { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(${p.dx}px, ${p.dy}px) scale(0); opacity: 0; }
          }
          .cf_${p.id} {
            animation: cfBurst_${p.id} ${dur}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}s both;
          }
        `).join('')}
      `}</style>
      {particles.map(p => (
        <span
          key={p.id}
          className={`cf_${p.id}`}
          style={{
            position: 'absolute',
            width: `${size}px`, height: `${size}px`,
            borderRadius: '50%',
            background: color,
            top: '50%', left: '50%',
            marginTop: `-${size / 2}px`, marginLeft: `-${size / 2}px`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

// ── Checkmark icon ────────────────────────────────────────────────────────────

function CheckMark({ color, large }: { color: string; large: boolean }) {
  const size = large ? 88 : 72;
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="36" cy="36" r="35" stroke={color} strokeWidth="2" strokeOpacity="0.3" />
      <circle cx="36" cy="36" r="35" stroke={color} strokeWidth="2" strokeOpacity="0.08" />
      <path
        d="M22 36 L31 45 L50 26"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  venue:     Venue;
  score:     UserVenueScore;
  onDismiss: () => void;
  userName?: string;
  isGhost?:  boolean;
}

export default function CelebrationScreen({ venue, score, onDismiss, userName: _userName, isGhost }: Props) {
  const [countdown, setCountdown] = useState(6);

  const config = isGhost ? GHOST_CONFIG : getMilestone(score.visitCount);
  const { accentColor, showConfetti, confettiScale, showWhatsApp, waText } = config;

  const isMilestone = score.visitCount === 5 || score.visitCount === 10
    || score.visitCount === 25 || score.visitCount === 50
    || (score.visitCount > 50 && score.visitCount % 25 === 0);

  const isGoldMoment = score.visitCount === 50 || (score.visitCount > 50 && score.visitCount % 25 === 0);

  // Truncate venue name for display to avoid overflow
  const displayName = venue.name.length > 32
    ? venue.name.slice(0, 30).trimEnd() + '…'
    : venue.name;

  // Full name for WhatsApp (untruncated)
  const waUrl = showWhatsApp
    ? `https://wa.me/?text=${encodeURIComponent(waText(venue.name, score.visitCount))}`
    : '';

  // Auto-dismiss: 6 s for regular visits, 10 s for milestones (give moment to breathe)
  const autoDismissSeconds = isMilestone ? 10 : 6;

  useEffect(() => {
    setCountdown(autoDismissSeconds);
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); onDismiss(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onDismiss, autoDismissSeconds]);

  return (
    <>
      <style>{`
        @keyframes csCheckIn {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes csRingPulse {
          0%, 100% { box-shadow: 0 0 0 0   ${accentColor}30; }
          50%       { box-shadow: 0 0 0 18px ${accentColor}00; }
        }
        @keyframes csFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes csSubtextIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .cs-icon    { animation: csCheckIn 0.5s cubic-bezier(0.34, 1.4, 0.64, 1) both; }
        .cs-ring    { animation: csRingPulse 2.8s ease 0.7s infinite; }
        .cs-line1   { animation: csFadeUp 0.38s ease 0.28s both; }
        .cs-line2   { animation: csFadeUp 0.38s ease 0.44s both; }
        .cs-subtext { animation: csSubtextIn 0.3s ease 0.6s both; }
        .cs-ctas    { animation: csFadeUp 0.38s ease 0.58s both; }
      `}</style>

      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: '#0D1117',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 28px 48px',
          textAlign: 'center',
          overflowY: 'auto',
        }}
      >

        {/* ── Checkmark icon ──────────────────────────────────────── */}
        <div
          className="cs-icon cs-ring"
          style={{
            position: 'relative',
            marginBottom: isMilestone ? '36px' : '28px',
            flexShrink: 0,
          }}
        >
          {showConfetti && (
            <ConfettiBurst color={accentColor} scale={confettiScale} />
          )}
          <CheckMark color={accentColor} large={isMilestone} />
        </div>

        {/* ── Heading ─────────────────────────────────────────────── */}
        <div className="cs-line1" style={{ marginBottom: '14px', width: '100%', maxWidth: '340px' }}>
          <h1 style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            fontSize: isMilestone ? '28px' : '24px',
            color: '#F0F6FC',
            lineHeight: 1.2,
            margin: '0 0 10px',
            wordBreak: 'break-word',
          }}>
            {config.heading(displayName)}
          </h1>

          {/* Subtext — quiet, small */}
          <p className="cs-subtext" style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 600,
            color: accentColor,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            margin: 0,
            opacity: 0.85,
          }}>
            {config.subtext}
          </p>
        </div>

        {/* ── Message ─────────────────────────────────────────────── */}
        <div className="cs-line2" style={{ marginBottom: '40px', width: '100%', maxWidth: '300px' }}>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '15px',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.65,
            margin: 0,
            wordBreak: 'break-word',
          }}>
            {config.message(displayName)}
          </p>

          {/* Gold moment accent line */}
          {isGoldMoment && (
            <div style={{
              marginTop: '16px',
              width: '48px',
              height: '2px',
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
              margin: '16px auto 0',
              borderRadius: '2px',
            }} />
          )}
        </div>

        {/* ── CTAs ────────────────────────────────────────────────── */}
        <div
          className="cs-ctas"
          style={{
            width: '100%', maxWidth: '340px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* WhatsApp — milestone visits only */}
          {showWhatsApp && waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: 'rgba(37,211,102,0.12)',
                border: '1px solid rgba(37,211,102,0.28)',
                color: '#25D366',
                borderRadius: '14px', padding: '15px',
                textDecoration: 'none',
                fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Share on WhatsApp
            </a>
          )}

          {/* Back to venue */}
          <Link
            to={`/venue/${venue.slug}`}
            onClick={onDismiss}
            style={{
              display: 'block',
              background: accentColor,
              color: isGoldMoment ? '#000' : '#0D1117',
              borderRadius: '14px', padding: '15px',
              textDecoration: 'none',
              fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
            }}
          >
            Back to {venue.name.length > 20 ? 'the venue' : venue.name.split("'")[0].trim()}
          </Link>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.25)',
              fontSize: '12px', cursor: 'pointer', padding: '8px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Continue ({countdown}s)
          </button>
        </div>

      </div>
    </>
  );
}
