/**
 * CreatePage — the "+" tab.
 *
 * A lightweight creation hub so the fifth nav slot is a recurring
 * destination, not a one-time "Add Place" dead-end.
 *
 * Four creation paths:
 *   Post on Board   →  /board/new            (listings, jobs, housing, notices)
 *   Add a Place     →  /onboarding           (register a venue / business)
 *   Offer a Skill   →  /skills/new           (skill / service listing)
 *   Community post  →  /post/new?type=post   (news, spotted, events, ask)
 */

import { useNavigate } from 'react-router-dom';

interface ActionTile {
  emoji:    string;
  label:    string;
  sub:      string;
  color:    string;
  bg:       string;
  border:   string;
  to:       string;
}

const TILES: ActionTile[] = [
  {
    emoji:  '📋',
    label:  'Post on Board',
    sub:    'Sell items, offer services, post jobs, housing or community notices',
    color:  '#39D98A',
    bg:     'rgba(57,217,138,0.07)',
    border: 'rgba(57,217,138,0.2)',
    to:     '/board/new',
  },
  {
    emoji:  '✍️',
    label:  'Community post',
    sub:    'Share news, what you spotted, an event or ask your neighbours',
    color:  '#60A5FA',
    bg:     'rgba(96,165,250,0.07)',
    border: 'rgba(96,165,250,0.2)',
    to:     '/post/new?type=post',
  },
  {
    emoji:  '🔧',
    label:  'Offer a skill',
    sub:    'Let your neighbourhood know what you do — barber, tutor, cleaner, DJ…',
    color:  '#A78BFA',
    bg:     'rgba(167,139,250,0.07)',
    border: 'rgba(167,139,250,0.2)',
    to:     '/skills/new',
  },
  {
    emoji:  '🏪',
    label:  'Add a place',
    sub:    'Register a shop, salon, spaza, church, carwash or any local venue',
    color:  '#F5A623',
    bg:     'rgba(245,166,35,0.07)',
    border: 'rgba(245,166,35,0.2)',
    to:     '/onboarding',
  },
];

export default function CreatePage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px 16px 100px' }}>

      {/* Header */}
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
          Post something, add a place or share a skill.
        </p>
      </div>

      {/* Action tiles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {TILES.map(tile => (
          <button
            key={tile.to}
            onClick={() => navigate(tile.to)}
            style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              background: tile.bg,
              border: `1px solid ${tile.border}`,
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            {/* Icon */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
              background: `${tile.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px',
            }}>
              {tile.emoji}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '15px', color: '#F0F6FC', marginBottom: '3px',
              }}>
                {tile.label}
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                color: 'rgba(255,255,255,0.42)', lineHeight: 1.45,
              }}>
                {tile.sub}
              </div>
            </div>

            {/* Arrow */}
            <span style={{
              color: tile.color, fontSize: '18px', flexShrink: 0, opacity: 0.7,
            }}>
              →
            </span>
          </button>
        ))}
      </div>

    </div>
  );
}
