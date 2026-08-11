import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, getAdminEmails, requireAdmin } from '@/lib/supabase/admin';

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json() as { userId?: string; action?: 'ban' | 'unban' };
    if (!body.userId || !body.action) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    const supabase = createSupabaseAdminClient();
    const { data: target } = await supabase.auth.admin.getUserById(body.userId);
    if (target.user?.email && getAdminEmails().includes(target.user.email.toLowerCase())) return NextResponse.json({ error: 'CANNOT_MODIFY_ADMIN' }, { status: 400 });
    const { error } = await supabase.auth.admin.updateUserById(body.userId, { ban_duration: body.action === 'ban' ? '876000h' : 'none' });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ADMIN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'ADMIN_FORBIDDEN' ? 403 : 500 });
  }
}
