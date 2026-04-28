// ── Achievement Badges ────────────────────────────────────────────────────────
// Awarded purely from local stats — no auth required.
// Locked badges show a progress bar + fraction so users know what to aim for.

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
  /** Current progress value (for locked badges) */
  progress?: number;
  /** Target value needed to unlock */
  total?: number;
}

function buildBadges(stats: Stats): Badge[] {
  return [
    {
      id:       'first_checkin',
      emoji:    '📍',
      label:    'First Check-in',
      desc:     'Check in anywhere',
      color:    '#39D98A',
      unlocked: stats.checkins >= 1,
      progress: stats.checkins,
      total:    1,
    },
    {
      id:       'explorer',
      emoji:    '🗺️',
      label:    'Explorer',
      desc:     'Visit 5 places',
      color:    '#60A5FA',
      unlocked: stats.places >= 5,
      progress: stats.places,
      total:    5,
    },
    {
      id:       'regular',
      emoji:    '⭐',
      label:    'Regular',
      desc:     'Visit a place 3×',
      color:    '#F5A623',
      unlocked: stats.regulars >= 1,
      progress: stats.regulars,
      total:    1,
    },
    {
      id:       'loyal',
      emoji:    '🔥',
      label:    'Loyalist',
      desc:     '3 places, 3+ visits each',
      color:    '#F97316',
      unlocked: stats.regulars >= 3,
      progress: stats.regulars,
      total:    3,
    },
    {
      id:       'socialite',
      emoji:    '💬',
      label:    'Socialite',
      desc:     'Post on the Board',
      color:    '#A78BFA',
      unlocked: stats.posts >= 1,
      progress: stats.posts,
      total:    1,
    },
    {
      id:       'contributor',
      emoji:    '✍️',
      label:    'Contributor',
      desc:     '5 Board posts',
      color:    '#34D399',
      unlocked: stats.posts >= 5,
      progress: stats.posts,
      total:    5,
    },
    {
      id:       'local_influencer',
      emoji:    '📈',
      label:    'Local Influencer',
      desc:     '50 check-ins total',
      color:    '#818CF8',
      unlocked: stats.checkins >= 50,
      progress: stats.checkins,
      total:    50,
    },
    {
      id:       'neighbourhood_hero',
      emoji:    '👑',
      label:    'Nbhd Hero',
      desc:     '20 check-ins, 10 places',
      color:    '#FCD34D',
      unlocked: stats.checkins >= 20 && stats.places >= 10,
      progress: Math.min(stats.checkins, stats.places * 2),
      total:    20,
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {badges.map(b => {
          const pct = b.total
            ? Math.min(100, Math.round(((b.progress ?? 0) / b.total) * 100))
            : 0;

          return (
            <div
              key={b.id}
              style={{
                background: b.unlocked ? `${b.color}12` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${b.unlocked ? `${b.color}35` : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '14px', padding: '12px 8px', textAlign: 'center',
              }}
            >
              {/* Emoji */}
              <div style={{
                fontSize: '26px', marginBottom: '6px',
                filter: b.unlocked ? 'none' : 'grayscale(1)',
                opacity: b.unlocked ? 1 : 0.4,
              }}>
                {b.emoji}
              </div>

              {/* Label */}
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '10px',
                color: b.unlocked ? b.color : 'rgba(255,255,255,0.3)',
                marginBottom: '4px', lineHeight: 1.3,
              }}>
                {b.label}
              </div>

              {/* Progress bar (locked only) */}
              {!b.unlocked && b.total !== undefined && (
                <>
                  <div style={{
                    height: '3px', borderRadius: '2px',
                    background: 'rgba(255,255,255,0.08)', margin: '4px 0 3px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: '2px',
                      background: b.color,
                      width: `${pct}%`,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>
                    {b.progress ?? 0}/{b.total}
                  </div>
                </>
              )}

              {/* Unlocked tick */}
              {b.unlocked && (
                <div style={{ fontSize: '10px', color: b.color, fontWeight: 700 }}>✓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
