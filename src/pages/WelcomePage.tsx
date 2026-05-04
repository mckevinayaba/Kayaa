import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Google "G" icon (standard brand colours) ─────────────────────────────────
function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26
           1.37-1.04 2.53-2.21 3.31v2.77h3.57C21.36 18.45 22.56
           15.57 22.56 12.25z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23
           1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99
           20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43
           8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09
           14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6
           3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ── Email icon ────────────────────────────────────────────────────────────────
function EmailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

// ── Rate-limit friendly error text ────────────────────────────────────────────
function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('rate') || lower.includes('limit') || lower.includes('too many')) {
    return 'Too many requests — wait a minute, then try again.';
  }
  if (lower.includes('invalid') || lower.includes('format')) {
    return 'Check your email address and try again.';
  }
  return raw;
}

// ─────────────────────────────────────────────────────────────────────────────

type Step = 'welcome' | 'email' | 'sent';

export default function WelcomePage() {
  const { signIn, signInWithGoogle, user } = useAuth();

  // Already signed in → feed (setup guard will redirect to /setup if needed)
  if (user) return <Navigate to="/feed" replace />;

  const [step,          setStep]          = useState<Step>('welcome');
  const [email,         setEmail]         = useState('');
  const [emailLoading,  setEmailLoading]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState('');

  // ── Google handler ──────────────────────────────────────────────────────────
  async function handleGoogle() {
    setGoogleLoading(true);
    setError('');
    const { error: e } = await signInWithGoogle();
    if (e) {
      setError(friendlyError(e.message));
      setGoogleLoading(false);
    }
    // On success, Supabase redirects the browser — no further action needed here.
  }

  // ── Email send handler ──────────────────────────────────────────────────────
  async function handleSend() {
    const trimmed = email.trim();
    if (!trimmed) { setError('Enter your email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address');
      return;
    }
    setEmailLoading(true);
    setError('');
    const { error: e } = await signIn(trimmed);
    setEmailLoading(false);
    if (e) { setError(friendlyError(e.message)); return; }
    localStorage.setItem('kayaa_pending_email', trimmed);
    setStep('sent');
  }

  // ── Sent confirmation ───────────────────────────────────────────────────────
  if (step === 'sent') {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px 60px', textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(57,217,138,0.1)',
          border: '2px solid #39D98A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '28px', fontSize: '36px',
        }}>
          ✉️
        </div>

        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px',
          color: '#F0F6FC', marginBottom: '10px', lineHeight: 1.2,
        }}>
          Check your inbox
        </h1>

        <p style={{
          fontSize: '15px', color: 'rgba(255,255,255,0.52)',
          lineHeight: 1.65, marginBottom: '6px',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          We sent a sign-in link to
        </p>
        <p style={{
          fontSize: '15px', fontWeight: 700, color: '#F0F6FC',
          marginBottom: '28px', fontFamily: 'DM Sans, sans-serif',
        }}>
          {email}
        </p>

        {/* Steps */}
        <div style={{
          background: '#161B22', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '16px 20px',
          marginBottom: '28px', width: '100%', textAlign: 'left',
        }}>
          {[
            'Open the email from Kayaa',
            'Tap "Sign in to Kayaa"',
            "You're in ✓",
          ].map((text, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              marginBottom: i < 2 ? '10px' : 0,
            }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'rgba(57,217,138,0.15)',
                border: '1px solid rgba(57,217,138,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                fontSize: '11px', fontWeight: 700, color: '#39D98A',
                fontFamily: 'Syne, sans-serif',
              }}>
                {i + 1}
              </div>
              <span style={{
                fontSize: '14px', color: 'rgba(255,255,255,0.75)',
                fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, paddingTop: '2px',
              }}>
                {text}
              </span>
            </div>
          ))}
          <div style={{
            marginTop: '14px', paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: '12px', color: 'rgba(255,255,255,0.35)',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            ⏳ Link expires in 1 hour
          </div>
        </div>

        {/* Open Gmail */}
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', minHeight: '54px',
            background: '#39D98A', color: '#0D1117',
            borderRadius: '14px', textDecoration: 'none',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
            marginBottom: '16px', boxSizing: 'border-box',
          }}
        >
          Open Gmail
        </a>

        <button
          onClick={() => {
            setStep('welcome');
            setEmail('');
            setError('');
            localStorage.removeItem('kayaa_pending_email');
          }}
          style={{
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.45)', fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
          }}
        >
          ← Use a different method
        </button>
      </div>
    );
  }

  // ── Main welcome / email screen ─────────────────────────────────────────────
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '0 24px',
    }}>

      {/* Top — logo + headline */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: '72px', paddingBottom: '48px', textAlign: 'center',
      }}>
        {/* Wordmark */}
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '40px', color: '#39D98A',
          letterSpacing: '-1px', marginBottom: '36px',
          lineHeight: 1,
        }}>
          kayaa
        </div>

        {/* Pin icon */}
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'rgba(57,217,138,0.1)',
          border: '1.5px solid rgba(57,217,138,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', marginBottom: '24px',
        }}>
          📍
        </div>

        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '28px', color: '#F0F6FC',
          lineHeight: 1.2, marginBottom: '10px',
        }}>
          Join your neighbourhood
        </h1>
        <p style={{
          fontSize: '15px', color: 'rgba(255,255,255,0.52)',
          lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif',
          maxWidth: '300px',
        }}>
          See the places your area runs on.
        </p>
      </div>

      {/* Auth options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading || emailLoading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '10px', width: '100%', minHeight: '54px',
            background: '#ffffff', color: '#1a1a1a',
            border: 'none', borderRadius: '14px',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '16px',
            cursor: googleLoading ? 'default' : 'pointer',
            opacity: googleLoading ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {googleLoading ? (
            <span style={{ fontSize: '14px', color: '#666' }}>Connecting…</span>
          ) : (
            <>
              <GoogleG />
              Continue with Google
            </>
          )}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '4px 0',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{
            fontSize: '12px', color: 'rgba(255,255,255,0.3)',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          }}>
            or
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Email option */}
        {step === 'welcome' ? (
          <button
            onClick={() => { setStep('email'); setError(''); }}
            disabled={googleLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', width: '100%', minHeight: '54px',
              background: '#161B22',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              color: 'rgba(255,255,255,0.75)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '16px',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
          >
            <EmailIcon />
            Continue with email
          </button>
        ) : (
          /* Email input — inline expansion */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="your@email.com"
              autoFocus
              autoComplete="email"
              style={{
                width: '100%', minHeight: '54px',
                background: '#161B22',
                border: `1px solid ${error ? '#F87171' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '14px', padding: '0 16px',
                color: '#F0F6FC', fontSize: '16px',
                fontFamily: 'DM Sans, sans-serif',
                outline: 'none', boxSizing: 'border-box',
              }}
            />

            {error && (
              <p style={{
                fontSize: '13px', color: '#F87171',
                fontFamily: 'DM Sans, sans-serif', margin: '0 4px',
              }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSend}
              disabled={emailLoading}
              style={{
                width: '100%', minHeight: '54px',
                background: emailLoading ? 'rgba(57,217,138,0.6)' : '#39D98A',
                color: '#0D1117', border: 'none', borderRadius: '14px',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
                cursor: emailLoading ? 'default' : 'pointer',
              }}
            >
              {emailLoading ? 'Sending…' : 'Send sign-in link'}
            </button>

            <button
              onClick={() => { setStep('welcome'); setEmail(''); setError(''); }}
              style={{
                background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,0.35)', fontSize: '13px',
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                padding: '6px', alignSelf: 'center',
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* Error for Google step */}
        {error && step === 'welcome' && (
          <p style={{
            fontSize: '13px', color: '#F87171', textAlign: 'center',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            {error}
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 'auto', paddingTop: '32px', paddingBottom: '48px',
        textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        <p style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.3)',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          Free to join. No card needed.
        </p>
        <p style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.2)',
          fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5,
        }}>
          By continuing you agree to Kayaa's{' '}
          <Link
            to="/terms"
            style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' }}
          >
            Terms
          </Link>
          {' '}and{' '}
          <Link
            to="/privacy"
            style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' }}
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
