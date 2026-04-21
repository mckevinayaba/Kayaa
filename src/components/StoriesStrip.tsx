import { useState } from 'react';
import type { Story } from '../types';
import StoryViewer from './StoryViewer';

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

function getRingColor(createdAt: string): string {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (ageHours < 6) return '#39D98A';
  if (ageHours < 18) return '#F5A623';
  return '#6B7280';
}

export default function StoriesStrip({ stories }: { stories: Story[] }) {
  const [active, setActive] = useState<Story | null>(null);

  if (stories.length === 0) return null;

  return (
    <>
      <div style={{
        display: 'flex', gap: '16px',
        overflowX: 'auto', scrollbarWidth: 'none',
        marginLeft: '-16px', paddingLeft: '16px',
        marginRight: '-16px', paddingRight: '16px',
        paddingBottom: '4px', marginBottom: '16px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {stories.map(story => {
          const emoji = CATEGORY_EMOJI[story.venueType] ?? '📍';
          const color = CATEGORY_COLOR[story.venueType] ?? '#39D98A';
          const ring = getRingColor(story.createdAt);

          return (
            <button
              key={story.id}
              onClick={() => setActive(story)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '6px', flexShrink: 0, background: 'transparent', border: 'none',
                cursor: 'pointer', padding: '4px 0',
              }}
            >
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                border: `2.5px solid ${ring}`, padding: '2px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: `${color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>
                  {emoji}
                </div>
              </div>
              <span style={{
                fontSize: '10px', color: 'var(--color-muted)',
                fontFamily: 'DM Sans, sans-serif',
                maxWidth: '56px', textAlign: 'center',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {story.venueName.slice(0, 10)}
              </span>
            </button>
          );
        })}
      </div>

      {active && <StoryViewer story={active} onClose={() => setActive(null)} />}
    </>
  );
}
