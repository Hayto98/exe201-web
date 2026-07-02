import { NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient, toAuthUser } from '@/lib/supabase/routeHandler';

export async function GET() {
  const supabase = await createSupabaseRouteHandlerClient();
  if (!supabase) {
    return NextResponse.json({ user: null });
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: toAuthUser(data.user) });
}
