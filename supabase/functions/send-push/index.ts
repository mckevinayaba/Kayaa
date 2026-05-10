// ─────────────────────────────────────────────────────────────────────────────
// send-push — Supabase Edge Function
//
// Sends a Web Push notification to all subscribers in a neighbourhood (or city).
//
// Request body (JSON):
// {
//   neighbourhood: string,    // target area e.g. "Berea" (exact match, case-insensitive)
//   city?:         string,    // fallback — send to whole city if neighbourhood is ''
//   title:         string,    // notification title
//   body:          string,    // notification body
//   url?:          string,    // path to open on click e.g. "/feed" (default: "/feed")
//   tag?:          string,    // dedup tag — same tag replaces the old notification
//   secret:        string,    // SEND_PUSH_SECRET env var — prevents unauthenticated sends
// }
//
// Required Supabase secrets (set via: supabase secrets set KEY=value):
//   VAPID_SUBJECT         — mailto:you@example.com  or  https://yourapp.com
//   VAPID_PUBLIC_KEY      — base64url VAPID public key
//   VAPID_PRIVATE_KEY     — base64url VAPID private key
//   SEND_PUSH_SECRET      — a long random string for simple bearer auth
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush           from 'https://esm.sh/web-push@3.6.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,  // bypasses RLS
);

// ── VAPID setup ───────────────────────────────────────────────────────────────

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

// ── CORS headers (only called server-to-server, but keep consistent) ──────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  // ── Parse body ─────────────────────────────────────────────────────────────

  let body: {
    neighbourhood?: string;
    city?:          string;
    title:          string;
    body:           string;
    url?:           string;
    tag?:           string;
    secret:         string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  // Simple pre-shared secret — enough for a one-person admin sending alerts

  const expectedSecret = Deno.env.get('SEND_PUSH_SECRET');
  if (!expectedSecret || body.secret !== expectedSecret) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Validate required fields ───────────────────────────────────────────────

  if (!body.title || !body.body) {
    return new Response(JSON.stringify({ ok: false, error: 'title and body are required' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const neighbourhood = body.neighbourhood?.trim() ?? '';
  const city          = body.city?.trim()          ?? '';

  if (!neighbourhood && !city) {
    return new Response(JSON.stringify({ ok: false, error: 'neighbourhood or city is required' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Fetch target subscriptions ─────────────────────────────────────────────

  let query = supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth');

  if (neighbourhood) {
    // Exact neighbourhood match (case-insensitive)
    query = query.ilike('neighbourhood', neighbourhood);
  } else {
    // City-wide fallback
    query = query.ilike('city', city);
  }

  const { data: subs, error: fetchError } = await query;

  if (fetchError) {
    return new Response(JSON.stringify({ ok: false, error: fetchError.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0, message: 'No subscribers found' }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Build payload ──────────────────────────────────────────────────────────

  const payload = JSON.stringify({
    title: body.title,
    body:  body.body,
    url:   body.url   ?? '/feed',
    tag:   body.tag   ?? 'kayaa-neighbourhood',
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
  });

  // ── Fan-out ────────────────────────────────────────────────────────────────

  let sent   = 0;
  let failed = 0;
  const staleEndpoints: string[] = [];

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
        { TTL: 60 * 60 * 24 },  // 24-hour TTL — discard if device offline too long
      )
    )
  );

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      sent++;
    } else {
      failed++;
      const err = result.reason as { statusCode?: number };
      // 410 Gone = browser revoked the subscription — clean it up
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        staleEndpoints.push(subs[i].endpoint);
      }
      console.warn(`[send-push] Failed for sub ${subs[i].id}:`, err);
    }
  });

  // ── Remove stale subscriptions (browser unsubscribed) ─────────────────────

  if (staleEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', staleEndpoints);
  }

  return new Response(
    JSON.stringify({ ok: true, sent, failed, stale_removed: staleEndpoints.length }),
    { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
  );
});
