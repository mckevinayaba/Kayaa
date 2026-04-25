import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { VenueStory24 } from '../lib/api';
import { trackStoryView, getInteractiveUserId } from '../lib/api';

interface StoryViewerProps {
  story: VenueStory24;
  venueName: string;
  venueCategory: string;
  onClose: () => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

const PHOTO_DURATION = 5000;

export default function StoryViewer({ story, venueName, venueCategory, onClose }: StoryViewerProps) {
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());
  const emoji = CATEGORY_EMOJI[venueCategory] ?? '📍';

  useEffect(() => {
    getInteractiveUserId().then(uid => trackStoryView(story.id, uid));
  }, [story.id]);

  useEffect(() => {
    if (story.mediaType === 'photo') {
      startRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startRef.current;
        const pct = Math.min(elapsed / PHOTO_DURATION, 1);
        setProgress(pct);
        if (pct >= 1) { clearInterval(timerRef.current!); onClose(); }
      }, 50);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [story.mediaType, onClose]);

  function handleVideoTimeUpdate() {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#000', display: 'flex', flexDirection: 'column' }}
    >
      {/* Progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, height: '3px', background: 'rgba(255,255,255,0.25)' }}>
        <div style={{ height: '100%', background: '#fff', width: `${progress * 100}%` }} />
      </div>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 12, left: 0, right: 0, zIndex: 2, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
            {emoji}
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>{venueName}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>24h story</div>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X size={16} color="#fff" />
        </button>
      </div>

      {/* Media */}
      {story.mediaType === 'photo' ? (
        <img src={story.mediaUrl} alt="Story" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <video
          ref={videoRef}
          src={story.mediaUrl}
          autoPlay playsInline
          onTimeUpdate={handleVideoTimeUpdate}
          onEnded={onClose}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}

      {/* Caption */}
      {story.caption && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2, padding: '60px 20px 40px', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', color: '#fff', lineHeight: 1.5, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {story.caption}
          </p>
        </div>
      )}
    </div>
  );
}
