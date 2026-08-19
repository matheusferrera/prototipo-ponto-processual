import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/cadastro', '/home'];
const API_AUTH_PREFIX = '/api/auth';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith(API_AUTH_PREFIX)) return NextResponse.next();
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.endsWith('opengraph-image')) return NextResponse.next();

  const isPublic = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));

  const token = req.cookies.get('access_token')?.value;

  if (!token && !isPublic) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isPublic) {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = '/';
    homeUrl.search = '';
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
