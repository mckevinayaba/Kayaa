import { supabase } from './supabase';

export async function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // After tapping the magic link, land on /setup.
      // SetupPage handles returning users instantly (kayaa_setup_done check).
      emailRedirectTo: `${window.location.origin}/setup`,
    },
  });
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // After Google auth, land on /setup (same bypass logic as email link)
      redirectTo: `${window.location.origin}/setup`,
    },
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
