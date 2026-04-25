import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { signInWithEmail, signOut as authSignOut } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // Extract magic link tokens from URL hash (#access_token=...&refresh_token=...)
      // Supabase puts these there when emailRedirectTo lands the user back in the app.
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken  = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        });
        // Remove the tokens from the URL so they're not exposed in history
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Now getSession() will return the freshly-set session (or any existing one)
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch {
        // Session check failed — treat as unauthenticated
      } finally {
        setLoading(false);
      }
    }

    init();

    // Keep session state in sync for sign-out and token refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string) {
    const { error } = await signInWithEmail(email);
    return { error: error as Error | null };
  }

  async function signOut() {
    await authSignOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
