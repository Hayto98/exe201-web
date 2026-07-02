'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { EsmeryState } from '@/lib/repository/types';
import * as memory from '@/lib/repository/memoryRepository';
import { loadUserStateFromSupabase, upsertPaymentOrderToSupabase } from '@/lib/repository/supabaseRepository';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { mapAuthErrorMessage } from '@/lib/auth/errors';
import { LanguageProvider } from '@/lib/i18n/useLanguage';
import { useAutoRefresh } from '@/lib/hooks/useAutoRefresh';

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
const SUPABASE_PROJECT_KEY = 'esmery-supabase-project';

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

/**
 * Detect if Supabase project has changed (e.g. new env).
 * If so, clear all old sessions so user must re-authenticate.
 */
function detectProjectChange(): boolean {
  if (typeof window === 'undefined') return false;
  const currentUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const savedUrl = localStorage.getItem(SUPABASE_PROJECT_KEY);

  if (currentUrl && savedUrl && savedUrl !== currentUrl) {
    // Project changed! Clear everything
    console.log('[auth] Supabase project changed, clearing old sessions...');
    localStorage.removeItem(DEMO_SESSION_KEY);
    localStorage.removeItem(SUPABASE_PROJECT_KEY);
    // Clear all supabase-related storage items
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    // Save new project URL
    localStorage.setItem(SUPABASE_PROJECT_KEY, currentUrl);
    return true;
  }

  // Save current project URL if not saved yet
  if (currentUrl && !savedUrl) {
    localStorage.setItem(SUPABASE_PROJECT_KEY, currentUrl);
  }

  return false;
}

async function fetchAuthSession(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const body = (await res.json()) as { user?: AuthUser | null };
    return body.user ?? null;
  } catch {
    return null;
  }
}

async function postAuthJson<T>(path: string, payload?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch';
    throw new Error(mapAuthErrorMessage(message));
  }

  const body = (await res.json().catch(() => ({}))) as { error?: string; user?: AuthUser };
  if (!res.ok) {
    throw new Error(body.error ?? mapAuthErrorMessage('Request failed'));
  }
  return body as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const projectChanged = detectProjectChange();

    if (isSupabaseConfigured()) {
      if (projectChanged) {
        fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
        setUser(null);
        setLoading(false);
        return;
      }

      fetchAuthSession()
        .then((sessionUser) => setUser(sessionUser))
        .finally(() => setLoading(false));
      return;
    }

    setUser(loadDemoSession());
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured()) {
      const body = await postAuthJson<{ user: AuthUser }>('/api/auth/signin', {
        email: email.trim().toLowerCase(),
        password,
      });
      setUser(body.user);
      return;
    }
    const demo = memory.authenticateDemo(email, password);
    if (!demo) throw new Error('Invalid email or password');
    const session = { id: demo.id, email: demo.email, display_name: demo.display_name };
    saveDemoSession(session);
    setUser(session);
  };

  const signUp = async (name: string, email: string, password: string) => {
    if (isSupabaseConfigured()) {
      try {
        const body = await postAuthJson<{ user: AuthUser }>('/api/auth/signup', {
          name,
          email: email.trim().toLowerCase(),
          password,
        });
        setUser(body.user);
      } catch (err) {
        if (err instanceof Error) {
          if (err.message === 'RATE_LIMIT') throw new Error('RATE_LIMIT');
          if (err.message === 'CONFIRM_EMAIL') throw new Error('CONFIRM_EMAIL');
          throw new Error(mapAuthErrorMessage(err.message));
        }
        throw err;
      }
      return;
    }
    memory.registerDemoUser(email, password, name);
    const demo = memory.authenticateDemo(email, password)!;
    const session = { id: demo.id, email: demo.email, display_name: demo.display_name };
    saveDemoSession(session);
    setUser(session);
  };

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    }
    saveDemoSession(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      if (error) throw new Error(mapAuthErrorMessage(error.message));
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

  // Auto-refresh notifications, nudges, check-in times (matches Android 10s polling)
  useAutoRefresh(refresh, Boolean(user), 15_000);

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
