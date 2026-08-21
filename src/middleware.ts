import { NextRequest, NextResponse } from 'next/server';
import { ROTA_PAINEL } from '@/lib/rotas';

/* Rotas só para quem NÃO está logado: logado nelas é redirecionado ao painel.
   `/` é a landing — quem já tem sessão não precisa da página de vendas. */
const ANON_ROUTES = ['/', '/login', '/cadastro', '/home'];
/* Rotas abertas a todos. `/oab/<numero>-<uf>` é o resultado da busca pública:
   tem URL própria para ser compartilhada, e quem recebe o link pode já ter
   conta — expulsar essa pessoa para o painel quebraria o compartilhamento. */
const OPEN_ROUTES = ['/oab'];
const API_AUTH_PREFIX = '/api/auth';
/* Rotas de API anônimas usadas pela landing (busca por OAB do hero): existem
   justamente para quem ainda não tem conta, então não passam pelo guard. */
const API_PUBLIC_PREFIX = '/api/public';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith(API_AUTH_PREFIX)) return NextResponse.next();
  if (pathname.startsWith(API_PUBLIC_PREFIX)) return NextResponse.next();
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.endsWith('opengraph-image')) return NextResponse.next();

  /* `/` casa por igualdade apenas: como prefixo, ele casaria com a aplicação
     inteira e deixaria tudo público. */
  const casa = (rotas: string[]) =>
    rotas.some(r => pathname === r || (r !== '/' && pathname.startsWith(r + '/')));
  const isAnon = casa(ANON_ROUTES);
  const isOpen = casa(OPEN_ROUTES);

  const token = req.cookies.get('access_token')?.value;

  if (!token && !isAnon && !isOpen) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAnon) {
    const painelUrl = req.nextUrl.clone();
    painelUrl.pathname = ROTA_PAINEL;
    painelUrl.search = '';
    return NextResponse.redirect(painelUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
