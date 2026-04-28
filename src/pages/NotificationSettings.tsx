/**
 * Notification Settings — toggle preferences stored in localStorage.
 * No Supabase auth required.
 *
 * Saved key: "kayaa_notifications"
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';

// ── Types + localStorage helpers ──────────────────────────────────────────────

export interface NotificationPrefs {
  checkin_alerts:  boolean;
  post_replies:    boolean;
  new_places:      boolean;
  nearby_activity: boolean;
  load_shedding:   boolean;
  safety_alerts:   boolean;
}

const NOTIF_KEY = 'kayaa_notifications';

const DEFAULT_NOTIFS: NotificationPrefs = {
  checkin_alerts:  true,
  post_replies:    true,
  new_places:      true,
  nearby_activity: false,
  load_shedding:   true,
  safety_alerts:   true,
};

export function getNotificationPrefs(): NotificationPrefs {
  try {
    return { ...DEFAULT_NOTIFS, ...JSON.parse(localStorage.getItem(NOTIF_KEY) ?? '{}') } as NotificationPrefs;
  } catch { return DEFAULT_NOTIFS; }
}

function saveNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
}

// ── Toggle component ──────────────────────────────────────────────────────────

function ToggleRow({
  title, description, value, onChange, highlight = false,
}: {
  title:       string;
  description: string;
  value:       boolean;
  onChange:    (v: boolean) => void;
  highlight?:  boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
      padding: '14px 16px', borderRadius: '14px',
      background: highlight ? 'rgba(57,217,138,0.06)' : '#161B22',
      border: `1px solid ${highlight ? 'rgba(57,217,138,0.2)' : 'rgba(255,255,255,0.07)'}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px',
          color: highlight ? '#39D98A' : '#fff',
          marginBottom: '3px',
        }}>
          {title}
        </div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          {description}
        </div>
      </div>

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

// ── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
      color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: '10px', marginTop: '4px',
    }}>
      {children}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFS);

  useEffect(() => {
    setPrefs(getNotificationPrefs());
  }, []);

  function update(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveNotificationPrefs(next);
  }

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
          Notifications
        </h1>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>

        {/* Intro */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '14px',
        }}>
          <Bell size={18} color="rgba(255,255,255,0.4)" />
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Only useful, no-spam notifications
          </p>
        </div>

        {/* ── Utility section ──────────────────────────────────────────────── */}
        <SectionLabel>Utility (Recommended)</SectionLabel>

        <ToggleRow
          title="⚡ Load shedding alerts"
          description="Get notified 30 minutes before load shedding in your area"
          value={prefs.load_shedding}
          onChange={v => update('load_shedding', v)}
          highlight
        />
        <ToggleRow
          title="🚨 Safety alerts"
          description="Important community safety updates near you"
          value={prefs.safety_alerts}
          onChange={v => update('safety_alerts', v)}
          highlight
        />
        <ToggleRow
          title="📍 Your regulars are quiet"
          description="When your favourite places aren't as busy as usual"
          value={prefs.nearby_activity}
          onChange={v => update('nearby_activity', v)}
          highlight
        />

        {/* ── Social section ────────────────────────────────────────────────── */}
        <SectionLabel style={{ marginTop: '16px' } as React.CSSProperties}>Social</SectionLabel>

        <ToggleRow
          title="Check-ins from neighbours"
          description="When someone near you checks in to a place"
          value={prefs.checkin_alerts}
          onChange={v => update('checkin_alerts', v)}
        />
        <ToggleRow
          title="Post replies"
          description="When someone replies to your Board posts"
          value={prefs.post_replies}
          onChange={v => update('post_replies', v)}
        />
        <ToggleRow
          title="New places nearby"
          description="When a new place joins Kayaa in your neighbourhood"
          value={prefs.new_places}
          onChange={v => update('new_places', v)}
        />

        {/* Note */}
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.6, marginTop: '12px' }}>
          Push notifications require browser permission. Preferences saved locally.
        </p>
      </div>
    </div>
  );
}
