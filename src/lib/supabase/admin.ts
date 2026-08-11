import { createClient } from '@supabase/supabase-js';
import { createSupabaseRouteHandlerClient } from './routeHandler';
import { normalizeSupabaseUrl } from './client';

const DEFAULT_ADMIN_EMAIL = 'admin@gmail.com';

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? DEFAULT_ADMIN_EMAIL).split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export async function requireAdmin() {
  const authClient = await createSupabaseRouteHandlerClient();
  if (!authClient) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email || !getAdminEmails().includes(user.email.toLowerCase())) throw new Error('ADMIN_FORBIDDEN');
  return user;
}

export function createSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error('ADMIN_SERVICE_ROLE_MISSING');
  return createClient(normalizeSupabaseUrl(url), serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}
