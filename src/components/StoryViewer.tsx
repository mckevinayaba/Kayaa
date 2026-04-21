import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Story } from '../types';

const CATEGORY_EMOJI: Record<string, string> = {
  Barbershop: '✂️', Shisanyama: '🔥', Tavern: '🍺', Café: '☕',
  Church: '⛪', Carwash: '🚗', 'Spaza Shop': '🏪', Salon: '💅',
  Tutoring: '📚', 'Sports Ground': '⚽', 'Home Business': '🏠',
};

const CATEGORY_COLOR: Record<string, string> = {
  Barbershop: '#39D98A', Shisanyama: '#F5A623', Tavern: '#60A5FA',
  Café: '#F59E0B', Church: '#A78BFA', Carwash: '#34D399',
  'Spaza Shop': '#60A5FA', Salon: '#F472B6', Tutoring: '#34D399',
  'Sports Ground': '#FB923C', 'Home Business': '#94A3B8',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
}

const DURATION = 5000;

export default function StoryViewer({ story, onClose }: { story: Story; onClose: () => void }) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = Date.now();

    function tick() {
      const pct = Math.min((Date.now() - startRef.current) / DURATION, 1);
      setProgress(pct);
      if (pct < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onClose();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onClose]);

  const emoji = CATEGORY_EMOJI[story.venueType] ?? '📍';
  const color = CATEGORY_COLOR[story.venueType] ?? '#39D98A';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: '#0D1117',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 32px',
      }}
    >
      {/* Progress bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: 'rgba(255,255,255,0.12)',
      }}>
        <div style={{
          height: '100%', background: '#39D98A',
          width: `${progress * 100}%`,
        }} />
      </div>

      {/* Close */}
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'absolute', top: '16px', right: '16px',
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <X size={18} color="#fff" />
      </button>

      {/* Avatar */}
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: `${color}20`, border: `2px solid ${color}60`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', marginBottom: '20px',
      }}>
        {emoji}
      </div>

      <div style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px',
        color: '#fff', marginBottom: '6px', textAlign: 'center',
      }}>
        {story.venueName}
      </div>
      <div style={{
        fontSize: '12px', color, fontWeight: 600,
        background: `${color}18`, padding: '2px 10px', borderRadius: '20px',
        marginBottom: '32px',
      }}>
        {story.venueType}
      </div>

      <p style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '22px',
        color: '#fff', textAlign: 'center', lineHeight: 1.5,
        marginBottom: '32px', maxWidth: '340px',
      }}>
        {story.content}
      </p>

      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontFamily: 'DM Sans, sans-serif' }}>
        Posted {timeAgo(story.createdAt)}
      </span>
    </div>
  );
}
