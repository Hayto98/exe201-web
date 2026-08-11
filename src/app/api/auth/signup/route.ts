import { NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient, toAuthUser } from '@/lib/supabase/routeHandler';

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase chưa cấu hình.' }, { status: 503 });
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  }

  const name = body.name?.trim() ?? '';
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: 'Nhập email và mật khẩu.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name || email.split('@')[0] },
      emailRedirectTo: new URL('/auth/signin', request.url).toString(),
    },
  });

  if (error) {
    if (error.message?.includes('rate limit')) {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
    }
    return NextResponse.json({ error: typeof error.message === 'string' ? error.message : 'SIGNUP_FAILED' }, { status: 400 });
  }

  if (!data.user) return NextResponse.json({ error: 'SIGNUP_FAILED' }, { status: 400 });

  if (!data.session) {
    try {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        display_name: name || email.split('@')[0],
        email,
      });
    } catch {
      // RLS may block before confirmation — ok
    }
    return NextResponse.json({ error: 'CONFIRM_EMAIL' }, { status: 202 });
  }

  await supabase.from('profiles').upsert({
    id: data.user.id,
    display_name: name || email.split('@')[0],
    email,
  });

  return NextResponse.json({ user: toAuthUser(data.user) });
}
