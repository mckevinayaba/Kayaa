// ─────────────────────────────────────────────────────────────────────────────
// refresh-place-status — Supabase Edge Function
// Runs daily at 7AM SAST (05:00 UTC) via pg_cron or manual trigger.
// Updates every venue's status to 'open' or 'closed' based on opening_hours.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Day names used in opening_hours strings
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Convert "9am", "9:30am", "21:00" etc → minutes since midnight
function parseTime(t: string): number | null {
  t = t.trim().toLowerCase();
  const ampm = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = parseInt(ampm[2] ?? '0');
    if (ampm[3] === 'pm' && h !== 12) h += 12;
    if (ampm[3] === 'am' && h === 12) h = 0;
    return h * 60 + m;
  }
  const h24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) return parseInt(h24[1]) * 60 + parseInt(h24[2]);
  return null;
}

// Returns true if the opening_hours string suggests the venue is open right now.
// Handles common formats:
//   "Mon–Fri 7am – 5pm · Sat 8am – 3pm"
//   "Saturday 9am – 3pm"
//   "Open daily"
//   "Fri–Sat from 9pm"
//   "Mon–Sat 8am – 7pm"
function isOpenNow(hours: string | null, nowDay: number, nowMinutes: number): boolean {
  if (!hours) return true; // no hours = assume open
  const h = hours.toLowerCase();
  if (h.includes('open daily') || h.includes('24 hours') || h.includes('24hrs')) return true;

  // Split on " · " to handle multi-segment strings like "Mon–Fri 7am–5pm · Sat 8am–3pm"
  const segments = h.split(/\s*[·•]\s*/);

  for (const seg of segments) {
    // Try to extract day range and time range from each segment
    const match = seg.match(
      /([a-z]+(?:[–\-][a-z]+)?)\s+(?:from\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:–|-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|late)/i
    );
    if (!match) continue;

    const dayPart  = match[1];
    const openStr  = match[2];
    const closeStr = match[3];

    // Resolve which days this segment covers
    const dayRange = dayPart.split(/[–\-]/);
    let startDay = -1, endDay = -1;

    for (let d = 0; d < 7; d++) {
      if (DAY_NAMES[d].toLowerCase() === dayRange[0].slice(0, 3) ||
          DAY_FULL[d].toLowerCase()  === dayRange[0]) {
        startDay = d;
      }
      if (dayRange[1] && (
          DAY_NAMES[d].toLowerCase() === dayRange[1].slice(0, 3) ||
          DAY_FULL[d].toLowerCase()  === dayRange[1])) {
        endDay = d;
      }
    }
    if (startDay === -1) continue;
    if (endDay   === -1) endDay = startDay;

    // Check if today falls in this range
    const inRange = startDay <= endDay
      ? nowDay >= startDay && nowDay <= endDay
      : nowDay >= startDay || nowDay <= endDay; // wraps Sun

    if (!inRange) continue;

    // Check time
    const open  = parseTime(openStr);
    const close = closeStr.trim() === 'late' ? 23 * 60 + 59 : parseTime(closeStr);
    if (open === null || close === null) continue;

    if (close < open) {
      // Past midnight: open if after open OR before close
      if (nowMinutes >= open || nowMinutes < close) return true;
    } else {
      if (nowMinutes >= open && nowMinutes < close) return true;
    }
  }

  return false;
}

Deno.serve(async (_req) => {
  try {
    // Current time in SAST (UTC+2)
    const now      = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const nowDay   = now.getUTCDay();   // 0=Sun … 6=Sat
    const nowMins  = now.getUTCHours() * 60 + now.getUTCMinutes();

    // Fetch all active venues with opening_hours
    const { data: venues, error } = await supabase
      .from('venues')
      .select('id, opening_hours, status')
      .eq('is_active', true);

    if (error) throw error;

    let updated = 0;
    const updates: { id: string; status: string }[] = [];

    for (const v of venues ?? []) {
      // If status is 'busy', leave it — only real check-ins should set busy
      if (v.status === 'busy') continue;

      const shouldBeOpen = isOpenNow(v.opening_hours, nowDay, nowMins);
      const newStatus    = shouldBeOpen ? 'open' : 'closed';

      if (v.status !== newStatus) {
        updates.push({ id: v.id, status: newStatus });
      }
    }

    // Batch update in groups of 50
    for (let i = 0; i < updates.length; i += 50) {
      const batch = updates.slice(i, i + 50);
      for (const u of batch) {
        await supabase
          .from('venues')
          .update({ status: u.status })
          .eq('id', u.id);
        updated++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, checked: venues?.length ?? 0, updated }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
