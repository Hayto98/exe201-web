import { NextResponse } from 'next/server';
import {
  deleteEmergencyContactSupabase,
  saveEmergencyContactSupabase,
  toggleEmergencyContactAutoNotifySupabase,
  toggleEmergencyContactVerifiedSupabase,
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

  let body: {
    action?: string;
    name?: string;
    contact?: string;
    contactId?: string;
    value?: boolean;
    is_verified?: boolean;
    auto_notify?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  }

  try {
    switch (body.action) {
      case 'save':
        if (!body.name?.trim() || !body.contact?.trim()) {
          return NextResponse.json({ error: 'Nhập tên và số liên hệ.' }, { status: 400 });
        }
        await saveEmergencyContactSupabase(
          user.id,
          {
            name: body.name,
            contact: body.contact,
            is_verified: body.is_verified,
            auto_notify: body.auto_notify,
          },
          supabase
        );
        break;
      case 'delete':
        if (!body.contactId) {
          return NextResponse.json({ error: 'Thiếu contactId.' }, { status: 400 });
        }
        await deleteEmergencyContactSupabase(body.contactId, supabase);
        break;
      case 'toggle_verified':
        if (!body.contactId || typeof body.value !== 'boolean') {
          return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
        }
        await toggleEmergencyContactVerifiedSupabase(user.id, body.contactId, body.value, supabase);
        break;
      case 'toggle_auto_notify':
        if (!body.contactId || typeof body.value !== 'boolean') {
          return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
        }
        await toggleEmergencyContactAutoNotifySupabase(user.id, body.contactId, body.value, supabase);
        break;
      default:
        return NextResponse.json({ error: 'Hành động không hợp lệ.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cập nhật thất bại';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
