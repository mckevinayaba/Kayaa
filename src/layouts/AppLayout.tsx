import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, MapPin, LayoutDashboard, PlusCircle } from 'lucide-react';

const navItems = [
  { to: '/feed', icon: Home, label: 'Feed' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/onboarding', icon: PlusCircle, label: 'Add Venue' },
];

export default function AppLayout() {
  const location = useLocation();

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={16} color="var(--color-muted)" />
          <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
            {location.pathname.startsWith('/venue') ? 'Venue' : 'Your city'}
          </span>
        </div>
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
