import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegularEntry {
  name: string;
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

    // Derive top regulars from check_ins.
    // Prefer display_name (real name from auth) over visitor_name (may be a UUID).
    supabase
      .from('check_ins')
      .select('display_name, visitor_name')
      .eq('venue_id', venueId)
      .eq('is_ghost', false)
      .then(({ data }) => {
        if (!data) return;

        // Tally visits per resolved name, skipping UUID-looking visitor_names
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const tally: Record<string, number> = {};

        for (const row of data) {
          // Use display_name if present, otherwise fall back to visitor_name
          // but only if it doesn't look like a UUID
          const rawName = row.display_name as string | null
            ?? (row.visitor_name && !UUID_RE.test(row.visitor_name) ? row.visitor_name : null);
          if (!rawName) continue;

          // Use only first name for privacy
          const name = rawName.split(' ')[0];
          tally[name] = (tally[name] ?? 0) + 1;
        }

        // Sort descending, keep top 10
        const sorted = Object.entries(tally)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, c]) => ({
            name,
            initial: name[0]?.toUpperCase() ?? '?',
            count:   c,
          }));

        setRegulars(sorted);
      });
  }, [venueId, count]);

  if (count === 0) return null;

  return (
    <div>
      <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff', marginBottom: '12px' }}>
        Regulars ({count.toLocaleString()})
      </h2>

      <div style={{
        background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '16px',
      }}>
        {/* Count line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Users size={16} color="rgba(255,255,255,0.4)" />
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
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
                  title={r.name}
                  style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    border: '2px solid var(--color-surface)',
                    background: `${color}1A`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
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
                border: '2px solid var(--color-surface)',
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
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
