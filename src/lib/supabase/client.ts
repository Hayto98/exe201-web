import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export function normalizeSupabaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return Boolean(url && key && !url.includes('your-project') && key !== 'your-anon-key');
}

let browserClient: SupabaseClient | null = null;
let cachedUrl: string | null = null;
let cachedKey: string | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (typeof window === 'undefined') return null;

  const currentUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const currentKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

  if (browserClient && (cachedUrl !== currentUrl || cachedKey !== currentKey)) {
    browserClient = null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(currentUrl, currentKey);
    cachedUrl = currentUrl;
    cachedKey = currentKey;
  }
  return browserClient;
}

/** @deprecated use getSupabaseClient() */
export const supabase = null as SupabaseClient | null;
