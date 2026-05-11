// notify-board-reply — fired by DB webhook on board_post_comments INSERT
// Emails the original post author when the first comment arrives.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL     = Deno.env.get('KAYAA_FROM_EMAIL') ?? 'hello@kayaa.co.za';
const BASE_URL       = Deno.env.get('KAYAA_BASE_URL')   ?? 'https://kayaa.co.za';
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
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json();
  const comment = payload.record; // { id, post_id, user_id, content, created_at }

  if (!comment?.post_id) return new Response('No post_id', { status: 400 });

  // ── Only notify on the first reply ───────────────────────────────────────

  const dedupeKey = `board_reply::${comment.post_id}`;
  if (await alreadySent('board_reply', comment.post_id)) {
    return new Response('Already notified', { status: 200 });
  }

  // ── Fetch the original post + author ─────────────────────────────────────

  const { data: post } = await supabase
    .from('board_posts')
    .select('id, content, user_id, neighbourhood')
    .eq('id', comment.post_id)
    .maybeSingle();

  if (!post) return new Response('Post not found', { status: 404 });

  // Don't notify if the commenter is the post author
  if (comment.user_id === post.user_id) {
    return new Response('Author replied to own post', { status: 200 });
  }

  // ── Fetch post author's email from auth.users via a join ─────────────────
  // We use a raw RPC or the admin API to get email — service role can read auth.users

  const { data: authorData } = await supabase
    .from('profiles')
    .select('email, display_name')
    .eq('id', post.user_id)
    .maybeSingle();

  // Fallback: try auth.users if profiles doesn't have email
  let toEmail   = authorData?.email;
  let toName    = authorData?.display_name || 'there';

  if (!toEmail) {
    const { data: { user } } = await supabase.auth.admin.getUserById(post.user_id);
    toEmail = user?.email;
  }

  if (!toEmail) return new Response('No author email', { status: 200 });

  // ── Build email ───────────────────────────────────────────────────────────

  const postPreview    = (post.content ?? '').slice(0, 120);
  const replyPreview   = (comment.content ?? '').slice(0, 200);
  const boardUrl       = `${BASE_URL}/board`;

  await sendEmail(
    toEmail,
    'Someone replied to your post on Kayaa',
    `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:16px">Hi ${toName},</p>
      <p style="font-size:16px">Someone replied to your post on the ${post.neighbourhood || 'neighbourhood'} board.</p>

      <div style="background:#f9f9f9;border-left:3px solid #ddd;padding:10px 14px;border-radius:0 6px 6px 0;margin:16px 0;color:#555;font-size:14px">
        Your post: "${postPreview}${post.content?.length > 120 ? '…' : ''}"
      </div>

      <div style="background:#f0fdf4;border-left:3px solid #39D98A;padding:10px 14px;border-radius:0 6px 6px 0;margin:16px 0;font-size:15px;color:#1a1a1a">
        ${replyPreview}${comment.content?.length > 200 ? '…' : ''}
      </div>

      <p style="margin:28px 0">
        <a href="${boardUrl}" style="background:#39D98A;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          View the conversation
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
      <p style="font-size:12px;color:#aaa">Kayaa neighbourhood board</p>
    </div>
    `,
  );

  await markSent('board_reply', comment.post_id);

  return new Response('OK', { status: 200 });
});
