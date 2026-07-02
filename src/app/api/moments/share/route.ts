import { NextResponse } from 'next/server';
import {
  loadUserStateFromSupabase,
  shareMomentSupabase,
  uploadMomentImageSupabase,
} from '@/lib/repository/supabaseRepository';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/routeHandler';

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase chưa cấu hình.' }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  let caption = '';
  let imageUrl = '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    caption = String(form.get('caption') ?? '').trim();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Chọn ảnh từ thư viện.' }, { status: 400 });
    }

    const { data: entitlement } = await supabase
      .from('entitlements')
      .select('is_premium')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!entitlement?.is_premium) {
      return NextResponse.json({ error: 'PREMIUM_REQUIRED' }, { status: 403 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
    try {
      imageUrl = await uploadMomentImageSupabase(
        supabase,
        user.id,
        file,
        `moment-${Date.now()}.${safeExt}`,
        file.type || `image/${safeExt}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload thất bại';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } else {
    let body: { caption?: string; imageUrl?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }
    caption = String(body.caption ?? '').trim();
    imageUrl = String(body.imageUrl ?? '').trim();
  }

  if (!caption) {
    return NextResponse.json({ error: 'Nhập chú thích.' }, { status: 400 });
  }
  if (!imageUrl) {
    return NextResponse.json({ error: 'Chọn ảnh.' }, { status: 400 });
  }

  try {
    const state = await loadUserStateFromSupabase(user.id, user.email ?? undefined);
    await shareMomentSupabase(user.id, caption, imageUrl, state, supabase);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chia sẻ thất bại';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
