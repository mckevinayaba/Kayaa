import { supabase } from './supabase';

export async function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // Land on /feed so the auth tokens in the URL hash are processed before
      // any React Router navigation can strip them. /setup used to be the
      // target but that redirect now strips the hash before AuthContext runs.
      emailRedirectTo: `${window.location.origin}/feed`,
    },
  });
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Same reason — land directly on /feed so the PKCE ?code= param
      // survives long enough for Supabase's detectSessionInUrl to exchange it.
      redirectTo: `${window.location.origin}/feed`,
    },
  });
}

// ── Phone OTP ─────────────────────────────────────────────────────────────────
// Requires phone provider enabled in Supabase dashboard (Twilio / Vonage).
// Works automatically once the provider is configured — no other code changes needed.

export async function signInWithPhone(phone: string) {
  return supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: true },
  });
}

export async function verifyPhoneOTP(phone: string, token: string) {
  return supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
