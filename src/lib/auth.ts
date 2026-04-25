import { supabase } from './supabase';

export async function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
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
