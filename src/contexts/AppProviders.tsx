'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { EsmeryState } from '@/lib/repository/types';
import * as memory from '@/lib/repository/memoryRepository';
import { loadUserStateFromSupabase, upsertPaymentOrderToSupabase } from '@/lib/repository/supabaseRepository';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { LanguageProvider } from '@/lib/i18n/useLanguage';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_SESSION_KEY = 'esmery-demo-session';

function loadDemoSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDemoSession(user: AuthUser | null) {
  if (user) localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(DEMO_SESSION_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email ?? '',
            display_name:
              (data.user.user_metadata?.display_name as string) ??
              data.user.email?.split('@')[0] ??
              'User',
          });
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? '',
            display_name:
              (session.user.user_metadata?.display_name as string) ??
              session.user.email?.split('@')[0] ??
              'User',
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }

    setUser(loadDemoSession());
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      const u = {
        id: data.user!.id,
        email: data.user!.email ?? email,
        display_name: (data.user!.user_metadata?.display_name as string) ?? email.split('@')[0],
      };
      setUser(u);
      return;
    }
    const demo = memory.authenticateDemo(email, password);
    if (!demo) throw new Error('Invalid email or password');
    const session = { id: demo.id, email: demo.email, display_name: demo.display_name };
    saveDemoSession(session);
    setUser(session);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const normalized = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: { data: { display_name: name } },
      });
      if (error) throw error;
      await supabase.from('profiles').upsert({
        id: data.user!.id,
        display_name: name || normalized.split('@')[0],
        email: normalized,
      });
      setUser({
        id: data.user!.id,
        email: normalized,
        display_name: name || normalized.split('@')[0],
      });
      return;
    }
    memory.registerDemoUser(email, password, name);
    const demo = memory.authenticateDemo(email, password)!;
    const session = { id: demo.id, email: demo.email, display_name: demo.display_name };
    saveDemoSession(session);
    setUser(session);
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) await supabase.auth.signOut();
    saveDemoSession(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      if (error) throw error;
      return;
    }
    // Demo mode: simulate success
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

interface EsmeryContextValue {
  state: EsmeryState | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const EsmeryContext = createContext<EsmeryContextValue>({
  state: null,
  loading: true,
  refresh: async () => {},
});

export function EsmeryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<EsmeryState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setState(null);
      setLoading(false);
      return;
    }
    if (isSupabaseConfigured()) {
      const s = await loadUserStateFromSupabase(user.id, user.email, user.display_name);
      setState(s);
    } else {
      setState(memory.refreshState(user.id));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setState(null);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      if (isSupabaseConfigured()) {
        const s = await loadUserStateFromSupabase(user.id, user.email, user.display_name);
        setState(s);
      } else {
        setState(memory.loadUserState(user.id, user.email.includes('demo')));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <EsmeryContext.Provider value={{ state, loading, refresh }}>
      {children}
    </EsmeryContext.Provider>
  );
}

export function useEsmeryState() {
  return useContext(EsmeryContext);
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <EsmeryProvider>{children}</EsmeryProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
