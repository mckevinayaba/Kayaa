import { useEffect, useState } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  visitorName: string | null;
  note: string | null;
  createdAt: string;
  isGhost: boolean;
}

interface RecentActivityProps {
  venueId: string;
  limit?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return 'Just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const AVATAR_COLORS = ['#39D98A', '#F5A623', '#60A5FA', '#F472B6', '#A78BFA', '#FB923C'];

// ── Component ─────────────────────────────────────────────────────────────────

export function RecentActivity({ venueId, limit = 10 }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('check_ins')
      .select('id, visitor_name, note, created_at, is_ghost, is_public')
      .eq('venue_id', venueId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (data) {
          setActivities(
            data.map((r: {
              id: string;
              visitor_name?: string | null;
              note?: string | null;
              created_at: string;
              is_ghost?: boolean;
            }) => ({
              id: r.id,
              visitorName: r.is_ghost ? null : (r.visitor_name ?? null),
              note: r.note ?? null,
              createdAt: r.created_at,
              isGhost: !!r.is_ghost,
            })),
          );
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));

    // Realtime: prepend new public check-ins as they arrive
    const channel = supabase
      .channel(`recentactivity:${venueId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'check_ins', filter: `venue_id=eq.${venueId}` },
        payload => {
          const r = payload.new as Record<string, unknown>;
          if (!r.is_public) return;
          const entry: ActivityItem = {
            id: String(r.id ?? Math.random()),
            visitorName: r.is_ghost ? null : (r.visitor_name as string | null) ?? null,
            note: (r.note as string | null) ?? null,
            createdAt: String(r.created_at ?? new Date().toISOString()),
            isGhost: !!r.is_ghost,
          };
          setActivities(prev => [entry, ...prev].slice(0, limit));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [venueId, limit]);

  if (!loaded || activities.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff', margin: 0 }}>
          Recent Activity
        </h2>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          fontSize: '11px', fontWeight: 700, color: '#39D98A',
          background: 'rgba(57,217,138,0.1)', padding: '3px 10px', borderRadius: '20px',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#39D98A', display: 'inline-block', animation: 'navLocPulse 1.2s ease-in-out infinite' }} />
          Live
        </span>
      </div>

      {/* Activity list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {activities.map((a, i) => {
          const displayName = a.visitorName ?? 'Someone';
          const initial     = displayName === 'Someone' ? '👤' : displayName[0].toUpperCase();
          const color       = AVATAR_COLORS[i % AVATAR_COLORS.length];

          return (
            <div
              key={a.id}
              style={{
                display: 'flex', gap: '12px', padding: '14px',
                background: '#161B22', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: `${color}18`, border: `1.5px solid ${color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color,
              }}>
                {initial}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                    {displayName}
                  </span>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                    checked in
                  </span>
                  <MapPin size={12} color="#39D98A" />
                </div>

                {a.note && (
                  <p style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                    color: 'rgba(255,255,255,0.7)', lineHeight: 1.55,
                    margin: '0 0 6px',
                  }}>
                    "{a.note}"
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={11} color="rgba(255,255,255,0.3)" />
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                    {timeAgo(a.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
