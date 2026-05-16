/**
 * MomentsStrip — Neighbourhood Moments viewer strip
 *
 * Horizontal scroll row of 24-hour local moments.
 * Visual language: portrait thumbnail cards (not circular rings).
 * Distinct from:
 *   - StoriesStrip   (venue-owned, circular, place-bound)
 *   - Board cards    (text-first, listing intent)
 *   - Alert cards    (red, urgent)
 *
 * Tap a card → full-screen MomentViewer overlay.
 * "+" card → navigates to /moments/new.
 * No autoplay anywhere.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, MapPin, Clock } from 'lucide-react';
import type { NeighbourhoodMoment } from '../lib/api';

// ─── Time helpers ─────────────────────────────────────────────────────────────

function timeLeft(expiresAt: string): string {
  const ms   = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0)      return 'expired';
  const hrs  = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hrs >= 1)     return `${hrs}h left`;
  if (mins >= 1)    return `${mins}m left`;
  return 'expiring';
}

function timeAgo(createdAt: string): string {
  const ms   = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1)     return 'just now';
  if (mins < 60)    return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)     return `${hrs}h ago`;
  return 'yesterday';
}

// ─── Moment Viewer — full-screen overlay ─────────────────────────────────────

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

  // Reset play state when moment changes
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
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={onClose}  // tap outside media → close
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 16px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px',
          }}>
            <MapPin size={12} color="rgba(255,255,255,0.55)" />
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
              color: 'rgba(255,255,255,0.55)',
            }}>
              {moment.neighbourhood}
            </span>
          </div>
          {moment.venueName && (
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
              color: 'rgba(57,217,138,0.8)', marginBottom: '2px',
            }}>
              📍 {moment.venueName}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <X size={16} color="rgba(255,255,255,0.8)" />
        </button>
      </div>

      {/* Media — centred, tap to play/pause video */}
      <div
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}
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
              style={{
                maxWidth: '100%', maxHeight: '100%',
                objectFit: 'contain', display: 'block',
              }}
            />
            {!playing && (
              <div style={{
                position: 'absolute',
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <Play size={22} color="#fff" fill="#fff" style={{ marginLeft: '3px' }} />
              </div>
            )}
          </>
        ) : (
          <img
            src={moment.mediaUrl}
            alt={moment.caption}
            style={{
              maxWidth: '100%', maxHeight: '100%',
              objectFit: 'contain', display: 'block',
            }}
          />
        )}

        {/* Prev / Next swipe zones */}
        {hasPrev && (
          <button
            onClick={e => { e.stopPropagation(); onPrev(); }}
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: '25%',
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
              padding: '0 12px',
            }}
            aria-label="Previous moment"
          />
        )}
        {hasNext && (
          <button
            onClick={e => { e.stopPropagation(); onNext(); }}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: '25%',
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              padding: '0 12px',
            }}
            aria-label="Next moment"
          />
        )}
      </div>

      {/* Footer — caption + time */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)',
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          fontSize: '16px', color: '#F0F6FC',
          margin: '0 0 10px', lineHeight: 1.45,
        }}>
          {moment.caption}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
          }}>
            {timeAgo(moment.createdAt)}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: remaining === 'expired' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.38)',
          }}>
            <Clock size={10} />
            {remaining}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Card thumbnail ───────────────────────────────────────────────────────────

const CARD_W = 108;
const CARD_H = 148;

