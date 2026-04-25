import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [loading]);

  // Loading took too long — give up and send to login
  if (loading && timedOut) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '50vh', gap: '16px',
        background: 'var(--color-bg)',
      }}>
        <style>{`@keyframes prSpin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '3px solid rgba(57,217,138,0.2)',
          borderTopColor: '#39D98A',
          animation: 'prSpin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif' }}>
          Checking session…
        </span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
