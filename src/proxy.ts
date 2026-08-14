import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, decryptSession } from '@/lib/session';

/**
 * Next.js 16 Proxy (formerly `middleware`). Runs at the edge before routes.
 *
 * This is an OPTIMISTIC gate only — it verifies the signed session cookie and
 * redirects/blocks unauthenticated traffic. Real authorization (ownership
 * scoping) is enforced in the route handlers via the Data Access Layer
 * (`src/lib/auth.ts`), close to the data.
 */

// Routes reachable without a session.
const PUBLIC_PAGES = ['/', '/login', '/signup', '/forgot-password'];

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.includes(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth endpoints must stay open so users can sign in / out.
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await decryptSession(token);

  // API routes: return 401 JSON instead of redirecting.
  if (pathname.startsWith('/api/')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Pages: redirect unauthenticated users to /login, and signed-in users away
  // from the auth pages.
  if (!session && !isPublicPage(pathname)) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }
  if (session && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
