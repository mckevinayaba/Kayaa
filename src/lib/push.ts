// ─────────────────────────────────────────────────────────────────────────────
// push.ts — Web Push subscription helpers for Kayaa
//
// Flow:
//   1. registerSW()              — boot the service worker once on app load
//   2. isPushSupported()         — guard before showing the banner
//   3. getCurrentPermission()    — check existing Notification.permission
//   4. requestAndSubscribe()     — ask permission then create the subscription
//   5. saveSubscription()        — persist to Supabase push_subscriptions table
//   6. unsubscribe()             — clean up if user revokes (future settings page)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';

// The VAPID public key is safe to embed in the client bundle.
// Generate your pair once: npx web-push generate-vapid-keys
// Then set VITE_VAPID_PUBLIC_KEY in your .env file.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

// ─── Support guard ────────────────────────────────────────────────────────────

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager'   in window &&
    'Notification'  in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

export function getCurrentPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// ─── Service worker registration ──────────────────────────────────────────────

let _swRegistration: ServiceWorkerRegistration | null = null;

export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    _swRegistration = reg;

    // Listen for subscription rotations from the SW
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        const sub = event.data.subscription as PushSubscriptionJSON;
        // Re-save silently — neighbourhood comes from localStorage snapshot set at subscribe time
        const neighbourhood = localStorage.getItem('kayaa_push_neighbourhood') ?? '';
        const city          = localStorage.getItem('kayaa_push_city')          ?? '';
        if (sub && neighbourhood) {
          await _saveRaw(sub, neighbourhood, city);
        }
      }
    });

    return reg;
  } catch (err) {
    console.warn('[Kayaa Push] SW registration failed:', err);
    return null;
  }
}

// ─── Request permission + subscribe ──────────────────────────────────────────

export async function requestAndSubscribe(
  neighbourhood: string,
  city: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'not_supported' };

  // 1. Ask for Notification permission (only fires native prompt first time)
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission_denied' };
  }

  // 2. Get (or wait for) the SW registration
  let reg = _swRegistration;
  if (!reg) {
    try {
      reg = await navigator.serviceWorker.ready;
    } catch {
      return { ok: false, reason: 'sw_not_ready' };
    }
  }

  // 3. Subscribe to push
  // All modern browsers accept the base64url VAPID key directly as a string —
  // no need to convert to Uint8Array, which has TypeScript buffer-type issues.
  let subscription: PushSubscription;
  try {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: VAPID_PUBLIC_KEY!,
    });
  } catch (err) {
    console.warn('[Kayaa Push] Subscribe failed:', err);
    return { ok: false, reason: 'subscribe_failed' };
  }

  // 4. Snapshot neighbourhood so pushsubscriptionchange can re-save without context
  localStorage.setItem('kayaa_push_neighbourhood', neighbourhood);
  localStorage.setItem('kayaa_push_city',          city);

  // 5. Save to Supabase
  const { ok, error } = await _saveRaw(subscription.toJSON(), neighbourhood, city);
  if (!ok) {
    console.warn('[Kayaa Push] Failed to save subscription:', error);
    // Still return ok — push will work even if the DB save failed temporarily
  }

  return { ok: true };
}

// ─── Internal save ────────────────────────────────────────────────────────────

async function _saveRaw(
  sub: PushSubscriptionJSON,
  neighbourhood: string,
  city: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, error: 'malformed_subscription' };
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        endpoint:      sub.endpoint,
        p256dh:        sub.keys.p256dh,
        auth:          sub.keys.auth,
        neighbourhood,
        city,
        user_id:       user?.id ?? null,
        user_agent:    navigator.userAgent.slice(0, 200),
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Unsubscribe ──────────────────────────────────────────────────────────────

export async function unsubscribePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    // Remove from Supabase
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', sub.endpoint);

    await sub.unsubscribe();

    localStorage.removeItem('kayaa_push_neighbourhood');
    localStorage.removeItem('kayaa_push_city');
    localStorage.removeItem('kayaa_push_dismissed');
  } catch (err) {
    console.warn('[Kayaa Push] Unsubscribe failed:', err);
  }
}

// ─── Check if already subscribed ─────────────────────────────────────────────

export async function isAlreadySubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}
