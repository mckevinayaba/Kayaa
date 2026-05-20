// notify-safety-alert — fired by DB webhook on user_posts INSERT
// Emails opted-in users in the same suburb when a safety-tagged post appears.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL     = Deno.env.get('KAYAA_FROM_EMAIL') ?? 'hello@kayaa.africa';
const BASE_URL       = Deno.env.get('KAYAA_BASE_URL')   ?? 'https://kayaa.africa';
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')   ?? '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

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

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json();
  const post = payload.record; // { id, content, neighbourhood, tag, created_at, ... }

  // Only fan out for safety-tagged posts
  if (!post?.id || post.tag !== 'safety') {
    return new Response('Not a safety post', { status: 200 });
  }

  const suburb = post.neighbourhood;
  if (!suburb) return new Response('No neighbourhood on post', { status: 200 });

  // ── Fetch opted-in emails for this suburb ─────────────────────────────────

  const { data: opts } = await supabase
    .from('neighbourhood_alert_opts')
    .select('email, user_id')
    .ilike('suburb', suburb)
    .eq('opted_in', true);

  if (!opts || opts.length === 0) {
    return new Response('No opted-in users', { status: 200 });
  }

  // ── Build email content ───────────────────────────────────────────────────

  const preview  = (post.content ?? '').slice(0, 200);
  const postUrl  = `${BASE_URL}/board`;
  const optOutUrl = `${BASE_URL}/profile`; // user manages prefs in profile

  const subject = `⚠️ Safety alert in ${suburb}`;
  const html = `
  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
    <div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px">
      <strong style="color:#92400e">Safety alert — ${suburb}</strong>
    </div>
    <p style="font-size:16px;line-height:1.6;color:#333">${preview}${post.content?.length > 200 ? '…' : ''}</p>
    <p style="margin:28px 0">
      <a href="${postUrl}" style="background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Read the full post
      </a>
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
    <p style="font-size:12px;color:#aaa">
      You're receiving this because you opted in to ${suburb} safety alerts on Kayaa.<br>
      <a href="${optOutUrl}" style="color:#aaa">Manage your alert preferences</a>
    </p>
  </div>
  `;

  // ── Send to each opted-in user (batch, fire-and-forget) ───────────────────

  const sends = opts.map((opt: { email: string }) => sendEmail(opt.email, subject, html));
  await Promise.allSettled(sends);

  return new Response(`Sent to ${opts.length} user(s)`, { status: 200 });
});
