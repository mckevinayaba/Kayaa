import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, MapPin, LayoutDashboard, PlusCircle, MessageSquare, Briefcase } from 'lucide-react';
import { useEffect, useState } from 'react';

const navItems = [
  { to: '/feed', icon: Home, label: 'Feed' },
  { to: '/board', icon: MessageSquare, label: 'Board' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/onboarding', icon: PlusCircle, label: 'Add Place' },
];

const STORAGE_KEY = 'kayaa_city';
const DEFAULT_CITY = 'Johannesburg';

function useCity(): string {
  const [city, setCity] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  });

  useEffect(() => {
    // Already resolved — skip
    if (localStorage.getItem(STORAGE_KEY)) return;

    if (!navigator.geolocation) {
      const fallback = DEFAULT_CITY;
      localStorage.setItem(STORAGE_KEY, fallback);
      setCity(fallback);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address ?? {};
          // Prefer suburb / neighbourhood over city for granularity
          const resolved =
            addr.suburb ??
            addr.neighbourhood ??
            addr.town ??
            addr.city ??
            addr.county ??
            DEFAULT_CITY;
          localStorage.setItem(STORAGE_KEY, resolved);
          setCity(resolved);
        } catch {
          localStorage.setItem(STORAGE_KEY, DEFAULT_CITY);
          setCity(DEFAULT_CITY);
        }
      },
      () => {
        // User denied or error — fall back
        localStorage.setItem(STORAGE_KEY, DEFAULT_CITY);
        setCity(DEFAULT_CITY);
      },
      { timeout: 8000 }
    );
  }, []);

  return city || DEFAULT_CITY;
}

export default function AppLayout() {
  const location = useLocation();
  const city = useCity();

  const locationLabel = location.pathname.startsWith('/venue') ? 'Place' : city;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Top nav */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 16px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <NavLink to="/feed" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--color-accent)', letterSpacing: '-0.5px' }}>
            kayaa
          </span>
        </NavLink>
        <button
          onClick={() => console.log('City selector coming soon')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '6px 8px', borderRadius: '8px',
          }}
        >
          <MapPin size={16} color="var(--color-muted)" />
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
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '64px',
        padding: '0 8px',
      }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
              color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
              flex: 1,
              padding: '8px 0',
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
