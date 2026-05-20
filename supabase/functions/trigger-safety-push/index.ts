// ─────────────────────────────────────────────────────────────────────────────
// trigger-safety-push — called by the Kayaa client immediately after a safety
// board post is created.
//
// This function owns the qualification gate so the client cannot be spoofed
// into sending spam notifications.
//
// Qualification rules (ALL must pass):
//   1. Post category = 'safety'
//   2. is_local_verified = true  (GPS-confirmed suburb match)
//   3. Post title/content length ≥ 20 characters
//
// Deduplication: notification_log (event_type='safety_push', entity_id=post_id)
//
// Auth: Supabase anon JWT — pass as  Authorization: Bearer <anon_key>
//       (prevents completely unauthenticated calls; no extra secret needed)
//
// Required Supabase secrets (shared with send-push):
//   VAPID_SUBJECT          e.g. mailto:hello@kayaa.africa
//   VAPID_PUBLIC_KEY       base64url VAPID public key
//   VAPID_PRIVATE_KEY      base64url VAPID private key
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush           from 'https://esm.sh/web-push@3.6.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,  // bypasses RLS for reads/writes
);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST')   return new Response('Method not allowed', { status: 405, headers: CORS });

  // ── Minimal auth: require a Supabase JWT (anon or user) ───────────────────
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ ok: false, error: 'Unauthorized' }, 401);

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { post_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const postId = body.post_id?.trim();
  if (!postId) return json({ ok: false, error: 'post_id required' }, 400);

  // ── Fetch the post ─────────────────────────────────────────────────────────
  const { data: post, error: fetchErr } = await supabase
    .from('board_posts')
    .select('id, category, title, neighbourhood, is_local_verified')
    .eq('id', postId)
    .single();

  if (fetchErr || !post) return json({ ok: false, error: 'Post not found' }, 404);

  // ── Qualification gate ─────────────────────────────────────────────────────
  if (post.category !== 'safety')      return json({ ok: false, error: 'Not a safety post' });
  if (!post.is_local_verified)          return json({ ok: false, error: 'Not GPS-verified' });
  const alertText = (post.title ?? '').trim();
  if (alertText.length < 20)            return json({ ok: false, error: 'Text too short' });
  const neighbourhood = (post.neighbourhood ?? '').trim();
  if (!neighbourhood)                   return json({ ok: false, error: 'No neighbourhood on post' });

  // ── Deduplication: only send once per post ─────────────────────────────────
  const { error: dupErr } = await supabase
    .from('notification_log')
    .insert({ event_type: 'safety_push', entity_id: postId });

  if (dupErr) {
    if (dupErr.code === '23505') {
      // Already sent for this post — idempotent success
      return json({ ok: true, sent: 0, message: 'Already sent' });
    }
    // Log but don't block — notification_log failure shouldn't silence the alert
    console.warn('[trigger-safety-push] notification_log insert failed:', dupErr.message);
  }

  // ── Fetch subscribers for this neighbourhood ───────────────────────────────
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .ilike('neighbourhood', neighbourhood);

  if (!subs || subs.length === 0) {
    return json({ ok: true, sent: 0, failed: 0, message: 'No subscribers in neighbourhood' });
  }

  // ── Build notification payload ─────────────────────────────────────────────
  const notifPayload = JSON.stringify({
    title: `Safety alert in ${neighbourhood} 🚨`,
    body:  alertText.slice(0, 80) + (alertText.length > 80 ? '…' : ''),
    url:   `/board?cat=safety`,
    tag:   `safety-${postId}`,
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
  });

  // ── Fan-out (parallel, max 6-hour TTL for safety alerts) ──────────────────
  let sent   = 0;
  let failed = 0;
  const staleEndpoints: string[] = [];

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notifPayload,
        { TTL: 60 * 60 * 6 },   // 6 hours — meaningful for safety but not forever
      ),
    ),
  );

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      sent++;
    } else {
      failed++;
      const err = result.reason as { statusCode?: number };
      // 410 Gone / 404 = browser permanently unsubscribed — remove it
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        staleEndpoints.push(subs[i].endpoint);
      }
      console.warn(`[trigger-safety-push] Failed for sub ${subs[i].id}:`, err);
    }
  });

  // ── Prune stale subscriptions ──────────────────────────────────────────────
  if (staleEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', staleEndpoints);
  }

  console.log(`[trigger-safety-push] post=${postId} suburb=${neighbourhood} sent=${sent} failed=${failed} stale=${staleEndpoints.length}`);

  return json({ ok: true, sent, failed, stale_removed: staleEndpoints.length });
});
