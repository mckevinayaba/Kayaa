// ─────────────────────────────────────────────────────────────────────────────
// Kayaa Service Worker — Web Push handler
// Handles: push events, notification clicks, subscription renewal
// ─────────────────────────────────────────────────────────────────────────────

const APP_URL = self.location.origin;

// ── Push event ────────────────────────────────────────────────────────────────
// Receives the push payload and shows a notification.
// Payload shape: { title, body, url?, icon?, badge?, tag? }

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Kayaa', body: event.data.text() };
  }

  const {
    title = 'Kayaa',
    body  = '',
    url   = '/feed',
    icon  = '/icon-192.png',
    badge = '/icon-192.png',
    tag   = 'kayaa-alert',
  } = payload;

  const options = {
    body,
    icon,
    badge,
    tag,
    renotify: true,          // re-ring even when same tag replaces an old notif
    requireInteraction: false,
    data: { url: `${APP_URL}${url}` },
    actions: [
      { action: 'open',    title: 'Open'    },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url ?? `${APP_URL}/feed`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing Kayaa tab if one is open
      for (const client of clientList) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new tab
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Push subscription change ──────────────────────────────────────────────────
// Browser rotated the subscription — tell the app so it can re-save to Supabase.

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((newSub) => {
        // Post the new subscription to all open app windows so they can re-save it
        return clients.matchAll({ type: 'window' }).then((clientList) => {
          for (const client of clientList) {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: newSub.toJSON(),
            });
          }
        });
      })
  );
});

// ── Install + activate (minimal — no asset caching, push-only SW) ─────────────

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
