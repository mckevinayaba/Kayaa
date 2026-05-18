/**
 * MomentsStrip — compact neighbourhood presence rail
 *
 * Visual target: 72px total height (56px circles + 16px captions).
 * The strip sits above the PostBar without competing with it.
 *
 * Design decisions
 * ────────────────
 * Circles, not portrait cards — keeps the rail height under 80px.
 * Custom M-pulse icon — branded, not generic. Two arcs + filled dot
 *   reads as "live local signal" without using the word "MOMENTS".
 * Label is inline with the first item's caption, not a separate header row.
 * Empty state: no ghost card — just one whisper line of text below the "+".
 * Viewer overlay is unchanged (full-screen, tap-to-play).
 *
 * Circle sizes
 *   ADD circle  : 56 × 56, dashed accent border
 *   MOMENT circle: 56 × 56, thumbnail fill, hair-thin ring
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Clock } from 'lucide-react';
import type { NeighbourhoodMoment } from '../lib/api';

// ─── Branded Moments icon ─────────────────────────────────────────────────────
//
// Two concentric arcs rising from a filled dot.
// Reads as "live neighbourhood signal" — presence, not broadcast.
// 16 × 14 px, accent colour, no stroke weight above 1.5.

function MomentsIcon({ size = 14 }: { size?: number }) {
  const scale = size / 14;
  return (
    <svg
      width={16 * scale}
      height={14 * scale}
      viewBox="0 0 16 14"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Filled centre dot — the neighbourhood */}
      <circle cx="8" cy="9" r="2" fill="#39D98A" />
      {/* Inner arc — close presence */}
      <path
        d="M4.5 6.5 a4.5 4.5 0 0 1 7 0"
        stroke="#39D98A"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Outer arc — wider signal */}
      <path
        d="M1.5 3.5 a7.5 7.5 0 0 1 13 0"
        stroke="#39D98A"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.28"
      />
    </svg>
  );
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

function timeLeft(expiresAt: string): string {
  const ms  = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const hrs = Math.floor(ms / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  if (hrs >= 1) return `${hrs}h`;
  if (min >= 1) return `${min}m`;
  return '<1m';
}

function timeAgo(createdAt: string): string {
  const ms   = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ─── Dimension constants ──────────────────────────────────────────────────────

const D = 56;          // circle diameter
const GAP = 12;        // gap between circles
const CAPTION_MAX = 52; // max-width of caption text (px)

// ─── Full-screen Moment Viewer ────────────────────────────────────────────────
// (Unchanged from v1 — full-screen is correct for viewing media)

function MomentViewer({
  moment,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  moment:  NeighbourhoodMoment;
  onClose: () => void;
  onPrev:  () => void;
  onNext:  () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [moment.id]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  }

  const remaining = timeLeft(moment.expiresAt);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.96)',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          padding: 'calc(env(safe-area-inset-top,0px) + 16px) 16px 20px',
          background: 'linear-gradient(to bottom,rgba(0,0,0,0.72) 0%,transparent 100%)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MomentsIcon size={13} />
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.5)', letterSpacing: '0.01em',
          }}>
            {moment.neighbourhood}
            {moment.venueName && (
              <span style={{ color: 'rgba(57,217,138,0.75)', marginLeft: '6px' }}>
                · {moment.venueName}
              </span>
            )}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%', width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <X size={14} color="rgba(255,255,255,0.75)" />
        </button>
      </div>

      {/* Media */}
      <div
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        onClick={e => { e.stopPropagation(); if (moment.mediaType === 'video') togglePlay(); }}
      >
        {moment.mediaType === 'video' ? (
          <>
            <video
              ref={videoRef}
              src={moment.mediaUrl}
              preload="metadata"
              playsInline
              onEnded={() => setPlaying(false)}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
            />
            {!playing && (
              <div style={{
                position: 'absolute',
                width: '54px', height: '54px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.52)',
                border: '1.5px solid rgba(255,255,255,0.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <Play size={20} color="#fff" fill="#fff" style={{ marginLeft: '3px' }} />
              </div>
            )}
          </>
        ) : (
          <img
            src={moment.mediaUrl}
            alt={moment.caption}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          />
        )}

        {hasPrev && (
          <button
            onClick={e => { e.stopPropagation(); onPrev(); }}
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '25%', background: 'transparent', border: 'none', cursor: 'pointer' }}
            aria-label="Previous"
          />
        )}
        {hasNext && (
          <button
            onClick={e => { e.stopPropagation(); onNext(); }}
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '25%', background: 'transparent', border: 'none', cursor: 'pointer' }}
            aria-label="Next"
          />
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '20px 20px calc(env(safe-area-inset-bottom,0px) + 28px)',
          background: 'linear-gradient(to top,rgba(0,0,0,0.78) 0%,transparent 100%)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 500,
          fontSize: '16px', color: '#F0F6FC',
          margin: '0 0 8px', lineHeight: 1.45,
        }}>
          {moment.caption}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.38)' }}>
            {timeAgo(moment.createdAt)}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontFamily: 'Inter, sans-serif', fontSize: '11px',
            color: remaining === 'expired' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.35)',
          }}>
            <Clock size={10} />
            {remaining} left
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Circle bubble — moment thumbnail ────────────────────────────────────────

