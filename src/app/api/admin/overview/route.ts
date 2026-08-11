import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, requireAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createSupabaseAdminClient();
    const [{ data: authData, error: authError }, profiles, orders, incidents, moments] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 500 }),
      supabase.from('profiles').select('id,display_name,email,is_premium,last_safe_at').order('display_name'),
      supabase.from('payment_orders').select('*').order('updated_at', { ascending: false }).limit(100),
      supabase.from('alert_incidents').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('moments').select('id,user_id,caption,image_url,created_at').order('created_at', { ascending: false }).limit(100),
    ]);
    if (authError) throw authError;
    const authUsers = authData.users.map((user) => ({ id: user.id, email: user.email, created_at: user.created_at, banned_until: user.banned_until, last_sign_in_at: user.last_sign_in_at }));
    return NextResponse.json({
      stats: {
        users: authUsers.length,
        premium: (profiles.data ?? []).filter((profile) => profile.is_premium).length,
        pendingPayments: (orders.data ?? []).filter((order) => order.status === 'pending').length,
        activeAlerts: (incidents.data ?? []).filter((incident) => incident.status === 'active' || incident.status === 'escalated').length,
      },
      users: authUsers.map((user) => ({ ...user, profile: (profiles.data ?? []).find((profile) => profile.id === user.id) ?? null })),
      orders: orders.data ?? [], incidents: incidents.data ?? [], moments: moments.data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ADMIN_ERROR';
    const status = message === 'ADMIN_FORBIDDEN' ? 403 : message === 'ADMIN_SERVICE_ROLE_MISSING' ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
