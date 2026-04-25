import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const inputBase: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-surface)',
  borderRadius: '14px',
  padding: '15px 16px',
  color: 'var(--color-text)',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  minHeight: '52px',
  marginBottom: '8px',
};

export default function LoginPage() {
  const { signIn } = useAuth();
  const [step,    setStep]    = useState<'email' | 'sent'>('email');
  const [email,   setEmail]   = useState(() => localStorage.getItem('kayaa_pending_email') ?? '');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSend() {
    const trimmed = email.trim();
    if (!trimmed) { setError('Enter your email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    const { error: authError } = await signIn(trimmed);
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    localStorage.setItem('kayaa_pending_email', trimmed);
    setStep('sent');
  }

  // ── Confirmation screen ───────────────────────────────────────────────────

  if (step === 'sent') {
    return (
      <div style={{ padding: '40px 16px 100px', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>

        {/* Envelope icon */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(57,217,138,0.1)',
          border: '2px solid var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: '36px',
        }}>
          ✉️
        </div>

        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px',
          color: 'var(--color-text)', marginBottom: '10px',
        }}>
          Check your email
        </h1>

        <p style={{
          fontSize: '15px', color: 'var(--color-muted)',
          lineHeight: 1.65, marginBottom: '6px',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          We sent a sign-in link to
        </p>
        <p style={{
          fontSize: '15px', fontWeight: 700,
          color: 'var(--color-text)', marginBottom: '20px',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {email}
        </p>

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '14px', padding: '16px',
          marginBottom: '28px',
          textAlign: 'left',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.7, fontFamily: 'DM Sans, sans-serif' }}>
            <div style={{ marginBottom: '6px' }}>
              1. Open the email from Kayaa
            </div>
            <div style={{ marginBottom: '6px' }}>
              2. Tap <strong style={{ color: 'var(--color-text)' }}>"Sign in to Kayaa"</strong>
            </div>
            <div>
              3. You'll be signed in automatically ✓
            </div>
          </div>
          <div style={{
            marginTop: '12px', paddingTop: '12px',
            borderTop: '1px solid var(--color-border)',
            fontSize: '12px', color: 'var(--color-muted)',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            ⏳ The link expires in 1 hour
          </div>
        </div>

        {/* Open Gmail shortcut */}
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', minHeight: '52px',
            background: 'var(--color-accent)', color: '#000',
            border: 'none', borderRadius: '14px',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
            cursor: 'pointer', textDecoration: 'none',
            marginBottom: '16px',
            boxSizing: 'border-box',
          } as React.CSSProperties}
        >
          Open Gmail
        </a>

        {/* Reset link */}
        <button
          onClick={() => {
            setStep('email');
            setEmail('');
            setError('');
            localStorage.removeItem('kayaa_pending_email');
          }}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--color-muted)', fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
          }}
        >
          ← Use a different email
        </button>
      </div>
    );
  }

  // ── Email input step ──────────────────────────────────────────────────────

  return (
    <div style={{ padding: '40px 16px 100px', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px',
          color: 'var(--color-text)', marginBottom: '8px',
        }}>
          Sign in to Kayaa
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif' }}>
          We'll send a sign-in link to your email
        </p>
      </div>

      <label style={{
        display: 'block', fontSize: '13px', fontWeight: 600,
        color: 'var(--color-muted)', marginBottom: '8px',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        Your email address
      </label>
      <input
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError(''); }}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        placeholder="you@example.com"
        autoComplete="email"
        style={{
          ...inputBase,
          fontSize: '15px',
          border: `1px solid ${error ? '#F87171' : 'var(--color-border)'}`,
        }}
      />

      {error && (
        <p style={{ fontSize: '12px', color: '#F87171', marginBottom: '12px', fontFamily: 'DM Sans, sans-serif' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSend}
        disabled={loading}
        style={{
          width: '100%', minHeight: '52px',
          background: loading ? 'rgba(57,217,138,0.6)' : 'var(--color-accent)',
          color: '#000', border: 'none', borderRadius: '14px',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
          cursor: loading ? 'default' : 'pointer',
          marginTop: '4px',
        }}
      >
        {loading ? 'Sending…' : 'Send sign-in link'}
      </button>
    </div>
  );
}
