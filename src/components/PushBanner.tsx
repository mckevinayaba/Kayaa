// ─────────────────────────────────────────────────────────────────────────────
// PushBanner — calm, neighbourhood-specific push permission prompt.
//
// Rules:
//  - Only renders when neighbourhood is known (displaySuburb non-empty)
//  - Only renders when the browser supports push (isPushSupported)
//  - Never shows while neighbourhood is still detecting
//  - Stays hidden if user said "Not now" (localStorage kayaa_push_dismissed)
//  - Stays hidden if already subscribed
//  - Appears with a short delay (2 s) so it doesn't feel like an ambush
//  - Only calls Notification.requestPermission() AFTER the user taps Allow
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNeighbourhood } from '../contexts/NeighbourhoodContext';
import {
  isPushSupported,
  getCurrentPermission,
  requestAndSubscribe,
  isAlreadySubscribed,
} from '../lib/push';

const DISMISSED_KEY = 'kayaa_push_dismissed';

export default function PushBanner() {
  const { displaySuburb, displayCity, isDetecting } = useNeighbourhood();
  const [visible,  setVisible]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);    // brief "thanks" state

  useEffect(() => {
    // Don't evaluate while neighbourhood is still resolving
    if (isDetecting) return;
    // Need a suburb to make the copy meaningful
    if (!displaySuburb) return;
    // Feature check
    if (!isPushSupported()) return;
    // Already granted or denied at OS level — don't bother showing banner
    const perm = getCurrentPermission();
    if (perm === 'denied') return;

    // Already dismissed this session or ever
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Check if already subscribed (async — this avoids the banner flash)
    isAlreadySubscribed().then((subscribed) => {
      if (!subscribed) {
        // Small delay so it doesn't feel like an ambush on page load
        setTimeout(() => setVisible(true), 2000);
      }
    });
  }, [isDetecting, displaySuburb]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  async function handleAllow() {
    setLoading(true);
    const result = await requestAndSubscribe(displaySuburb, displayCity);
    setLoading(false);

    if (result.ok) {
      setDone(true);
      setTimeout(() => setVisible(false), 2000);
    } else if (result.reason === 'permission_denied') {
      // User clicked "Block" in the native prompt — dismiss silently
      dismiss();
    } else {
      // Other error — dismiss so we don't irritate the user
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Enable neighbourhood alerts"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid rgba(57,217,138,0.25)',
        borderRadius: '14px',
        padding: '14px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        position: 'relative',
        animation: 'slideDown 0.25s ease',
      }}
    >
      {/* Icon */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Bell size={16} color="#39D98A" />
      </div>

      {done ? (
        /* ── Confirmation ── */
        <div style={{ flex: 1, paddingTop: '2px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#39D98A', margin: 0 }}>
            ✓ {displaySuburb} alerts on
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '3px 0 0' }}>
            We'll only ping you for things that matter.
          </p>
        </div>
      ) : (
        /* ── Prompt ── */
        <>
          <div style={{ flex: 1, paddingTop: '2px' }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.35 }}>
              Get {displaySuburb} alerts
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '3px 0 10px', lineHeight: 1.45 }}>
              Safety, outages, and important place updates — nothing noisy.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleAllow}
                disabled={loading}
                style={{
                  background: '#39D98A', color: '#0D1117', border: 'none',
                  borderRadius: '8px', padding: '7px 16px',
                  fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '12px',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? 'Enabling…' : 'Allow'}
              </button>
              <button
                onClick={dismiss}
                disabled={loading}
                style={{
                  background: 'transparent', color: 'rgba(255,255,255,0.45)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px', padding: '7px 14px',
                  fontFamily: 'Inter, sans-serif', fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Not now
              </button>
            </div>
          </div>

          {/* Close X */}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            style={{
              background: 'none', border: 'none', padding: '2px',
              cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
              flexShrink: 0, marginTop: '-2px',
            }}
          >
            <X size={14} />
          </button>
        </>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
