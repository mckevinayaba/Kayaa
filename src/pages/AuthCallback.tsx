import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already signed in (session may already be set by
    // Supabase's detectSessionInUrl before this component mounts)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/feed', { replace: true });
        return;
      }
    });

    // Listen for the SIGNED_IN event in case the PKCE exchange
    // completes slightly after mount
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate('/feed', { replace: true });
        }
        if (event === 'SIGNED_OUT') {
          navigate('/welcome', { replace: true });
        }
      });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div style={{
      background: '#0D1117',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
    }}>
      <div style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 800,
        color: '#39D98A',
        fontSize: '28px',
        letterSpacing: '-1px',
      }}>
        kayaa
      </div>
      <div style={{
        color: '#9CA3AF',
        fontSize: '14px',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        Signing you in…
      </div>
      {/* Spinner */}
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: '2px solid rgba(57,217,138,0.15)',
        borderTopColor: '#39D98A',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