function MomentBubble({
  moment,
  onClick,
}: {
  moment:  NeighbourhoodMoment;
  onClick: () => void;
}) {
  const msLeft  = new Date(moment.expiresAt).getTime() - Date.now();
  const hrsLeft = msLeft / 3_600_000;
  const opacity = hrsLeft < 3 ? 0.6 : 1;

  // One-line caption: strip newlines, collapse whitespace, trim
  const caption = moment.caption.replace(/\s+/g, ' ').trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0, opacity }}>
      <button
        onClick={onClick}
        style={{
          width: `${D}px`, height: `${D}px`,
          borderRadius: '50%', overflow: 'hidden',
          position: 'relative', cursor: 'pointer',
          border: '1.5px solid rgba(57,217,138,0.25)',
          background: '#161B22',
          padding: 0, flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
        } as React.CSSProperties}
        aria-label={caption}
      >
        {/* Thumbnail */}
        {moment.mediaType === 'photo' ? (
          <img
            src={moment.mediaUrl}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <video
            src={moment.mediaUrl}
            preload="metadata"
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}

        {/* Video indicator — small ▶ in bottom-right */}
        {moment.mediaType === 'video' && (
          <div style={{
            position: 'absolute', bottom: '4px', right: '4px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Play size={7} color="#fff" fill="#fff" style={{ marginLeft: '1px' }} />
          </div>
        )}
      </button>

      {/* Caption — 1 line, max CAPTION_MAX px wide */}
      <span style={{
        fontFamily: 'Inter, sans-serif', fontSize: '10px',
        color: 'rgba(255,255,255,0.45)', lineHeight: 1.3,
        width: `${CAPTION_MAX}px`, textAlign: 'center',
        display: 'block', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {caption}
      </span>
    </div>
  );
}

// ─── Add bubble — first item in rail ─────────────────────────────────────────

function AddBubble({ onClick, isEmpty }: { onClick: () => void; isEmpty: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
      <button
        onClick={onClick}
        style={{
          width: `${D}px`, height: `${D}px`, borderRadius: '50%',
          background: 'rgba(57,217,138,0.06)',
          border: '1.5px dashed rgba(57,217,138,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0, flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
        } as React.CSSProperties}
        aria-label="Share a moment"
      >
        <span style={{
          fontSize: '22px', lineHeight: 1,
          color: 'rgba(57,217,138,0.65)',
          fontWeight: 300,
          fontFamily: 'system-ui, sans-serif',
          marginTop: '-1px',
        }}>
          +
        </span>
      </button>

      {/* Caption row: "share" when moments exist, "be first" when empty */}
      <span style={{
        fontFamily: 'Inter, sans-serif', fontSize: '10px',
        color: 'rgba(255,255,255,0.32)', lineHeight: 1.3,
        width: `${CAPTION_MAX}px`, textAlign: 'center',
        display: 'block', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {isEmpty ? 'be first' : 'share'}
      </span>
    </div>
  );
}

// ─── Main strip ───────────────────────────────────────────────────────────────

interface MomentsStripProps {
  moments:       NeighbourhoodMoment[];
  neighbourhood: string;
  showAdd?:      boolean;
}

export default function MomentsStrip({
  moments,
  neighbourhood,
  showAdd = true,
}: MomentsStripProps) {
  const navigate = useNavigate();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Scroll-lock while viewer is open
  useEffect(() => {
    document.body.style.overflow = viewerIndex !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [viewerIndex]);

  const isEmpty = moments.length === 0;

  // Fully hidden if no content and no add button
  if (isEmpty && !showAdd) return null;

  const activeMoment = viewerIndex !== null ? moments[viewerIndex] : null;

  return (
    <>
      {/*
        ── Compact rail ─────────────────────────────────────────────────────────
        Layout: [icon] "moments" label, then the horizontal bubble row.
        Total height: ~20px label + 56px circles + 16px captions = ~92px.
        No section card, no heavy header row.
      */}
      <div style={{ marginBottom: '16px' }}>

        {/* Inline label row — icon + name + count */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginBottom: '10px', paddingLeft: '2px',
        }}>
          <MomentsIcon size={13} />
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: '11px',
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.02em',
          }}>
            moments
          </span>
          {!isEmpty && (
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '10px',
              color: 'rgba(255,255,255,0.18)',
            }}>
              · {moments.length} today
            </span>
          )}
          {isEmpty && neighbourhood && (
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: '10px',
              color: 'rgba(255,255,255,0.15)', fontStyle: 'italic',
            }}>
              · none yet in {neighbourhood}
            </span>
          )}
        </div>

        {/* Horizontal bubble scroll */}
        <div style={{
          display: 'flex', gap: `${GAP}px`, alignItems: 'flex-start',
          overflowX: 'auto', scrollbarWidth: 'none',
          marginLeft: '-16px', paddingLeft: '16px',
          marginRight: '-16px', paddingRight: '16px',
          paddingBottom: '2px',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>

          {/* Add bubble — always first */}
          {showAdd && (
            <AddBubble
              onClick={() => navigate('/moments/new')}
              isEmpty={isEmpty}
            />
          )}

          {/* Moment bubbles */}
          {moments.map((m, i) => (
            <MomentBubble
              key={m.id}
              moment={m}
              onClick={() => setViewerIndex(i)}
            />
          ))}
        </div>
      </div>

      {/* Full-screen viewer — separate from the rail layout */}
      {activeMoment && viewerIndex !== null && (
        <MomentViewer
          moment={activeMoment}
          onClose={() => setViewerIndex(null)}
          onPrev={() => setViewerIndex(i => i !== null && i > 0 ? i - 1 : i)}
          onNext={() => setViewerIndex(i => i !== null && i < moments.length - 1 ? i + 1 : i)}
          hasPrev={viewerIndex > 0}
          hasNext={viewerIndex < moments.length - 1}
        />
      )}
    </>
  );
}
