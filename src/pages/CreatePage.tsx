/**
 * CreatePage — /create
 *
 * The structured contribution hub for Kayaa.
 * Every meaningful neighbourhood action starts here.
 *
 * Three sections:
 *   Opportunities  — jobs/services, housing
 *   Community      — updates, board posts, alerts
 *   Places         — add a venue, honour a place
 *
 * Each tile shows where the content will appear so users always
 * know what they're creating and where it lands.
 */

import { useNavigate } from 'react-router-dom';

// ── Tile config ───────────────────────────────────────────────────────────────

interface Tile {
  emoji:   string;
  label:   string;
  sub:     string;
  lands:   string;          // "appears in …" context note
  color:   string;
  bg:      string;
  border:  string;
  to:      string;
}

interface Section {
  heading: string;
  tiles:   Tile[];
}

const SECTIONS: Section[] = [
  {
    heading: 'Opportunities',
    tiles: [
      {
        emoji:  '💼',
        label:  'Post a job',
        sub:    'Hire someone, post a task, or find help for a project',
        lands:  'Board → Jobs',
        color:  '#A78BFA',
        bg:     'rgba(167,139,250,0.07)',
        border: 'rgba(167,139,250,0.2)',
        to:     '/board/new?cat=jobs',
      },
      {
        emoji:  '🔧',
        label:  'Offer a skill or service',
        sub:    'Share what you do — barber, tutor, cleaner, mechanic, chef…',
        lands:  'Board → Services',
        color:  '#60A5FA',
        bg:     'rgba(96,165,250,0.07)',
        border: 'rgba(96,165,250,0.2)',
        to:     '/board/new?cat=services',
      },
      {
        emoji:  '🏠',
        label:  'List a room or rental',
        sub:    'Room, rental, short stay or lodge listing',
        lands:  'Board → Housing',
        color:  '#34D399',
        bg:     'rgba(52,211,153,0.07)',
        border: 'rgba(52,211,153,0.2)',
        to:     '/board/new?cat=accommodation',
      },
    ],
  },
  {
    heading: 'Community',
    tiles: [
      {
        emoji:  '✦',
        label:  'Share a Moment',
        sub:    'A photo or short clip of what the neighbourhood looks like right now. Gone in 24 hours.',
        lands:  'Moments strip · Home',
        color:  '#39D98A',
        bg:     'rgba(57,217,138,0.07)',
        border: 'rgba(57,217,138,0.2)',
        to:     '/moments/new',
      },
      {
        emoji:  '✍️',
        label:  'Share a neighbourhood update',
        sub:    'News, spotted, local event or question for neighbours',
        lands:  'Home feed',
        color:  '#60A5FA',
        bg:     'rgba(96,165,250,0.07)',
        border: 'rgba(96,165,250,0.2)',
        to:     '/post/new?type=post',
      },
      {
        emoji:  '📋',
        label:  'Post to Board',
        sub:    'For sale, free items, announcements, lost & found',
        lands:  'Board',
        color:  '#39D98A',
        bg:     'rgba(57,217,138,0.07)',
        border: 'rgba(57,217,138,0.2)',
        to:     '/board/new',
      },
      {
        emoji:  '🚨',
        label:  'Report a safety incident',
        sub:    'Crime, suspicious activity, missing person, road issue, fire',
        lands:  'Alerts feed + Home',
        color:  '#EF4444',
        bg:     'rgba(239,68,68,0.07)',
        border: 'rgba(239,68,68,0.2)',
        to:     '/report/safety',
      },
    ],
  },
  {
    heading: 'Places',
    tiles: [
      {
        emoji:  '🏪',
        label:  'Add your business',
        sub:    'Is your business on Kayaa? Add it free in 2 minutes.',
        lands:  'Discover',
        color:  '#F5A623',
        bg:     'rgba(245,166,35,0.07)',
        border: 'rgba(245,166,35,0.2)',
        to:     '/onboarding',
      },
      {
        emoji:  '✨',
        label:  'Honour a business',
        sub:    'Found a business you love? Honour it and let the community know.',
        lands:  'Venue page · Discover',
        color:  '#F59E0B',
        bg:     'rgba(245,158,11,0.07)',
        border: 'rgba(245,158,11,0.2)',
        to:     '/neighbourhood',
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreatePage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px 16px calc(80px + env(safe-area-inset-bottom, 0px))' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '22px', color: '#F0F6FC', margin: '0 0 4px',
        }}>
          Create
        </h1>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.38)', margin: 0,
        }}>
          What do you want to contribute to your neighbourhood?
        </p>
      </div>

      {/* ── Sections ── */}
      {SECTIONS.map(section => (
        <div key={section.heading} style={{ marginBottom: '28px' }}>

          {/* Section heading */}
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.3)', margin: '0 0 10px',
          }}>
            {section.heading}
          </p>

          {/* Owner hook for Places section */}
          {section.heading === 'Places' && (
            <p style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
              color: 'rgba(255,255,255,0.45)', margin: '-4px 0 10px',
              lineHeight: 1.5,
            }}>
              Run a shop, salon, spaza, or church? Your community is already looking for you.
            </p>
          )}

          {/* Tiles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {section.tiles.map(tile => (
              <button
                key={tile.to + tile.label}
                onClick={() => navigate(tile.to)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  background: tile.bg,
                  border: `1px solid ${tile.border}`,
                  borderRadius: '16px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent',
                } as React.CSSProperties}
              >
                {/* Icon */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '13px', flexShrink: 0,
                  background: `${tile.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>
                  {tile.emoji}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Syne, sans-serif', fontWeight: 700,
                    fontSize: '14px', color: '#F0F6FC', marginBottom: '2px',
                  }}>
                    {tile.label}
                  </div>
                  <div style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                    color: 'rgba(255,255,255,0.42)', lineHeight: 1.4,
                    marginBottom: '4px',
                  }}>
                    {tile.sub}
                  </div>
                  {/* "Appears in" context badge */}
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
                    color: tile.color, background: `${tile.color}12`,
                    padding: '2px 7px', borderRadius: '8px',
                    display: 'inline-block',
                  }}>
                    → {tile.lands}
                  </span>
                </div>

                {/* Arrow */}
                <span style={{ color: tile.color, fontSize: '16px', flexShrink: 0, opacity: 0.6 }}>
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
