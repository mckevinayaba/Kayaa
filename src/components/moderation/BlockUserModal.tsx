import { useState } from 'react';
import { X, UserX, VolumeX } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getVisitorId } from '../../lib/api';

// ─── localStorage helpers ─────────────────────────────────────────────────────

const BLOCKED_KEY = 'kayaa_blocked_visitors';
const MUTED_KEY   = 'kayaa_muted_visitors';

function getStoredList(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]'); }
  catch { return []; }
}

function addToList(key: string, id: string): void {
  const list = getStoredList(key);
  if (!list.includes(id)) {
    localStorage.setItem(key, JSON.stringify([...list, id]));
  }
}

export function isBlocked(visitorId: string): boolean {
  return getStoredList(BLOCKED_KEY).includes(visitorId);
}

export function isMuted(visitorId: string): boolean {
  return getStoredList(MUTED_KEY).includes(visitorId);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlockUserModalProps {
  /** visitor_id of the person to block / mute */
  targetId:   string;
  targetName: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BlockUserModal({ targetId, targetName, onClose }: BlockUserModalProps) {
  const [action,  setAction]  = useState<'mute' | 'block'>('mute');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const myId = getVisitorId();

    if (action === 'block') {
      // Persist locally
      addToList(BLOCKED_KEY, targetId);
      // Also log to DB (best-effort)
      await supabase.from('blocked_visitors').upsert(
        { blocker_id: myId, blocked_id: targetId },
        { onConflict: 'blocker_id,blocked_id' }
      );
    } else {
      // Mute is local-only — no DB needed
      addToList(MUTED_KEY, targetId);
    }

    setLoading(false);
    setDone(true);
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={OVERLAY} onClick={onClose}>
        <div style={SHEET} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {action === 'block' ? '🚫' : '🔕'}
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px', color: '#F0F6FC', marginBottom: '8px' }}>
              {action === 'block' ? `${targetName} blocked` : `${targetName} muted`}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px', lineHeight: 1.5 }}>
              {action === 'block'
                ? "You won't see their posts or comments on Kayaa."
                : "Their posts and comments will be hidden from your view."}
            </div>
            <button onClick={onClose} style={GREEN_BTN}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={SHEET} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #21262D' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F0F6FC' }}>
            Manage User
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} color="rgba(255,255,255,0.55)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px 20px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px', lineHeight: 1.5 }}>
            Choose how you want to manage{' '}
            <strong style={{ color: '#F0F6FC' }}>{targetName}</strong>
          </p>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {/* Mute */}
            <button
              onClick={() => setAction('mute')}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '14px',
                background: action === 'mute' ? 'rgba(249,115,22,0.1)' : '#161B22',
                border: `1px solid ${action === 'mute' ? '#F97316' : '#21262D'}`,
                borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
            >
              <VolumeX size={20} color="#F97316" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '3px' }}>
                  Mute
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                  Hide their posts and comments. They can still see yours.
                </div>
              </div>
            </button>

            {/* Block */}
            <button
              onClick={() => setAction('block')}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '14px',
                background: action === 'block' ? 'rgba(239,68,68,0.1)' : '#161B22',
                border: `1px solid ${action === 'block' ? '#EF4444' : '#21262D'}`,
                borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
            >
              <UserX size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '3px' }}>
                  Block
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                  {"They can't see your content or contact you. They won't be notified."}
                </div>
              </div>
            </button>
          </div>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: loading
                ? 'rgba(255,255,255,0.07)'
                : action === 'block' ? '#EF4444' : '#F97316',
              border: 'none', borderRadius: '12px',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
              color: loading ? 'rgba(255,255,255,0.3)' : '#fff',
              cursor: loading ? 'default' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading
              ? 'Processing…'
              : action === 'block' ? `Block ${targetName}` : `Mute ${targetName}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const SHEET: React.CSSProperties = {
  width: '100%', maxWidth: '480px',
  background: '#0D1117',
  border: '1px solid #21262D',
  borderRadius: '20px 20px 0 0',
};

const GREEN_BTN: React.CSSProperties = {
  width: '100%', padding: '13px',
  background: '#39D98A', border: 'none', borderRadius: '12px',
  fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px',
  color: '#000', cursor: 'pointer',
};
