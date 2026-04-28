// ── Achievement Badges ────────────────────────────────────────────────────────
// Awarded purely from local stats — no auth required.

interface Stats {
  checkins: number;
  places:   number;
  regulars: number;
  posts:    number;
}

interface Badge {
  id:       string;
  emoji:    string;
  label:    string;
  desc:     string;
  color:    string;
  unlocked: boolean;
}

function buildBadges(stats: Stats): Badge[] {
  return [
    {
      id:       'first_checkin',
      emoji:    '📍',
      label:    'First Check-in',
      desc:     'You checked in somewhere!',
      color:    '#39D98A',
      unlocked: stats.checkins >= 1,
    },
    {
      id:       'explorer',
      emoji:    '🗺️',
      label:    'Explorer',
      desc:     'Visited 5 different places',
      color:    '#60A5FA',
      unlocked: stats.places >= 5,
    },
    {
      id:       'regular',
      emoji:    '⭐',
      label:    'Regular',
      desc:     'A place knows your face',
      color:    '#F5A623',
      unlocked: stats.regulars >= 1,
    },
    {
      id:       'loyal',
      emoji:    '🔥',
      label:    'Loyalist',
      desc:     '3 places call you a regular',
      color:    '#F97316',
      unlocked: stats.regulars >= 3,
    },
    {
      id:       'socialite',
      emoji:    '💬',
      label:    'Socialite',
      desc:     'Posted on the Board',
      color:    '#A78BFA',
      unlocked: stats.posts >= 1,
    },
    {
      id:       'neighbourhood_hero',
      emoji:    '👑',
      label:    'Neighbourhood Hero',
      desc:     '20+ check-ins across 10+ places',
      color:    '#FCD34D',
      unlocked: stats.checkins >= 20 && stats.places >= 10,
    },
  ];
}

interface AchievementBadgesProps {
  stats: Stats;
}

export function AchievementBadges({ stats }: AchievementBadgesProps) {
  const badges   = buildBadges(stats);
  const unlocked = badges.filter(b => b.unlocked);

  return (
    <div style={{ padding: '0 16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', margin: 0 }}>
          Achievements
        </h3>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          {unlocked.length} / {badges.length}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {badges.map(b => (
          <div
            key={b.id}
            style={{
              background: b.unlocked ? `${b.color}12` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${b.unlocked ? `${b.color}35` : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '14px', padding: '14px 10px', textAlign: 'center',
              opacity: b.unlocked ? 1 : 0.45,
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '6px', filter: b.unlocked ? 'none' : 'grayscale(1)' }}>
              {b.emoji}
            </div>
            <div style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px',
              color: b.unlocked ? b.color : 'rgba(255,255,255,0.35)',
              marginBottom: '3px', lineHeight: 1.3,
            }}>
              {b.label}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>
              {b.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
