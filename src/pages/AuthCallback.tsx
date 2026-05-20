import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Read error params Supabase puts in the URL when the code exchange fails.
    // They appear in BOTH the query string and the hash — check both.
    const params  = new URLSearchParams(window.location.search);
    const hParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const error = params.get('error') || hParams.get('error');
    const desc  = params.get('error_description') || hParams.get('error_description');

    if (error) {
      const msg = desc
        ? decodeURIComponent(desc.replace(/\+/g, ' '))
        : error;
      setErrorMsg(msg);
      return; // Don't try to exchange — there is no code
    }

    // No error — check for an existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/feed', { replace: true });
        return;
      }
    });

    // Listen for SIGNED_IN in case the PKCE exchange finishes after mount
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

  // ── Error state ──────────────────────────────────────────────────────────────
  if (errorMsg) {
    return (
      <div style={{
        background: '#0D1117', minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', textAlign: 'center', gap: '16px',
      }}>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          color: '#39D98A', fontSize: '28px', letterSpacing: '-1px',
        }}>
          kayaa
        </div>

        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'rgba(248,113,113,0.1)', border: '1.5px solid rgba(248,113,113,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px',
        }}>
          ⚠️
        </div>

        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: '18px', color: '#F0F6FC', margin: 0,
        }}>
          Sign-in failed
        </h2>

        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
          maxWidth: '300px', margin: 0,
        }}>
          {errorMsg}
        </p>

        <button
          onClick={() => navigate('/welcome', { replace: true })}
          style={{
            marginTop: '8px',
            background: '#39D98A', color: '#0D1117',
            border: 'none', borderRadius: '12px',
            padding: '14px 32px',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700,
            fontSize: '15px', cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: '#0D1117', height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '16px',
    }}>
      <div style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800,
        color: '#39D98A', fontSize: '28px', letterSpacing: '-1px',
      }}>
        kayaa
      </div>
      <div style={{
        color: '#9CA3AF', fontSize: '14px',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        Signing you in…
      </div>
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%',
        border: '2px solid rgba(57,217,138,0.15)',
        borderTopColor: '#39D98A',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
