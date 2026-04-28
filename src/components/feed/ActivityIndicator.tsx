import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Activity {
  viewing:        number;   // users currently on the venue page (presence)
  checkedInToday: number;   // check-ins in the last 24 hours
  trending:       boolean;  // check-ins growing week-on-week
}

interface ActivityIndicatorProps {
  venueId:           string;
  checkinsToday?:    number;  // pre-loaded from venue object (avoids extra query)
  checkinsThisWeek?: number;
  checkinsLastWeek?: number;
  /** Compact single-line variant (default false = badge row) */
  compact?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivityIndicator({
  venueId,
  checkinsToday    = 0,
  checkinsThisWeek = 0,
  checkinsLastWeek = 0,
  compact = false,
}: ActivityIndicatorProps) {
  const [activity, setActivity] = useState<Activity>({
    viewing:        0,
    checkedInToday: checkinsToday,
    trending:       checkinsThisWeek > 0 && checkinsThisWeek > checkinsLastWeek * 1.3,
  });

  // Track whether the channel was subscribed successfully
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!venueId) return;

    // ── Presence: count how many clients are viewing this venue ───────────────
    const channel = supabase.channel(`venue-presence:${venueId}`, {
      config: { presence: { key: venueId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.values(state).reduce((n, arr) => n + arr.length, 0);
        setActivity(prev => ({ ...prev, viewing: count }));
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() }).catch(() => {/* non-critical */});
        }
      });

    channelRef.current = channel;

    // ── Real-time: update check-in count when a new check-in arrives ──────────
    const checkinChannel = supabase
      .channel(`venue-checkins:${venueId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'check_ins',
          filter: `venue_id=eq.${venueId}`,
        },
        () => {
          // Optimistically increment the today counter on new check-in
          setActivity(prev => ({ ...prev, checkedInToday: prev.checkedInToday + 1 }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(checkinChannel);
      channelRef.current = null;
    };
  }, [venueId]);

  // ── Nothing interesting to show ────────────────────────────────────────────
  if (activity.viewing === 0 && activity.checkedInToday === 0 && !activity.trending) {
    return null;
  }

  if (compact) {
    // Single-line inline variant used inside venue cards
    const parts: string[] = [];
    if (activity.viewing > 1) parts.push(`👁 ${activity.viewing}`);
    if (activity.checkedInToday > 0) parts.push(`📍 ${activity.checkedInToday} today`);
    if (activity.trending) parts.push('🔥 Trending');
    if (parts.length === 0) return null;
    return (
      <span style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
        color: 'rgba(255,255,255,0.4)', fontWeight: 500,
      }}>
        {parts.join('  ·  ')}
      </span>
    );
  }

  // Full badge row variant used on venue pages
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {activity.viewing > 1 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
          borderRadius: '20px', padding: '3px 10px',
          fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
          color: '#60A5FA',
        }}>
          👁 {activity.viewing} viewing
        </span>
      )}
      {activity.checkedInToday > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          background: 'rgba(57,217,138,0.1)', border: '1px solid rgba(57,217,138,0.2)',
          borderRadius: '20px', padding: '3px 10px',
          fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
          color: '#39D98A',
        }}>
          📍 {activity.checkedInToday} today
        </span>
      )}
      {activity.trending && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
          borderRadius: '20px', padding: '3px 10px',
          fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
          color: '#F97316',
        }}>
          🔥 Trending
        </span>
      )}
    </div>
  );
}
