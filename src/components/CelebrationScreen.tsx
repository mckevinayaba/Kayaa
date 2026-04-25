// ─── CelebrationScreen ────────────────────────────────────────────────────────
//
// Full-screen post-check-in moment. Used by both CheckInPage and QRCheckInPage.
// Auto-dismisses after 5 seconds; tapping anywhere also dismisses.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { UserVenueScore } from '../lib/api';
import type { Venue } from '../types';

// ── Badge definitions ──────────────────────────────────────────────────────────

const BADGE_ICON: Record<string, string> = {
  newcomer: '🌱',
  regular:  '⭐',
  loyal:    '🔥',
  legend:   '👑',
};

const BADGE_LABEL: Record<string, string> = {
  newcomer: "You're a Newcomer",
  regular:  "You're a Regular",
  loyal:    "You're Loyal",
  legend:   "Neighbourhood Legend",
};

const BADGE_COLOR: Record<string, string> = {
  newcomer: '#34D399',
  regular:  '#F5A623',
  loyal:    '#F97316',
  legend:   '#A855F7',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  venue: Venue;
  score: UserVenueScore;
  onDismiss: () => void;
}

export default function CelebrationScreen({ venue, score, onDismiss }: Props) {
  const [countdown, setCountdown] = useState(5);

  const badgeUpgraded = score.badgeTier !== score.prevBadgeTier && score.visitCount > 1;
  const badgeColor    = BADGE_COLOR[score.badgeTier] ?? '#39D98A';

  const waText = encodeURIComponent(
    `Just checked in at ${venue.name} on Kayaa\nVisit #${score.visitCount} · ${score.badgeTier} status 💪\nhttps://kayaa.co.za`
  );

  // Auto-dismiss countdown
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); onDismiss(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onDismiss]);

  return (
    <>
      <style>{`
        @keyframes celebBadgeIn {
          0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(4deg); opacity: 1; }
          100% { transform: scale(1)   rotate(0deg); opacity: 1; }
        }
        @keyframes celebPulse {
          0%,100% { box-shadow: 0 0 0 0   ${badgeColor}44; }
          50%     { box-shadow: 0 0 0 14px ${badgeColor}00; }
        }
        @keyframes celebFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes celebCf1 { 0%{opacity:1} 100%{transform:translate(-28px,-76px) scale(0);opacity:0} }
        @keyframes celebCf2 { 0%{opacity:1} 100%{transform:translate( 28px,-82px) scale(0);opacity:0} }
        @keyframes celebCf3 { 0%{opacity:1} 100%{transform:translate(-46px,-58px) scale(0);opacity:0} }
        @keyframes celebCf4 { 0%{opacity:1} 100%{transform:translate( 46px,-62px) scale(0);opacity:0} }
        @keyframes celebCf5 { 0%{opacity:1} 100%{transform:translate(-14px,-90px) scale(0);opacity:0} }
        @keyframes celebCf6 { 0%{opacity:1} 100%{transform:translate( 18px,-78px) scale(0);opacity:0} }
        .celeb-badge { animation: celebBadgeIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .celeb-pulse { animation: celebPulse 2.5s ease 0.9s infinite; }
        .celeb-t1    { animation: celebFadeUp 0.4s ease 0.3s  both; }
        .celeb-t2    { animation: celebFadeUp 0.4s ease 0.48s both; }
        .celeb-ctas  { animation: celebFadeUp 0.4s ease 0.62s both; }
        .celeb-cf    { position:absolute; width:8px; height:8px; border-radius:50%;
                       background:${badgeColor}; animation-duration:1.3s;
                       animation-fill-mode:both; animation-timing-function:ease-out; }
        .celeb-cf1{animation-name:celebCf1;animation-delay:0.12s}
        .celeb-cf2{animation-name:celebCf2;animation-delay:0.18s}
        .celeb-cf3{animation-name:celebCf3;animation-delay:0.06s}
        .celeb-cf4{animation-name:celebCf4;animation-delay:0.22s}
        .celeb-cf5{animation-name:celebCf5;animation-delay:0.10s}
        .celeb-cf6{animation-name:celebCf6;animation-delay:0.15s}
      `}</style>

      <div
        onClick={onDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: '#0D1117',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '32px 24px', textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        {/* Badge icon with confetti burst */}
        <div
          className="celeb-badge celeb-pulse"
          style={{
            position: 'relative',
            width: '100px', height: '100px', borderRadius: '50%',
            background: `${badgeColor}14`,
            border: `2px solid ${badgeColor}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '48px', marginBottom: '28px',
          }}
        >
          {BADGE_ICON[score.badgeTier] ?? '✓'}
          {badgeUpgraded && (
            <>
              <span className="celeb-cf celeb-cf1" />
              <span className="celeb-cf celeb-cf2" />
              <span className="celeb-cf celeb-cf3" />
              <span className="celeb-cf celeb-cf4" />
              <span className="celeb-cf celeb-cf5" />
              <span className="celeb-cf celeb-cf6" />
            </>
          )}
        </div>

        {/* Badge tier */}
        <div className="celeb-t1" style={{ marginBottom: '20px' }}>
          {badgeUpgraded && (
            <div style={{
              display: 'inline-block',
              background: `${badgeColor}20`,
              border: `1px solid ${badgeColor}40`,
              borderRadius: '20px', padding: '5px 14px',
              fontSize: '12px', fontWeight: 700,
              color: badgeColor,
              fontFamily: 'DM Sans, sans-serif',
              marginBottom: '12px',
            }}>
              🎉 Badge upgrade!
            </div>
          )}
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '26px', color: '#fff', lineHeight: 1.2, margin: 0,
          }}>
            {BADGE_LABEL[score.badgeTier] ?? "You're in"}
          </h1>
        </div>

        {/* Visit count + streak */}
        <div className="celeb-t2" style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, margin: '0 0 6px' }}>
            Visit{' '}
            <span style={{ color: '#39D98A', fontWeight: 700 }}>#{score.visitCount}</span>
            {' '}at{' '}
            <span style={{ color: '#fff', fontWeight: 700 }}>{venue.name}</span>
          </p>

          {score.streakDays >= 3 && (
            <p style={{ fontSize: '13px', color: '#F97316', fontWeight: 600, margin: '0 0 6px' }}>
              {score.streakDays}-visit streak at this place 🔥
            </p>
          )}

          {badgeUpgraded && (
            <p style={{
              fontSize: '13px', color: badgeColor,
              fontWeight: 700, margin: '6px 0 0',
              fontFamily: 'Syne, sans-serif',
            }}>
              You just became a{' '}
              <strong>{score.badgeTier}</strong>
              {' '}at {venue.name}!
            </p>
          )}
        </div>

        {/* CTAs — stop click propagation so buttons work */}
        <div
          className="celeb-ctas"
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          {/* WhatsApp share */}
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: '#25D366', color: '#000',
              borderRadius: '14px', padding: '15px',
              textDecoration: 'none',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
            }}
          >
            <span>💬</span> Share on WhatsApp
          </a>

          {/* Back to venue */}
          <Link
            to={`/venue/${venue.slug}`}
            onClick={onDismiss}
            style={{
              display: 'block',
              background: '#39D98A', color: '#000',
              borderRadius: '14px', padding: '15px',
              textDecoration: 'none',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
            }}
          >
            Back to {venue.name.split("'")[0].trim()}
          </Link>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.35)',
              fontSize: '12px', cursor: 'pointer', padding: '8px',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Dismiss ({countdown}s)
          </button>
        </div>
      </div>
    </>
  );
}
