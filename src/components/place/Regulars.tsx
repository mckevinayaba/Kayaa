import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegularEntry {
  initial: string;
  count: number;
}

interface RegularsProps {
  venueId: string;
  /** Pre-computed regulars count from the venues row */
  count: number;
}

// ── Avatar colours (consistent with VenuePage) ────────────────────────────────

const AVATAR_COLORS = ['#39D98A', '#F5A623', '#60A5FA', '#F472B6', '#A78BFA', '#FB923C'];

// ── Component ─────────────────────────────────────────────────────────────────

export function Regulars({ venueId, count }: RegularsProps) {
  const [regulars, setRegulars] = useState<RegularEntry[]>([]);

  useEffect(() => {
    if (count === 0) return;

    // Derive top regulars from check_ins — group by visitor_name, pick top 10
    supabase
      .from('check_ins')
      .select('visitor_name')
      .eq('venue_id', venueId)
      .eq('is_ghost', false)
      .not('visitor_name', 'is', null)
      .then(({ data }) => {
        if (!data) return;

        // Tally visits per name
        const tally: Record<string, number> = {};
        for (const row of data) {
          if (row.visitor_name) {
            tally[row.visitor_name] = (tally[row.visitor_name] ?? 0) + 1;
          }
        }

        // Sort descending, keep top 10
        const sorted = Object.entries(tally)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, c]) => ({ initial: name[0]?.toUpperCase() ?? '?', count: c }));

        setRegulars(sorted);
      });
  }, [venueId, count]);

  if (count === 0) return null;

  return (
    <div>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff', marginBottom: '12px' }}>
        Regulars ({count.toLocaleString()})
      </h2>

      <div style={{
        background: '#161B22', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '16px',
      }}>
        {/* Count line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Users size={16} color="rgba(255,255,255,0.4)" />
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            {count === 1 ? '1 person loves this place' : `${count.toLocaleString()} people love this place`}
          </p>
        </div>

        {/* Avatar stack */}
        {regulars.length > 0 && (
          <div style={{ display: 'flex' }}>
            {regulars.slice(0, 8).map((r, i) => {
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div
                  key={i}
                  title={`Regular visitor`}
                  style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    border: '2px solid #161B22',
                    background: `${color}1A`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
                    color,
                    marginLeft: i === 0 ? 0 : '-10px',
                    flexShrink: 0,
                    zIndex: regulars.length - i,
                    position: 'relative',
                  }}
                >
                  {r.initial}
                </div>
              );
            })}
            {count > 8 && (
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                border: '2px solid #161B22',
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700,
                color: 'rgba(255,255,255,0.45)',
                marginLeft: '-10px',
                flexShrink: 0,
                position: 'relative',
              }}>
                +{count - 8}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
