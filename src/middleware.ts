import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req) {
  const pathname = req.nextUrl.pathname;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Allow public auth routes
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Allow health check
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  // Allow cron jobs ONLY with valid secret
  if (pathname.startsWith('/api/notifications/cron') || pathname.startsWith('/api/follow-ups')) {
    const authHeader = req.headers.get('authorization');
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Allow all other API routes to handle their own auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth pages
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/chat', req.url));
  }

  // Redirect unauthenticated users to login
  if (!token && pathname !== '/login' && pathname !== '/register') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|robots.txt).*)'],
};
