import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
