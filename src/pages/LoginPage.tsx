import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
  const navigate = useNavigate();
  const { signIn, verify } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState(() => localStorage.getItem('kayaa_pending_email') ?? '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSendCode() {
    const trimmed = email.trim();
    if (!trimmed) { setError('Enter your email address'); return; }
    setLoading(true);
    setError('');
    const { error } = await signIn(trimmed);
    setLoading(false);
    if (error) { setError(error.message); return; }
    localStorage.setItem('kayaa_pending_email', trimmed);
    setStep('otp');
  }

  async function handleVerify() {
    if (otp.length < 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    setError('');
    const { error } = await verify(email.trim(), otp.trim());
    if (error) { setLoading(false); setError(error.message); return; }

    const venueId = localStorage.getItem('kayaa_venue_id');
    if (venueId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('venue_owners')
          .update({ user_id: user.id })
          .eq('venue_id', venueId)
          .is('user_id', null);
      }
      localStorage.removeItem('kayaa_venue_id');
    }
    localStorage.removeItem('kayaa_pending_email');

    setLoading(false);
    navigate('/dashboard');
  }

  return (
    <div style={{ padding: '40px 16px 100px', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px',
          color: 'var(--color-text)', marginBottom: '8px',
        }}>
          {step === 'email' ? 'Welcome back' : 'Check your email'}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6 }}>
          {step === 'email'
            ? 'Enter your email address to sign in'
            : `We sent a 6-digit code to ${email}`}
        </p>
      </div>

      {step === 'email' ? (
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '8px' }}>
            Your email address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="you@example.com"
            autoComplete="email"
            style={{ ...inputBase, fontSize: '15px', border: `1px solid ${error ? '#F87171' : 'var(--color-border)'}` }}
          />
          {error && <p style={{ fontSize: '12px', color: '#F87171', marginBottom: '12px' }}>{error}</p>}
          <button
            onClick={handleSendCode}
            disabled={loading}
            style={{
              width: '100%', minHeight: '52px',
              background: loading ? 'rgba(57,217,138,0.6)' : 'var(--color-accent)',
              color: '#000', border: 'none', borderRadius: '14px',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </div>
      ) : (
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '8px' }}>
            6-digit code
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
            placeholder="000000"
            style={{
              ...inputBase,
              fontSize: '24px', letterSpacing: '0.3em',
              fontFamily: 'Syne, sans-serif', fontWeight: 700,
              textAlign: 'center', minHeight: '60px',
              border: `1px solid ${error ? '#F87171' : 'var(--color-border)'}`,
            }}
          />
          {error && <p style={{ fontSize: '12px', color: '#F87171', marginBottom: '12px' }}>{error}</p>}
          <button
            onClick={handleVerify}
            disabled={loading}
            style={{
              width: '100%', minHeight: '52px',
              background: loading ? 'rgba(57,217,138,0.6)' : 'var(--color-accent)',
              color: '#000', border: 'none', borderRadius: '14px',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
              cursor: loading ? 'default' : 'pointer',
              marginBottom: '12px',
            }}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
          <button
            onClick={() => { setStep('email'); setOtp(''); setError(''); }}
            style={{
              width: '100%', minHeight: '44px',
              background: 'transparent', border: 'none',
              color: 'var(--color-muted)', fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            }}
          >
            <ArrowLeft size={14} />
            Use a different email
          </button>
        </div>
      )}
    </div>
  );
}
