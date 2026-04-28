/**
 * Privacy Settings — toggle visibility preferences, stored in localStorage.
 * Saved key: "kayaa_privacy"
 * Shape: { showCheckins, showRegulars, showPosts, allowMessages }
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';

// ── Types + localStorage helpers ──────────────────────────────────────────────

export interface PrivacyPrefs {
  showCheckins:   boolean;
  showRegulars:   boolean;
  showPosts:      boolean;
  allowMessages:  boolean;
}

const PRIVACY_KEY = 'kayaa_privacy';

const DEFAULT_PRIVACY: PrivacyPrefs = {
  showCheckins:  true,
  showRegulars:  true,
  showPosts:     true,
  allowMessages: true,
};

export function getPrivacyPrefs(): PrivacyPrefs {
  try {
    return { ...DEFAULT_PRIVACY, ...JSON.parse(localStorage.getItem(PRIVACY_KEY) ?? '{}') } as PrivacyPrefs;
  } catch { return DEFAULT_PRIVACY; }
}

function savePrivacyPrefs(prefs: PrivacyPrefs) {
  localStorage.setItem(PRIVACY_KEY, JSON.stringify(prefs));
}

// ── Toggle component ──────────────────────────────────────────────────────────

function ToggleRow({
  title, description, value, onChange,
}: {
  title:       string;
  description: string;
  value:       boolean;
  onChange:    (v: boolean) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
      padding: '14px 16px', background: '#161B22',
      border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '3px' }}>
          {title}
        </div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          {description}
        </div>
      </div>

      {/* iOS-style toggle */}
      <button
        onClick={() => onChange(!value)}
        style={{
          position: 'relative', flexShrink: 0,
          width: '48px', height: '26px', borderRadius: '13px',
          background: value ? '#39D98A' : 'rgba(255,255,255,0.15)',
          border: 'none', cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: '3px',
          left: value ? '25px' : '3px',
          width: '20px', height: '20px', borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacySettings() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<PrivacyPrefs>(DEFAULT_PRIVACY);

  useEffect(() => {
    setPrefs(getPrivacyPrefs());
  }, []);

  function update(key: keyof PrivacyPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrivacyPrefs(next);
  }

  const rows: { key: keyof PrivacyPrefs; title: string; description: string }[] = [
    {
      key:         'showCheckins',
      title:       'Show my check-ins',
      description: "Let neighbours see places you've visited",
    },
    {
      key:         'showRegulars',
      title:       'Show my regulars',
      description: 'Display your favourite places on your profile',
    },
    {
      key:         'showPosts',
      title:       'Show my Board posts',
      description: 'Make your Board posts visible to everyone',
    },
    {
      key:         'allowMessages',
      title:       'Allow direct messages',
      description: 'Let other Kayaa users message you',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} color="#fff" />
        </button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff', margin: 0 }}>
          Privacy Settings
        </h1>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Intro */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.15)',
          borderRadius: '12px', padding: '14px 16px',
        }}>
          <Lock size={18} color="#39D98A" style={{ flexShrink: 0, marginTop: '1px' } as React.CSSProperties} />
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
            Control what others can see. Changes save instantly and are stored on this device.
          </p>
        </div>

        {/* Toggle rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rows.map(r => (
            <ToggleRow
              key={r.key}
              title={r.title}
              description={r.description}
              value={prefs[r.key]}
              onChange={v => update(r.key, v)}
            />
          ))}
        </div>

        {/* Note */}
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.6 }}>
          Kayaa is anonymous by default. These settings apply when you choose to share your name.
        </p>
      </div>
    </div>
  );
}
