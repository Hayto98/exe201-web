import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('esmery-demo-session')?.value;
  const hasDemoSession = Boolean(session);
  const path = request.nextUrl.pathname;

  const isProtected = path.startsWith('/dashboard') || path.startsWith('/onboarding');
  const isAuth = path.startsWith('/auth');

  if (isProtected && !hasDemoSession) {
    // In production with Supabase, auth cookie would be checked server-side
    // Demo mode uses client-side localStorage; middleware allows through for demo
  }

  if (hasDemoSession && isAuth) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*', '/onboarding/:path*'],
};
