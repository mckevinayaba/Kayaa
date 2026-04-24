import { useState } from 'react';
import { Outlet, NavLink, useLocation as useRouterLocation } from 'react-router-dom';
import { Home, MapPin, LayoutDashboard, PlusCircle, MessageSquare, Briefcase } from 'lucide-react';
import useLocation from '../hooks/useLocation';
import AreaSelector from '../components/AreaSelector';

const navItems = [
  { to: '/feed',       icon: Home,            label: 'Feed'      },
  { to: '/board',      icon: MessageSquare,   label: 'Board'     },
  { to: '/jobs',       icon: Briefcase,       label: 'Jobs'      },
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/onboarding', icon: PlusCircle,      label: 'Add Place' },
];

export default function AppLayout() {
  const routerLocation = useRouterLocation();
  const { suburb, loading, error, setManualSuburb, refresh } = useLocation();
  const [areaOpen, setAreaOpen] = useState(false);

  // On venue pages, show "Place" in the nav; otherwise show detected suburb
  const isVenuePage = routerLocation.pathname.startsWith('/venue');
  const locationLabel = isVenuePage
    ? 'Place'
    : loading
      ? '…'
      : suburb || 'Set area';

  // Show AreaSelector automatically on first visit if geolocation was denied and no suburb set
  const needsArea = error && !suburb;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* AreaSelector (auto-shown when denied + no suburb) */}
      {needsArea && (
        <AreaSelector
          currentSuburb={suburb}
          onSelect={setManualSuburb}
          onClose={() => {/* can't close if they haven't set area yet — handled by picking one */}}
          showDeniedMessage
          onRequestDetect={refresh}
        />
      )}

      {/* Manual open */}
      {areaOpen && !needsArea && (
        <AreaSelector
          currentSuburb={suburb}
          onSelect={setManualSuburb}
          onClose={() => setAreaOpen(false)}
          onRequestDetect={refresh}
        />
      )}

      {/* Top nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
        padding: '0 16px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <NavLink to="/feed" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--color-accent)', letterSpacing: '-0.5px' }}>
            kayaa
          </span>
        </NavLink>

        <button
          onClick={() => !isVenuePage && setAreaOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'transparent', border: 'none',
            cursor: isVenuePage ? 'default' : 'pointer',
            padding: '6px 8px', borderRadius: '8px',
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#39D98A', opacity: 0.6,
                animation: 'navLocPulse 1.2s ease-in-out infinite',
              }} />
              <style>{`@keyframes navLocPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }`}</style>
            </>
          ) : (
            <MapPin size={16} color="var(--color-muted)" />
          )}
          <span style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
            {locationLabel}
          </span>
        </button>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, paddingBottom: '72px', maxWidth: '640px', width: '100%', margin: '0 auto' }}>
        <Outlet />
      </main>

      {/* Bottom mobile nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: '64px', padding: '0 8px',
      }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '4px', textDecoration: 'none',
              color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
              flex: 1, padding: '8px 0',
            })}
          >
            <Icon size={20} />
            <span style={{ fontSize: '11px', fontWeight: 500 }}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
