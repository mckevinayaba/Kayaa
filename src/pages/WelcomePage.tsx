import { useState, useEffect } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Google "G" icon ───────────────────────────────────────────────────────────
function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57C21.36 18.45 22.56 15.57 22.56 12.25z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ── Business grid visual ──────────────────────────────────────────────────────
const BIZ_GRID = [
  { emoji: '✂️', label: 'Haircut'  },
  { emoji: '🍖', label: 'Food'     },
  { emoji: '🏪', label: 'Spaza'    },
  { emoji: '⛪', label: 'Church'   },
  { emoji: '🚗', label: 'Carwash'  },
  { emoji: '🏥', label: 'Clinic'   },
];

// ── Value strip ───────────────────────────────────────────────────────────────
const VALUES = [
  { icon: '📍', label: 'Nearby businesses' },
  { icon: '📢', label: 'Local updates'     },
  { icon: '💼', label: 'Jobs & skills'     },
  { icon: '🚨', label: 'Safety alerts'     },
];

// ── Phone normaliser ──────────────────────────────────────────────────────────
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.trim().startsWith('+')) return raw.replace(/\s/g, '');
  if (digits.startsWith('27') && digits.length >= 11) return `+${digits}`;
  if (digits.startsWith('0')) return `+27${digits.slice(1)}`;
  return `+27${digits}`;
}

// ── Friendly error messages ───────────────────────────────────────────────────
function friendlyError(raw: string): string {
  const l = raw.toLowerCase();
  if (l.includes('rate') || l.includes('limit') || l.includes('too many'))
    return 'Too many requests — wait a minute, then try again.';
  if (l.includes('invalid') && l.includes('phone'))
    return 'Check your number and try again.';
  if (l.includes('otp') || l.includes('token') || l.includes('expired'))
    return "That code didn't work. Try again or send a new one.";
  if (l.includes('phone') || l.includes('sms') || l.includes('provider'))
    return 'Phone sign-in is coming soon — please use Google or email for now.';
  if (l.includes('invalid') || l.includes('format'))
    return 'Check your email address and try again.';
  return raw;
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.22)' }}>or</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type Step = 'welcome' | 'phone' | 'otp' | 'email' | 'sent';

