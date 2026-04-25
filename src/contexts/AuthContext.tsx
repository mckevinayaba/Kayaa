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
    // On mount — restore any existing session (including magic link callbacks).
    // Supabase automatically exchanges the #access_token hash fragment, so
    // getSession() will already return the new session after a magic link click.
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch(() => {
        // Session check failed — treat as unauthenticated
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // When a magic link is clicked the browser lands with an access_token hash.
      // Supabase fires SIGNED_IN — redirect to the dashboard automatically.
      if (
        event === 'SIGNED_IN' &&
        typeof window !== 'undefined' &&
        window.location.hash.includes('access_token')
      ) {
        window.location.replace('/dashboard');
      }
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
