import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoGalleryProps {
  photos: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  /** Optional CSS height (default 300px) */
  height?: string;
}

export function PhotoGallery({ photos, currentIndex, onIndexChange, height = '300px' }: PhotoGalleryProps) {
  const touchStartX = useRef<number | null>(null);

  if (photos.length === 0) return null;

  function handlePrevious() {
    onIndexChange(currentIndex === 0 ? photos.length - 1 : currentIndex - 1);
  }

  function handleNext() {
    onIndexChange(currentIndex === photos.length - 1 ? 0 : currentIndex + 1);
  }

  return (
    <div
      style={{ position: 'relative', height, overflow: 'hidden', background: '#0D1117' }}
      onTouchStart={e => { touchStartX.current = e.targetTouches[0].clientX; }}
      onTouchMove={() => {/* passive — no action until end */}}
      onTouchEnd={e => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (dx < -75) handleNext();
        if (dx > 75) handlePrevious();
      }}
    >
      {/* Active photo */}
      <img
        src={photos[currentIndex]}
        alt={`Photo ${currentIndex + 1}`}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', userSelect: 'none' }}
        draggable={false}
      />

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            aria-label="Previous photo"
            style={{
              position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(13,17,23,0.55)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(6px)',
            }}
          >
            <ChevronLeft size={18} color="#fff" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next photo"
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(13,17,23,0.55)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(6px)',
            }}
          >
            <ChevronRight size={18} color="#fff" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => onIndexChange(i)}
              aria-label={`Go to photo ${i + 1}`}
              style={{
                height: '6px',
                width: i === currentIndex ? '20px' : '6px',
                borderRadius: '3px',
                background: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'width 0.2s, background 0.2s',
              }}
            />
          ))}
        </div>
      )}

      {/* Photo counter chip */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute', bottom: '14px', right: '14px',
          fontSize: '11px', fontFamily: 'DM Sans, sans-serif',
          color: 'rgba(255,255,255,0.7)',
          background: 'rgba(13,17,23,0.5)', borderRadius: '20px',
          padding: '3px 10px', backdropFilter: 'blur(6px)',
        }}>
          {currentIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
