/**
 * NotFoundPage — /404 catch-all
 *
 * Rendered for any URL that does not match a defined route.
 * Common causes in Kayaa:
 *   - Old share links to venues that were renamed/deleted
 *   - Manually typed URLs with typos
 *   - Deep links from social media that have rotted
 *
 * Context-aware CTA: signed-in users go Home, guests go to Welcome.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const primaryDest  = user ? '/feed'          : '/welcome';
  const primaryLabel = user ? 'Go to Home'     : 'Join Kayaa';
  const secondaryDest  = user ? '/neighbourhood' : '/about';
  const secondaryLabel = user ? 'Browse places' : 'Learn more';

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0D1117',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      textAlign: 'center',
    }}>

      {/* Illustration */}
      <div style={{
        width: '80px', height: '80px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', marginBottom: '28px',
        flexShrink: 0,
      }}>
        🏚️
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800,
        fontSize: '24px', color: '#F0F6FC',
        margin: '0 0 10px', lineHeight: 1.2,
      }}>
        This page doesn't exist
      </h1>

      {/* Body */}
      <p style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '15px', color: 'rgba(255,255,255,0.45)',
        lineHeight: 1.65, margin: '0 0 36px',
        maxWidth: '300px',
      }}>
        The link may have expired, the place may have moved,
        or you may have followed a broken URL.
      </p>

      {/* Primary CTA */}
      <button
        onClick={() => navigate(primaryDest, { replace: true })}
        style={{
          width: '100%', maxWidth: '320px', minHeight: '52px',
          background: '#39D98A', color: '#0D1117',
          border: 'none', borderRadius: '14px',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
          cursor: 'pointer', marginBottom: '12px',
        }}
      >
        {primaryLabel}
      </button>

      {/* Secondary CTA */}
      <button
        onClick={() => navigate(secondaryDest, { replace: true })}
        style={{
          width: '100%', maxWidth: '320px', minHeight: '48px',
          background: 'transparent', color: 'rgba(255,255,255,0.45)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px',
          cursor: 'pointer',
        }}
      >
        {secondaryLabel}
      </button>

      {/* Branding anchor — bottom of screen */}
      <div style={{
        position: 'fixed', bottom: '32px',
        fontFamily: 'Syne, sans-serif', fontWeight: 700,
        fontSize: '18px', color: '#39D98A',
        letterSpacing: '-0.5px',
      }}>
        kayaa
      </div>
    </div>
  );
}
