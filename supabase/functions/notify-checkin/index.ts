// notify-checkin — fired by DB webhook on check_ins INSERT
// Sends owner email on every check-in, plus a milestone email at 10 check-ins this week.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL       = Deno.env.get('KAYAA_FROM_EMAIL') ?? 'hello@kayaa.africa';
const BASE_URL         = Deno.env.get('KAYAA_BASE_URL')   ?? 'https://kayaa.africa';
const WEBHOOK_SECRET   = Deno.env.get('WEBHOOK_SECRET')   ?? '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// ─── Send via Resend ──────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
  }
}

// ─── Dedup helper ─────────────────────────────────────────────────────────────

async function alreadySent(eventType: string, entityId: string): Promise<boolean> {
  const { data } = await supabase
    .from('notification_log')
    .select('id')
    .eq('event_type', eventType)
    .eq('entity_id', entityId)
    .maybeSingle();
  return !!data;
}

async function markSent(eventType: string, entityId: string) {
  await supabase.from('notification_log').insert({ event_type: eventType, entity_id: entityId });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Verify webhook secret
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json();
  const checkin = payload.record; // { id, venue_id, user_id, created_at, ... }

  if (!checkin?.venue_id) {
    return new Response('No venue_id', { status: 400 });
  }

  // ── 1. Fetch venue + owner ────────────────────────────────────────────────

  const { data: venue } = await supabase
    .from('venues')
    .select('id, name, slug, location')
    .eq('id', checkin.venue_id)
    .maybeSingle();

  if (!venue) return new Response('Venue not found', { status: 404 });

  const { data: owner } = await supabase
    .from('venue_owners')
    .select('email, display_name')
    .eq('venue_id', checkin.venue_id)
    .maybeSingle();

  if (!owner?.email) return new Response('No owner email', { status: 200 });

  // ── 2. Check-in email (once per check-in, no dedup needed) ───────────────

  const venueUrl = `${BASE_URL}/venue/${venue.slug}`;
  const dashUrl  = `${BASE_URL}/dashboard`;
  const ownerName = owner.display_name || 'there';

  await sendEmail(
    owner.email,
    `New check-in at ${venue.name} 👋`,
    `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:16px">Hi ${ownerName},</p>
      <p style="font-size:16px">Someone just checked in at <strong>${venue.name}</strong>.</p>
      <p style="margin:28px 0">
        <a href="${venueUrl}" style="background:#39D98A;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          View live page
        </a>
      </p>
      <p style="font-size:14px;color:#666">
        See who's stopping by on your <a href="${dashUrl}" style="color:#39D98A">dashboard</a>.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
      <p style="font-size:12px;color:#aaa">Kayaa · ${venue.location || 'South Africa'}</p>
    </div>
    `,
  );

  // ── 3. Milestone: 10 check-ins this week ─────────────────────────────────

  const weekKey = `milestone_10::${venue.id}`;

  if (!(await alreadySent('milestone_10', venue.id))) {
    // Count this week's check-ins
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('check_ins')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venue.id)
      .gte('created_at', weekStart.toISOString());

    if ((count ?? 0) >= 10) {
      await sendEmail(
        owner.email,
        `🎉 ${venue.name} hit 10 check-ins this week!`,
        `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
          <p style="font-size:16px">Hi ${ownerName},</p>
          <p style="font-size:18px;font-weight:600">${venue.name} just hit 10 check-ins this week. 🎉</p>
          <p style="font-size:16px;color:#444">
            Your place is becoming a regular spot in the neighbourhood.
            People keep coming back — that's the whole game.
          </p>
          <p style="margin:28px 0">
            <a href="${dashUrl}" style="background:#39D98A;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
              See your dashboard
            </a>
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
          <p style="font-size:12px;color:#aaa">Kayaa · ${venue.location || 'South Africa'}</p>
        </div>
        `,
      );
      await markSent('milestone_10', venue.id);
    }
  }

  return new Response('OK', { status: 200 });
});
