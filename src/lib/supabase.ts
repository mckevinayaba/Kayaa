import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL      as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Guard: if env vars are missing the app will crash silently (blank screen).
// Show a visible error instead so the problem is immediately diagnosable.
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl      && 'VITE_SUPABASE_URL',
    !supabaseAnonKey  && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ');

  document.body.style.cssText =
    'margin:0;background:#0D1117;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;';
  document.body.innerHTML = `
    <div style="padding:32px;max-width:380px;text-align:center">
      <div style="font-size:40px;margin-bottom:16px">⚠️</div>
      <h2 style="color:#F87171;font-size:18px;font-weight:700;margin:0 0 12px">Missing environment variables</h2>
      <p style="color:rgba(255,255,255,0.55);font-size:14px;line-height:1.6;margin:0 0 8px">
        The following Vercel environment variables are not set:
      </p>
      <code style="display:block;color:#39D98A;font-size:13px;margin:8px 0 16px;word-break:break-all">${missing}</code>
      <p style="color:rgba(255,255,255,0.35);font-size:12px;line-height:1.6;margin:0">
        Go to Vercel → Settings → Environment Variables,
        add the missing keys, then redeploy.
      </p>
    </div>`;
  throw new Error(`Supabase env vars missing: ${missing}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session in localStorage so mobile browsers survive
    // page reloads, app-switch, and PWA restarts.
    persistSession: true,
    // Detect and exchange auth tokens / PKCE codes that Supabase appends
    // to the redirect URL (#access_token=... or ?code=...).
    detectSessionInUrl: true,
    // Automatically refresh the JWT before it expires (critical on mobile
    // where the app can be backgrounded for hours).
    autoRefreshToken: true,
    // Scoped storage key — avoids collisions if multiple Supabase projects
    // are ever open in the same browser.
    storageKey: 'kayaa-auth-token',
  },
});
