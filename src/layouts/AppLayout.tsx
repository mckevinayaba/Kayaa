import { useState } from 'react';
import { Outlet, NavLink, useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import useLocation from '../hooks/useLocation';
import AreaSelector from '../components/AreaSelector';
import { useAuth } from '../contexts/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a first name from the Supabase user object. */
function getFirstName(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return '';
  const full =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    '';
  if (full) return full.split(' ')[0];
  // Fall back to the part of the email before @
  return user.email?.split('@')[0] ?? '';
}

/** Get a Google/OAuth profile photo URL. */
function getAvatarUrl(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return '';
  return user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const navItems = [
  { to: '/feed',       emoji: '🏠', label: 'Home'    },
  { to: '/explore',    emoji: '🗺️', label: 'Explore' },
  { to: '/board',      emoji: '💬', label: 'Board'   },
  { to: '/onboarding', emoji: '➕', label: 'Add'     },
  { to: '/profile',    emoji: '👤', label: 'Profile' },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function AppLayout() {
  const routerLocation  = useRouterLocation();
  const navigate        = useNavigate();
  const { user, signOut } = useAuth();
  const { suburb, loading, error, needsConfirmation, setManualSuburb, confirm, refresh } = useLocation();
  const [areaOpen,    setAreaOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isVenuePage = routerLocation.pathname.startsWith('/venue');

  // Only show a suburb name when it has been explicitly confirmed.
  // Unconfirmed or IP-based readings (Honeydew / Randburg) show the neutral label.
  const locationLabel = isVenuePage
    ? 'Place'
    : loading
      ? '…'
      : (suburb && !needsConfirmation) ? suburb : 'Set your area';

  const needsArea = error && !suburb;

  const firstName  = getFirstName(user);
  const avatarUrl  = getAvatarUrl(user);
  const initial    = (firstName[0] || '?').toUpperCase();

  async function handleSignOut() {
    setProfileOpen(false);
    await signOut();
    localStorage.removeItem('kayaa_setup_done');
    window.location.href = '/welcome';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* Skip link */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* AreaSelector */}
      {needsArea && (
        <AreaSelector
          currentSuburb={suburb}
          onSelect={(s, c) => { setManualSuburb(s, c); confirm(); }}
          onClose={() => {}}
          showDeniedMessage
          onRequestDetect={refresh}
        />
      )}
      {areaOpen && !needsArea && (
        <AreaSelector
          currentSuburb={suburb}
          onSelect={(s, c) => { setManualSuburb(s, c); confirm(); setAreaOpen(false); }}
          onClose={() => setAreaOpen(false)}
          onRequestDetect={refresh}
        />
      )}

      {/* Profile dropdown backdrop */}
      {profileOpen && (
        <div
          onClick={() => setProfileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 49 }}
        />
      )}

      {/* Profile dropdown panel */}
      {profileOpen && user && (
        <div style={{
          position: 'fixed', top: '60px', right: '16px', zIndex: 51,
          background: '#161B22',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          minWidth: '220px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {/* User identity */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F0F6FC' }}>
              {firstName || 'Kayaa member'}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
              {user.email}
            </div>
          </div>

          {/* Menu items */}
          {[
            { label: '👤  View profile',        action: () => { navigate('/profile');       setProfileOpen(false); } },
            { label: '✏️  Edit profile',         action: () => { navigate('/profile/edit');  setProfileOpen(false); } },
            { label: '📍  Home neighbourhood',   action: () => { setAreaOpen(true);           setProfileOpen(false); } },
            { label: '⚙️  Settings',             action: () => { navigate('/settings/privacy'); setProfileOpen(false); } },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                padding: '12px 16px', background: 'transparent', border: 'none',
                fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
                color: 'rgba(255,255,255,0.75)', cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {item.label}
            </button>
          ))}

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', padding: '12px 16px', background: 'transparent', border: 'none',
              fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
              color: '#F87171', cursor: 'pointer', textAlign: 'left',
            }}
          >
            🚪  Sign out
          </button>
        </div>
      )}

      {/* ── Top nav ──────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
        padding: '0 16px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <NavLink to="/feed" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '20px', color: '#39D98A', letterSpacing: '-0.5px',
          }}>
            kayaa
          </span>
        </NavLink>

        {/* Right: location chip + user avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Neighbourhood trigger */}
          <button
            onClick={() => !isVenuePage && setAreaOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              cursor: isVenuePage ? 'default' : 'pointer',
              padding: '5px 10px',
            }}
          >
            {loading ? (
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#39D98A', opacity: 0.6,
                animation: 'navLocPulse 1.2s ease-in-out infinite',
              }} />
            ) : (
              <MapPin size={12} color="#39D98A" />
            )}
            <span style={{
              fontSize: '12px', fontWeight: 600,
              color: (suburb && !needsConfirmation) ? 'var(--color-text)' : 'var(--color-muted)',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              {locationLabel}
            </span>
            <style>{`@keyframes navLocPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }`}</style>
          </button>

          {/* User avatar / join button */}
          {user ? (
            <button
              onClick={() => setProfileOpen(p => !p)}
              style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: avatarUrl ? 'transparent' : 'rgba(57,217,138,0.15)',
                border: `2px solid ${profileOpen ? '#39D98A' : 'rgba(57,217,138,0.3)'}`,
                cursor: 'pointer', padding: 0, overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 0.15s',
                flexShrink: 0,
              }}
              title={`${firstName || 'Profile'} — click to open menu`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={firstName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 800,
                  fontSize: '13px', color: '#39D98A',
                }}>
                  {initial}
                </span>
              )}
            </button>
          ) : (
            <NavLink
              to="/welcome"
              style={{
                padding: '6px 14px', borderRadius: '20px',
                background: '#39D98A', color: '#0D1117',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px',
                textDecoration: 'none',
              }}
            >
              Join
            </NavLink>
          )}
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" style={{
        flex: 1,
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        maxWidth: '640px',
        width: '100%',
        margin: '0 auto',
      }}>
        <Outlet />
      </main>

      {/* Bottom mobile nav */}
      <nav aria-label="Main navigation" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#0D1117',
        borderTop: '1px solid rgba(57,217,138,0.1)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: '64px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: '8px', paddingRight: '8px',
      }}>
        {navItems.map(({ to, emoji, label }) => {
          // Profile tab: active for /profile/*, /settings/*, /dashboard, /venue/*
          const isProfileTab = to === '/profile';
          const forceActive  = isProfileTab && (
            routerLocation.pathname.startsWith('/profile') ||
            routerLocation.pathname.startsWith('/settings') ||
            routerLocation.pathname === '/dashboard' ||
            routerLocation.pathname.startsWith('/venue/dashboard') ||
            routerLocation.pathname.startsWith('/venue/analytics') ||
            routerLocation.pathname.startsWith('/venue/updates') ||
            routerLocation.pathname.startsWith('/venue/photos') ||
            routerLocation.pathname.startsWith('/venue/events') ||
            routerLocation.pathname.startsWith('/venue/hours') ||
            routerLocation.pathname.startsWith('/venue/qr-code')
          );

          return isProfileTab ? (
            <NavLink
              key={to}
              to={to}
              end
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '3px', textDecoration: 'none',
                color: forceActive ? '#39D98A' : 'rgba(255,255,255,0.4)',
                flex: 1, padding: '8px 0', minWidth: '60px',
                transition: 'color 0.15s',
              }}
            >
              <span style={{
                fontSize: '22px', lineHeight: 1,
                filter: forceActive ? 'drop-shadow(0 0 8px rgba(57,217,138,0.7))' : 'none',
                transition: 'filter 0.15s',
              }}>
                {emoji}
              </span>
              <span style={{
                fontSize: '10px', fontWeight: forceActive ? 700 : 500,
                fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.01em',
              }}>
                {label}
              </span>
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '3px', textDecoration: 'none',
                color: isActive ? '#39D98A' : 'rgba(255,255,255,0.4)',
                flex: 1, padding: '8px 0', minWidth: '60px',
                transition: 'color 0.15s',
              })}
            >
              {({ isActive }) => (
                <>
                  <span style={{
                    fontSize: '22px', lineHeight: 1,
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(57,217,138,0.7))' : 'none',
                    transition: 'filter 0.15s',
                  }}>
                    {emoji}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: isActive ? 700 : 500,
                    fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.01em',
                  }}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
