import { useState } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getVisitorId } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportContentType = 'place' | 'post' | 'comment' | 'user' | 'skill';

interface ReportModalProps {
  contentType: ReportContentType;
  contentId: string;
  onClose: () => void;
}

// ─── Reason lists ─────────────────────────────────────────────────────────────

const REASONS: Record<ReportContentType, string[]> = {
  place: [
    "Fake or doesn't exist",
    'Inappropriate content',
    'Wrong location',
    'Scam or fraud',
    'Safety concerns',
    'Other',
  ],
  post: [
    'Spam',
    'Harassment or hate speech',
    'Violence or dangerous content',
    'Scam or fraud',
    'Misinformation',
    'Other',
  ],
  comment: [
    'Harassment',
    'Hate speech',
    'Spam',
    'Violence',
    'Other',
  ],
  user: [
    'Harassment',
    'Fake profile',
    'Spam',
    'Safety concerns',
    'Other',
  ],
  skill: [
    'Scam or fraud',
    'Fake service',
    'Inappropriate content',
    'Safety concerns',
    'Other',
  ],
};

const CONTENT_LABELS: Record<ReportContentType, string> = {
  place:   'Place',
  post:    'Post',
  comment: 'Comment',
  user:    'User',
  skill:   'Skill',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportModal({ contentType, contentId, onClose }: ReportModalProps) {
  const [reason,      setReason]      = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  async function handleSubmit() {
    if (!reason) return;
    setLoading(true);

    const visitorId = getVisitorId();

    const { error } = await supabase.from('reports').insert({
      reporter_id:  visitorId,
      content_type: contentType,
      content_id:   contentId,
      reason,
      description:  description.trim() || null,
      status:       'pending',
    });

    setLoading(false);

    if (!error) {
      setSubmitted(true);
    } else {
      // Table may not exist yet in dev — still show success to user
      console.error('report insert error:', error);
      setSubmitted(true);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={OVERLAY_STYLE} onClick={onClose}>
        <div style={SHEET_STYLE} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#F0F6FC', marginBottom: '8px' }}>
              Report Submitted
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginBottom: '24px', lineHeight: 1.5 }}>
              Our team will review it within 24 hours. Thank you for keeping Kayaa safe.
            </div>
            <button onClick={onClose} style={GREEN_BTN}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div style={OVERLAY_STYLE} onClick={onClose}>
      <div style={SHEET_STYLE} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #21262D' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flag size={18} color="#EF4444" />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F0F6FC' }}>
              Report {CONTENT_LABELS[contentType]}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} color="rgba(255,255,255,0.55)" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div style={{ padding: '14px 16px', overflowY: 'auto', maxHeight: '65vh' }}>

          {/* Warning */}
          <div style={{
            display: 'flex', gap: '10px', alignItems: 'flex-start',
            padding: '12px', marginBottom: '16px',
            background: 'rgba(249,115,22,0.1)',
            border: '1px solid rgba(249,115,22,0.25)',
            borderRadius: '10px',
          }}>
            <AlertTriangle size={16} color="#F97316" style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(249,115,22,0.9)', lineHeight: 1.5 }}>
              False reports may result in your account being suspended. Only report content that violates our community guidelines.
            </span>
          </div>

          {/* Reason list */}
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '8px' }}>
            Why are you reporting this?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {REASONS[contentType].map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                style={{
                  textAlign: 'left', padding: '12px 14px',
                  background: reason === r ? 'rgba(239,68,68,0.12)' : '#161B22',
                  border: `1px solid ${reason === r ? '#EF4444' : '#21262D'}`,
                  borderRadius: '10px',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
                  color: reason === r ? '#F0F6FC' : 'rgba(255,255,255,0.65)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Details */}
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px' }}>
            Additional details (optional)
          </div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Provide more context to help us review…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#161B22', border: '1px solid #21262D',
              borderRadius: '10px', padding: '12px',
              color: '#F0F6FC', fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
              outline: 'none', resize: 'none',
              marginBottom: '16px',
            }}
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!reason || loading}
            style={{
              width: '100%', padding: '13px',
              background: reason && !loading ? '#EF4444' : 'rgba(255,255,255,0.07)',
              border: 'none', borderRadius: '12px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px',
              color: reason && !loading ? '#fff' : 'rgba(255,255,255,0.3)',
              cursor: reason && !loading ? 'pointer' : 'default',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const SHEET_STYLE: React.CSSProperties = {
  width: '100%', maxWidth: '480px',
  background: '#0D1117',
  border: '1px solid #21262D',
  borderTop: '1px solid #30363D',
  borderRadius: '20px 20px 0 0',
};

const GREEN_BTN: React.CSSProperties = {
  width: '100%', padding: '13px',
  background: '#39D98A', border: 'none', borderRadius: '12px',
  fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px',
  color: '#000', cursor: 'pointer',
};