export default function WelcomePage() {
  const { signIn, signInWithGoogle, signInWithPhone, verifyOTP, user } = useAuth();
  const navigate = useNavigate();

  // All hooks before any conditional return
  const [step,          setStep]          = useState<Step>('welcome');
  const [email,         setEmail]         = useState('');
  const [phone,         setPhone]         = useState('');
  const [otp,           setOtp]           = useState('');
  const [emailLoading,  setEmailLoading]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneLoading,  setPhoneLoading]  = useState(false);
  const [otpLoading,    setOtpLoading]    = useState(false);
  const [error,         setError]         = useState('');
  const [countdown,     setCountdown]     = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  if (user) return <Navigate to="/feed" replace />;

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleGoogle() {
    setGoogleLoading(true); setError('');
    const { error: e } = await signInWithGoogle();
    if (e) { setError(friendlyError(e.message)); setGoogleLoading(false); }
  }

  async function handlePhoneSend() {
    const normalised = normalisePhone(phone);
    if (normalised.length < 10) { setError('Enter a valid phone number.'); return; }
    setPhoneLoading(true); setError('');
    const { error: e } = await signInWithPhone(normalised);
    setPhoneLoading(false);
    if (e) { setError(friendlyError(e.message)); return; }
    setStep('otp');
    setCountdown(30);
  }

  async function handleOTPVerify() {
    const trimmed = otp.trim();
    if (trimmed.length < 6) { setError('Enter the 6-digit code from your SMS.'); return; }
    setOtpLoading(true); setError('');
    const { error: e } = await verifyOTP(normalisePhone(phone), trimmed);
    setOtpLoading(false);
    if (e) { setError(friendlyError(e.message)); return; }
    navigate('/feed', { replace: true });
  }

  async function handleOTPResend() {
    if (countdown > 0) return;
    setError('');
    const { error: e } = await signInWithPhone(normalisePhone(phone));
    if (e) { setError(friendlyError(e.message)); return; }
    setCountdown(30);
    setOtp('');
  }

  async function handleEmailSend() {
    const trimmed = email.trim();
    if (!trimmed) { setError('Enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError('Enter a valid email address.'); return; }
    setEmailLoading(true); setError('');
    const { error: e } = await signIn(trimmed);
    setEmailLoading(false);
    if (e) { setError(friendlyError(e.message)); return; }
    localStorage.setItem('kayaa_pending_email', trimmed);
    setStep('sent');
  }

  // ── Email sent screen ──────────────────────────────────────────────────────
  if (step === 'sent') {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px 60px', textAlign: 'center',
      }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'rgba(57,217,138,0.1)', border: '2px solid #39D98A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px', fontSize: '32px',
        }}>✉️</div>

        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', color: '#F0F6FC', marginBottom: '8px', lineHeight: 1.2 }}>
          Check your inbox
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.52)', lineHeight: 1.6, marginBottom: '4px' }}>
          We sent a sign-in link to
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700, color: '#F0F6FC', marginBottom: '28px' }}>
          {email}
        </p>

        <div style={{
          background: '#161B22', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '16px 20px', marginBottom: '28px', width: '100%', textAlign: 'left',
        }}>
          {['Open the email from Kayaa', 'Tap "Sign in to Kayaa"', "You're in ✓"].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: i < 2 ? '10px' : 0 }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'rgba(57,217,138,0.15)', border: '1px solid rgba(57,217,138,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#39D98A',
                fontFamily: 'DM Sans, sans-serif',
              }}>{i + 1}</div>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, paddingTop: '2px' }}>{text}</span>
            </div>
          ))}
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans, sans-serif' }}>
            ⏳ Link expires in 1 hour
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', width: '100%' }}>
          <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '52px', background: '#39D98A', color: '#0D1117',
            borderRadius: '14px', textDecoration: 'none',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '15px',
          }}>Open Gmail</a>
          <a href="https://outlook.live.com" target="_blank" rel="noopener noreferrer" style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '52px', background: '#161B22', color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px', textDecoration: 'none',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '15px',
          }}>Open Outlook</a>
        </div>

        <button onClick={() => { setStep('welcome'); setEmail(''); setError(''); localStorage.removeItem('kayaa_pending_email'); }}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.38)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
          ← Use a different method
        </button>
      </div>
    );
  }

  // ── OTP verification screen ────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        <div style={{ paddingTop: '20px' }}>
          <button onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
            ← Back
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '48px', paddingBottom: '32px', textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(57,217,138,0.1)', border: '1.5px solid rgba(57,217,138,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', marginBottom: '20px',
          }}>💬</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '26px', color: '#F0F6FC', marginBottom: '8px', lineHeight: 1.2 }}>
            Enter your code
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: '280px' }}>
            We sent a 6-digit code to <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{normalisePhone(phone)}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleOTPVerify()}
            placeholder="000000"
            autoFocus
            style={{
              width: '100%', minHeight: '60px', boxSizing: 'border-box',
              background: '#161B22', border: `1.5px solid ${error ? '#F87171' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '14px', padding: '0 20px',
              color: '#F0F6FC', fontSize: '28px', fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif', textAlign: 'center',
              letterSpacing: '0.25em', outline: 'none',
            }}
          />

          {error && (
            <p style={{ fontSize: '13px', color: '#F87171', fontFamily: 'DM Sans, sans-serif', margin: '0 4px', textAlign: 'center' }}>{error}</p>
          )}

          <button
            onClick={handleOTPVerify}
            disabled={otpLoading}
            style={{
              width: '100%', minHeight: '56px',
              background: otpLoading ? 'rgba(57,217,138,0.6)' : '#39D98A',
              color: '#0D1117', border: 'none', borderRadius: '14px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '17px',
              cursor: otpLoading ? 'default' : 'pointer',
            }}
          >
            {otpLoading ? 'Verifying…' : 'Confirm'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            {countdown > 0 ? (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
                Resend code in {countdown}s
              </p>
            ) : (
              <button
                onClick={handleOTPResend}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#39D98A', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
              >
                Send a new code
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: '40px', textAlign: 'center', paddingTop: '32px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
            Free to join. No card needed. No password needed.
          </p>
        </div>
      </div>
    );
  }

  // ── Main welcome screen ────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px', paddingBottom: '40px' }}>

      {/* Back */}
      <div style={{ paddingTop: '20px' }}>
        <Link to="/about" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
          color: 'rgba(255,255,255,0.38)', textDecoration: 'none',
        }}>
          ← Back
        </Link>
      </div>

      {/* Hero */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: '32px', textAlign: 'center',
      }}>
        {/* Wordmark */}
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '36px', color: '#39D98A',
          letterSpacing: '-1px', lineHeight: 1, marginBottom: '28px',
        }}>
          kayaa
        </div>

        {/* Business grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px', width: '100%', maxWidth: '264px',
          margin: '0 auto 28px',
        }}>
          {BIZ_GRID.map(({ emoji, label }) => (
            <div key={label} style={{
              background: '#161B22', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px', padding: '12px 6px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            }}>
              <span style={{ fontSize: '22px', lineHeight: 1 }}>{emoji}</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.01em' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '26px', color: '#F0F6FC',
          lineHeight: 1.25, marginBottom: '10px',
          maxWidth: '300px',
        }}>
          Your neighbourhood's businesses, all here.
        </h1>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '15px',
          color: 'rgba(255,255,255,0.5)', lineHeight: 1.65,
          maxWidth: '290px', marginBottom: '24px',
        }}>
          Find nearby businesses, local updates, jobs, and safety in one place.
        </p>
      </div>

      {/* Value strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '6px', marginBottom: '20px',
      }}>
        {VALUES.map(({ icon, label }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#161B22', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px', padding: '10px 12px',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', lineHeight: 1.3 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Business owner callout */}
      <button
        onClick={() => navigate('/onboarding')}
        style={{
          width: '100%', padding: '16px 18px', marginBottom: '24px',
          background: 'rgba(57,217,138,0.06)',
          border: '1px solid rgba(57,217,138,0.2)',
          borderRadius: '14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '14px',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '26px', flexShrink: 0 }}>🏪</span>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#39D98A', lineHeight: 1.2, marginBottom: '3px' }}>
            Own a business?
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            Add it to Kayaa free. Help neighbours find and follow it.
          </div>
        </div>
      </button>

      {/* Auth section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Phone — primary */}
        {step === 'welcome' ? (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: '#161B22', border: '1.5px solid rgba(255,255,255,0.12)',
              borderRadius: '14px', overflow: 'hidden',
            }}>
              <div style={{
                padding: '0 14px', minHeight: '56px',
                display: 'flex', alignItems: 'center',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 600,
                color: 'rgba(255,255,255,0.6)', flexShrink: 0,
              }}>
                🇿🇦 +27
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePhoneSend()}
                placeholder="082 123 4567"
                style={{
                  flex: 1, minHeight: '56px', padding: '0 16px',
                  background: 'transparent', border: 'none', outline: 'none',
                  color: '#F0F6FC', fontSize: '16px',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </div>
            <button
              onClick={handlePhoneSend}
              disabled={phoneLoading}
              style={{
                width: '100%', minHeight: '52px', marginTop: '8px',
                background: phoneLoading ? 'rgba(57,217,138,0.6)' : '#39D98A',
                color: '#0D1117', border: 'none', borderRadius: '14px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '16px',
                cursor: phoneLoading ? 'default' : 'pointer',
              }}
            >
              {phoneLoading ? 'Sending…' : 'Send my code'}
            </button>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.28)', textAlign: 'center', margin: '5px 0 0' }}>
              We'll send a one-time code — no password needed
            </p>
          </div>
        ) : step === 'phone' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: '#161B22', border: `1.5px solid ${error ? '#F87171' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '14px', overflow: 'hidden',
            }}>
              <div style={{
                padding: '0 14px', minHeight: '56px',
                display: 'flex', alignItems: 'center',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 600,
                color: 'rgba(255,255,255,0.6)', flexShrink: 0,
              }}>
                🇿🇦 +27
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePhoneSend()}
                placeholder="082 123 4567"
                autoFocus
                style={{
                  flex: 1, minHeight: '56px', padding: '0 16px',
                  background: 'transparent', border: 'none', outline: 'none',
                  color: '#F0F6FC', fontSize: '16px', fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </div>
            {error && <p style={{ fontSize: '13px', color: '#F87171', fontFamily: 'DM Sans, sans-serif', margin: '0 4px' }}>{error}</p>}
            <button
              onClick={handlePhoneSend}
              disabled={phoneLoading}
              style={{
                width: '100%', minHeight: '52px',
                background: phoneLoading ? 'rgba(57,217,138,0.6)' : '#39D98A',
                color: '#0D1117', border: 'none', borderRadius: '14px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '16px',
                cursor: phoneLoading ? 'default' : 'pointer',
              }}
            >
              {phoneLoading ? 'Sending…' : 'Send my code'}
            </button>
            <button onClick={() => { setStep('welcome'); setPhone(''); setError(''); }}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', padding: '4px', alignSelf: 'center' }}>
              ← Back
            </button>
          </div>
        ) : null}

        <Divider />

        {/* Google */}
        <div>
          <button
            onClick={handleGoogle}
            disabled={googleLoading || phoneLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', width: '100%', minHeight: '52px',
              background: '#ffffff', color: '#1a1a1a',
              border: 'none', borderRadius: '14px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '15px',
              cursor: googleLoading ? 'default' : 'pointer',
              opacity: googleLoading ? 0.7 : 1,
            }}
          >
            {googleLoading ? <span style={{ fontSize: '14px', color: '#666' }}>Connecting…</span> : <><GoogleG />Continue with Google</>}
          </button>
          {!googleLoading && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(57,217,138,0.7)', textAlign: 'center', margin: '5px 0 0', fontWeight: 600 }}>
              ⚡ One tap — no password, no waiting
            </p>
          )}
        </div>

        <Divider />

        {/* Email — fallback */}
        {step === 'welcome' ? (
          <button
            onClick={() => { setStep('email'); setError(''); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', width: '100%', minHeight: '48px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '14px', color: 'rgba(255,255,255,0.4)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ✉️ Continue with email
          </button>
        ) : step === 'email' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleEmailSend()}
              placeholder="your@email.com"
              autoFocus
              autoComplete="email"
              style={{
                width: '100%', minHeight: '54px', boxSizing: 'border-box',
                background: '#161B22',
                border: `1px solid ${error ? '#F87171' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '14px', padding: '0 16px',
                color: '#F0F6FC', fontSize: '16px',
                fontFamily: 'DM Sans, sans-serif', outline: 'none',
              }}
            />
            {error && <p style={{ fontSize: '13px', color: '#F87171', fontFamily: 'DM Sans, sans-serif', margin: '0 4px' }}>{error}</p>}
            <button
              onClick={handleEmailSend}
              disabled={emailLoading}
              style={{
                width: '100%', minHeight: '52px',
                background: emailLoading ? 'rgba(57,217,138,0.6)' : '#39D98A',
                color: '#0D1117', border: 'none', borderRadius: '14px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '16px',
                cursor: emailLoading ? 'default' : 'pointer',
              }}
            >
              {emailLoading ? 'Sending…' : 'Send sign-in link'}
            </button>
            <button onClick={() => { setStep('welcome'); setEmail(''); setError(''); }}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', padding: '4px', alignSelf: 'center' }}>
              ← Back
            </button>
          </div>
        ) : null}

        {/* Error for welcome step */}
        {error && step === 'welcome' && (
          <p style={{ fontSize: '13px', color: '#F87171', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>{error}</p>
        )}
      </div>

      {/* Trust footer */}
      <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>
          Free to join. No card needed. No password needed.
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.18)', lineHeight: 1.5 }}>
          By continuing you agree to Kayaa's Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
