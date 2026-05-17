/**
 * VideoPlayer — shared tap-to-play inline video component.
 *
 * Design decisions:
 *   - NO autoPlay: video is silent until the user explicitly taps
 *   - Pauses automatically when scrolled out of view (IntersectionObserver)
 *   - Muted by default; unmute is one tap
 *   - Shows duration + play icon on poster state so users know it's a video
 *   - Progress bar while playing (visual only — no scrubbing in v1)
 *   - Single consistent API for every video surface in the app
 *
 * Used by: VenuePage intro video, SafetyReportPage preview, AlertCard
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface VideoPlayerProps {
  src:         string;
  /** Optional fallback poster image URL. If omitted we generate a dark gradient. */
  poster?:     string;
  /** CSS max-height for the video container. Default: 320px */
  maxHeight?:  number;
  /** Aspect ratio applied to the container. Default: unconstrained (natural). */
  aspectRatio?: string;
  /** Rounded corners in px. Default: 14 */
  borderRadius?: number;
  /** Label shown on poster (e.g. "Watch intro"). If omitted, no label. */
  label?:      string;
  /** Called when playback starts for the first time */
  onFirstPlay?: () => void;
}

// ─── Duration formatter ───────────────────────────────────────────────────────

function fmtDuration(s: number): string {
  if (!isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VideoPlayer({
  src,
  poster,
  maxHeight  = 320,
  aspectRatio,
  borderRadius = 14,
  label,
  onFirstPlay,
}: VideoPlayerProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);

  const [playing,   setPlaying]   = useState(false);
  const [muted,     setMuted]     = useState(true);
  const [progress,  setProgress]  = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [error,     setError]     = useState(false);

  // ── Pause on scroll out ───────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Duration from metadata ────────────────────────────────────────────────

  function handleLoadedMetadata() {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }

  // ── Progress tracking ─────────────────────────────────────────────────────

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  }

  function handleEnded() {
    setPlaying(false);
    setProgress(0);
    if (videoRef.current) videoRef.current.currentTime = 0;
  }

  // ── Play / pause ──────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => {
        setPlaying(true);
        if (!hasPlayed) {
          setHasPlayed(true);
          onFirstPlay?.();
        }
      }).catch(() => setError(true));
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [hasPlayed, onFirstPlay]);

  // ── Mute ─────────────────────────────────────────────────────────────────

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius,
    overflow: 'hidden',
    background: '#0D1117',
    cursor: 'pointer',
    ...(aspectRatio ? { aspectRatio } : { maxHeight }),
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onClick={togglePlay}
    >
      {/* The video element — never autoPlays */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        playsInline
        preload="metadata"       // load duration only, not full stream
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => setError(true)}
        style={{
          width: '100%',
          display: 'block',
          maxHeight,
          objectFit: 'cover',
        }}
      />

      {/* Error state */}
      {error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          flexDirection: 'column', gap: '8px',
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <span style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.5)',
          }}>
            Video unavailable
          </span>
        </div>
      )}

      {/* ── Poster overlay (shown when paused / not yet played) ── */}
      {!playing && !error && (
        <div style={{
          position: 'absolute', inset: 0,
          background: poster ? 'rgba(0,0,0,0.35)' : 'linear-gradient(160deg, #111 0%, #1a1a1a 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Central play button */}
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          }}>
            <Play size={20} color="#fff" fill="#fff" style={{ marginLeft: '3px' }} />
          </div>

          {/* Bottom bar: label left, duration right */}
          {(label || duration > 0) && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '10px 12px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            }}>
              {label ? (
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
                  color: 'rgba(255,255,255,0.7)',
                }}>
                  {label}
                </span>
              ) : <span />}
              {duration > 0 && (
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
                  color: 'rgba(255,255,255,0.6)',
                  background: 'rgba(0,0,0,0.5)', borderRadius: '4px', padding: '2px 6px',
                }}>
                  {fmtDuration(duration)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Playing state — mute toggle + progress bar ── */}
      {playing && !error && (
        <>
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            style={{
              position: 'absolute', bottom: '12px', right: '12px',
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted
              ? <VolumeX size={14} color="rgba(255,255,255,0.8)" />
              : <Volume2 size={14} color="rgba(255,255,255,0.8)" />
            }
          </button>

          {/* Pause tap hint (centre, fades quickly) */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', opacity: 0,
            // The container onClick already handles pause — this is just visual affordance on hover
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Pause size={18} color="rgba(255,255,255,0.7)" />
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '3px', background: 'rgba(255,255,255,0.15)',
          }}>
            <div style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: '#39D98A',
              transition: 'width 0.25s linear',
            }} />
          </div>
        </>
      )}
    </div>
  );
}
