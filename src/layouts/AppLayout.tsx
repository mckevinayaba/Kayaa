import { useState } from 'react';
import { Outlet, NavLink, useLocation as useRouterLocation } from 'react-router-dom';
import { Home, MapPin, LayoutDashboard, PlusCircle, MessageSquare, Briefcase } from 'lucide-react';
import useLocation from '../hooks/useLocation';
import AreaSelector from '../components/AreaSelector';
import CountrySelector from '../components/CountrySelector';
import { useCountry } from '../contexts/CountryContext';

const navItems = [
  { to: '/feed',       icon: Home,            label: 'Feed'      },
  { to: '/board',      icon: MessageSquare,   label: 'Board'     },
  { to: '/jobs',       icon: Briefcase,       label: 'Jobs'      },
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/onboarding', icon: PlusCircle,      label: 'Add Place' },
];

export default function AppLayout() {
  const routerLocation = useRouterLocation();
  const { suburb, loading, error, setManualSuburb, confirm, refresh } = useLocation();
  const { selectedCountry } = useCountry();
  const [areaOpen,    setAreaOpen]    = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  const isVenuePage = routerLocation.pathname.startsWith('/venue');
  const locationLabel = isVenuePage
    ? 'Place'
    : loading
      ? '…'
      : suburb || 'Set area';

  const needsArea = error && !suburb;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>

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

      {/* CountrySelector modal */}
      {countryOpen && (
        <CountrySelector onClose={() => setCountryOpen(false)} />
      )}

      {/* Top nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
        padding: '0 16px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <NavLink to="/feed" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '20px', color: 'var(--color-accent)', letterSpacing: '-0.5px',
          }}>
            kayaa
          </span>
        </NavLink>

        {/* Right side: [flag code] | [📍 suburb] */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

          {/* Country flag trigger */}
          <button
            onClick={() => setCountryOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'transparent', border: 'none',
              cursor: 'pointer',
              padding: '6px 8px', borderRadius: '8px',
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>{selectedCountry.flag}</span>
            <span style={{
              fontSize: '12px', fontWeight: 700,
              color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif',
            }}>
              {selectedCountry.code}
            </span>
          </button>

          {/* Divider */}
          <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />

          {/* Neighbourhood trigger */}
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
              <MapPin size={14} color="var(--color-muted)" />
            )}
            <span style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              {locationLabel}
            </span>
          </button>
        </div>
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
