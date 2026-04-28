import { useState } from 'react';
import { Shield, ThumbsUp, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getVisitorId } from '../../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ratingColor(rating: number): string {
  if (rating >= 4) return '#39D98A';
  if (rating >= 3) return '#FBBF24';
  return '#F97316';
}

function ratingLabel(rating: number): string {
  if (rating >= 4.5) return 'Very Safe';
  if (rating >= 4)   return 'Safe';
  if (rating >= 3)   return 'Generally Safe';
  if (rating >= 2)   return 'Use Caution';
  return 'Safety Concerns';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SafetyRatingProps {
  placeId: string;
  rating: number;      // 1–5, can be fractional
  totalReviews: number;
  showDetails?: boolean;
}

// ─── Inline form for rating ───────────────────────────────────────────────────

function RateForm({ placeId, onDone }: { placeId: string; onDone: () => void }) {
  const [score, setScore] = useState(0);
  const [hover, setHover]  = useState(0);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!score) return;
    setSaving(true);
    const visitorId = getVisitorId();
    // Upsert: one rating per visitor per place
    await supabase.from('place_safety_ratings').upsert(
      { place_id: placeId, visitor_id: visitorId, score },
      { onConflict: 'place_id,visitor_id' }
    );
    setSaving(false);
    onDone();
  }

  return (
    <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>
        How safe do you feel here?
      </div>
      {/* Shield icons 1–5 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setScore(n)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            }}
          >
            <Shield
              size={24}
              color={(hover || score) >= n ? ratingColor(hover || score) : 'rgba(255,255,255,0.2)'}
              fill={(hover || score) >= n ? ratingColor(hover || score) : 'none'}
              strokeWidth={2}
            />
          </button>
        ))}
      </div>
      {score > 0 && (
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: ratingColor(score), marginBottom: '10px', fontWeight: 600 }}>
          {ratingLabel(score)}
        </div>
      )}
      <button
        onClick={submit}
        disabled={!score || saving}
        style={{
          width: '100%', padding: '9px',
          background: score ? '#39D98A' : 'rgba(255,255,255,0.08)',
          color: score ? '#000' : 'rgba(255,255,255,0.3)',
          border: 'none', borderRadius: '8px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
          cursor: score ? 'pointer' : 'default',
          transition: 'background 0.2s',
        }}
      >
        {saving ? 'Saving…' : 'Submit Rating'}
      </button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SafetyRating({ placeId, rating, totalReviews, showDetails = false }: SafetyRatingProps) {
  const [showForm, setShowForm] = useState(false);
  const color = ratingColor(rating);

  if (!showDetails) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Shield size={15} color={color} strokeWidth={2.5} />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700, color }}>
          {rating.toFixed(1)}
        </span>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: '#161B22',
      border: '1px solid #21262D',
      borderRadius: '14px',
      padding: '16px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F0F6FC' }}>
          Safety Rating
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={20} color={color} strokeWidth={2.5} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color }}>
            {rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Label */}
      <div style={{
        display: 'inline-block',
        fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 700,
        color, background: `${color}18`, padding: '2px 10px',
        borderRadius: '20px', marginBottom: '12px',
      }}>
        {ratingLabel(rating)}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ThumbsUp size={13} color="rgba(255,255,255,0.4)" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
            {Math.round((rating / 5) * 100)}% of visitors feel safe here
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={13} color="rgba(255,255,255,0.4)" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
            {totalReviews} community {totalReviews === 1 ? 'member' : 'members'} reviewed
          </span>
        </div>
      </div>

      {/* Rate button / inline form */}
      {showForm ? (
        <RateForm placeId={placeId} onDone={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', padding: '10px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '13px',
            color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
          }}
        >
          Rate Safety
        </button>
      )}
    </div>
  );
}