function MomentCard({
  moment,
  onClick,
}: {
  moment:  NeighbourhoodMoment;
  onClick: () => void;
}) {
  const ms = new Date(moment.expiresAt).getTime() - Date.now();
  const hrsLeft = ms / (1000 * 60 * 60);
  // Fade older moments slightly
  const opacity = hrsLeft < 3 ? 0.65 : 1;

  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, width: `${CARD_W}px`, height: `${CARD_H}px`,
        borderRadius: '16px', overflow: 'hidden',
        position: 'relative', cursor: 'pointer',
        border: 'none', padding: 0,
        background: '#161B22',
        opacity,
        WebkitTapHighlightColor: 'transparent',
      } as React.CSSProperties}
    >
      {/* Media background */}
      {moment.mediaType === 'photo' ? (
        <img
          src={moment.mediaUrl}
          alt={moment.caption}
          loading="lazy"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          }}
        />
      ) : (
        <video
          src={moment.mediaUrl}
          preload="metadata"
          muted
          playsInline
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          }}
        />
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)',
      }} />

      {/* Video play badge */}
      {moment.mediaType === 'video' && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          width: '24px', height: '24px', borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Play size={10} color="#fff" fill="#fff" style={{ marginLeft: '1px' }} />
        </div>
      )}

      {/* Caption */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '0 8px 10px',
      }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          fontSize: '11px', color: '#F0F6FC',
          margin: 0, lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } as React.CSSProperties}>
          {moment.caption}
        </p>
      </div>
    </button>
  );
}

// ─── Add Moment Card (the "+" entry point) ────────────────────────────────────

function AddMomentCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, width: `${CARD_W}px`, height: `${CARD_H}px`,
        borderRadius: '16px', overflow: 'hidden',
        position: 'relative', cursor: 'pointer',
        border: '1.5px dashed rgba(57,217,138,0.3)',
        background: 'rgba(57,217,138,0.04)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '8px', padding: 0,
        WebkitTapHighlightColor: 'transparent',
      } as React.CSSProperties}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: 'rgba(57,217,138,0.1)',
        border: '1.5px solid rgba(57,217,138,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px',
      }}>
        +
      </div>
      <span style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
        color: 'rgba(57,217,138,0.7)',
        textAlign: 'center', lineHeight: 1.3, padding: '0 8px',
      }}>
        Share a moment
      </span>
    </button>
  );
}

// ─── Main strip ───────────────────────────────────────────────────────────────

interface MomentsStripProps {
  moments:      NeighbourhoodMoment[];
  neighbourhood: string;
  showAdd?:     boolean;  // show "+" card (hide when user is not signed in)
}

export default function MomentsStrip({
  moments,
  neighbourhood,
  showAdd = true,
}: MomentsStripProps) {
  const navigate = useNavigate();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Body scroll lock while viewer is open
  useEffect(() => {
    if (viewerIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [viewerIndex]);

  // Don't render the strip if there are no moments and no add button
  if (moments.length === 0 && !showAdd) return null;

  const activeMoment = viewerIndex !== null ? moments[viewerIndex] : null;

  return (
    <>
      {/* Strip section */}
      <div style={{ marginBottom: '20px' }}>
        {/* Section label */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{
              display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
              background: '#39D98A',
              boxShadow: '0 0 6px rgba(57,217,138,0.7)',
            }} />
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '12px',
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Moments
            </span>
            {neighbourhood && (
              <span style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                color: 'rgba(255,255,255,0.28)',
              }}>
                · {neighbourhood}
              </span>
            )}
          </div>
          {moments.length > 0 && (
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
              color: 'rgba(255,255,255,0.25)',
            }}>
              {moments.length} today
            </span>
          )}
        </div>

        {/* Horizontal scroll */}
        <div style={{
          display: 'flex', gap: '10px',
          overflowX: 'auto', scrollbarWidth: 'none',
          marginLeft: '-16px', paddingLeft: '16px',
          marginRight: '-16px', paddingRight: '16px',
          paddingBottom: '4px',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>

          {/* Add moment card — first */}
          {showAdd && (
            <AddMomentCard onClick={() => navigate('/moments/new')} />
          )}

          {/* Moment cards */}
          {moments.map((m, i) => (
            <MomentCard
              key={m.id}
              moment={m}
              onClick={() => setViewerIndex(i)}
            />
          ))}

          {/* Empty state: only shown if there ARE no moments yet */}
          {moments.length === 0 && (
            <div style={{
              flexShrink: 0,
              height: `${CARD_H}px`,
              display: 'flex', alignItems: 'center',
              paddingLeft: '4px',
            }}>
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                color: 'rgba(255,255,255,0.2)', margin: 0, maxWidth: '200px',
                lineHeight: 1.5,
              }}>
                No moments yet — be the first to share what {neighbourhood || 'the neighbourhood'} looks like today.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen viewer */}
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
