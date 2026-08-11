import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, requireAdmin } from '@/lib/supabase/admin';

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json() as { resource?: 'payment' | 'incident' | 'moment'; id?: string; action?: 'cancel' | 'resolve' | 'delete' };
    if (!body.resource || !body.id || !body.action) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();
    if (body.resource === 'payment' && body.action === 'cancel') {
      const { error } = await supabase.from('payment_orders').update({ status: 'cancelled', updated_at: now }).eq('id', body.id).eq('status', 'pending');
      if (error) throw error;
    } else if (body.resource === 'incident' && body.action === 'resolve') {
      const { error } = await supabase.from('alert_incidents').update({ status: 'resolved', resolved_at: now }).eq('id', body.id).in('status', ['active', 'escalated']);
      if (error) throw error;
      await supabase.from('alert_jobs').update({ status: 'cancelled' }).eq('incident_id', body.id).eq('status', 'scheduled');
    } else if (body.resource === 'moment' && body.action === 'delete') {
      const { error } = await supabase.from('moments').delete().eq('id', body.id);
      if (error) throw error;
    } else return NextResponse.json({ error: 'ACTION_NOT_ALLOWED' }, { status: 400 });
    await supabase.from('audit_logs').insert({ user_id: admin.id, actor_user_id: admin.id, action: `admin_${body.resource}_${body.action}`, metadata: body.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ADMIN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'ADMIN_FORBIDDEN' ? 403 : 500 });
  }
}
