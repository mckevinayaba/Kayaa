import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  suburb: string;
  /** Compact 36px pill for the utility strip */
  compact?: boolean;
}

export function SafetyAlertOptIn({ suburb, compact }: Props) {
  const [optedIn,  setOptedIn]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [email,    setEmail]    = useState('');
  const [userId,   setUserId]   = useState<string | null>(null);

  // ── Load current state ────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserId(user.id);
      setEmail(user.email ?? '');

      const { data } = await supabase
        .from('neighbourhood_alert_opts')
        .select('opted_in')
        .eq('user_id', user.id)
        .ilike('suburb', suburb)
        .maybeSingle();

      setOptedIn(data?.opted_in ?? false);
      setLoading(false);
    }
    load();
  }, [suburb]);

  // ── Toggle ─────────────────────────────────────────────────────────────────

  async function toggle() {
    if (!userId || !email || saving) return;
    setSaving(true);

    const next = !optedIn;

    await supabase
      .from('neighbourhood_alert_opts')
      .upsert(
        { user_id: userId, suburb, email, opted_in: next },
        { onConflict: 'user_id,suburb' },
      );

    setOptedIn(next);
    setSaving(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading || !userId) return null;

  // ── Compact pill mode (36px, for utility strip) ──────────────────────────
  if (compact) {
    return (
      <div
        onClick={toggle}
        role="button"
        aria-pressed={optedIn}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          height: '36px', padding: '0 12px', flexShrink: 0,
          background: optedIn ? 'rgba(57,217,138,0.12)' : 'var(--color-surface)',
          border: `1px solid ${optedIn ? 'rgba(57,217,138,0.3)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '18px', cursor: saving ? 'default' : 'pointer',
          fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
          color: optedIn ? '#39D98A' : 'rgba(255,255,255,0.55)',
          WebkitTapHighlightColor: 'transparent',
          transition: 'all 0.2s',
        }}
      >
        {saving
          ? <Loader2 size={12} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          : <Bell size={12} color={optedIn ? '#39D98A' : 'rgba(255,255,255,0.4)'} style={{ flexShrink: 0 }} />
        }
        <span style={{ whiteSpace: 'nowrap' }}>
          {suburb} alerts
        </span>
        {/* Small dot indicator for on/off */}
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
          background: optedIn ? '#39D98A' : 'rgba(255,255,255,0.2)',
          transition: 'background 0.2s',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Full card mode ────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: optedIn ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${optedIn ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '14px',
        transition: 'all 0.2s',
        cursor: saving ? 'default' : 'pointer',
      }}
      onClick={toggle}
      role="button"
      aria-pressed={optedIn}
    >
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {optedIn
          ? <Bell size={18} color="#FBBF24" />
          : <BellOff size={18} color="rgba(255,255,255,0.3)" />
        }
        <div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600,
            fontSize: '14px',
            color: optedIn ? '#FBBF24' : 'rgba(255,255,255,0.7)',
          }}>
            {suburb} safety alerts
          </div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.35)',
            marginTop: '1px',
          }}>
            {optedIn
              ? `Email me when something happens in ${suburb}`
              : 'Get notified about safety posts near you'}
          </div>
        </div>
      </div>

      {/* Right — pill toggle */}
      {saving
        ? <Loader2 size={16} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
        : (
          <div style={{
            width: '40px',
            height: '22px',
            borderRadius: '11px',
            background: optedIn ? '#FBBF24' : 'rgba(255,255,255,0.12)',
            position: 'relative',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}>
            <div style={{
              position: 'absolute',
              top: '3px',
              left: optedIn ? '21px' : '3px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </div>
        )
      }
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
