import { Outlet } from 'react-router-dom';

/**
 * Bare layout for auth screens (welcome, setup).
 * No top nav, no bottom nav, no location pill.
 * The only chrome is the dark background.
 */
export default function AuthLayout() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0D1117',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Outlet />
      </div>
    </div>
  );
}
