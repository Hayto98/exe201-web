import { NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient, toAuthUser } from '@/lib/supabase/routeHandler';

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase chưa cấu hình.' }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: 'Nhập email và mật khẩu.' }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (!data.user) {
    return NextResponse.json({ error: 'Đăng nhập thất bại.' }, { status: 401 });
  }

  return NextResponse.json({ user: toAuthUser(data.user) });
}
