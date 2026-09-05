import { NextRequest, NextResponse } from 'next/server';
import { ROTA_PAINEL } from '@/lib/rotas';
import { gravarAcesso } from '@/lib/auth-cookies';

/**
 * ## Por que a renovação mora AQUI
 *
 * O `access_token` vale 15 minutos (é o `expiresIn` do backend, e o `maxAge`
 * do cookie acompanha). O `refresh_token` vale 7 dias — e, até 04/09/2026, era
 * gravado no login e **nunca usado por ninguém**: nada no front o lia, e o
 * backend nem tinha rota para trocá-lo. O efeito era o relato de sempre: a
 * cada 15 minutos o cookie sumia, o guard abaixo não achava token e mandava
 * para o `/login`, com sessão de 7 dias intacta no navegador.
 *
 * A renovação **não pode** morar no `api.server.ts`: quem chama o backend ali
 * são Server Components, e Server Component não escreve cookie no Next — ele
 * renderiza, não responde. O middleware é o único ponto de uma navegação
 * normal que lê o cookie velho e escreve o novo na mesma resposta.
 */
const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * O cookie de acesso serve para esta requisição?
 *
 * **Só a presença do cookie não responde isso**, e tratar presença como sessão
 * foi o que prendeu todo mundo num laço em 04/09/2026: com um token do formato
 * antigo (sem a claim `type`), a API recusava, o painel quebrava — e o guard
 * abaixo, vendo cookie, expulsava a pessoa de `/login` de volta para o painel.
 * Sem tela de erro que ajudasse e sem caminho para reautenticar: só limpando
 * cookie na mão.
 *
 * A leitura é **sem verificar assinatura**, de propósito. Quem valida token é a
 * API, que tem o segredo; aqui a pergunta é só de roteamento — "mando para o
 * painel ou para o login?" —, e para ela `exp` e `type` bastam. Token forjado
 * não ganha nada: ele passa por aqui e leva 401 no primeiro fetch.
 */
function acessoUtilizavel(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const payload = token.split('.')[1];
    if (!payload) return false;
    // base64url → base64: o JWT usa o alfabeto seguro para URL.
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (claims?.type !== 'access') return false;
    return typeof claims.exp === 'number' && claims.exp * 1000 > Date.now();
  } catch {
    // Cookie corrompido ou de outro formato é o mesmo que não ter cookie.
    return false;
  }
}

async function renovarAcesso(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${BACKEND}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const dados = (await res.json()) as { accessToken?: string };
    return dados.accessToken ?? null;
  } catch {
    // Backend fora do ar não é sessão inválida. Devolver `null` manda a pessoa
    // para o login, o que é o comportamento de hoje — mas o refresh NÃO é
    // apagado nesse caminho (ver quem chama), para a sessão voltar sozinha
    // quando a API voltar.
    return null;
  }
}

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

export async function middleware(req: NextRequest) {
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

  const bruto = req.cookies.get('access_token')?.value;
  const acessoMorto = Boolean(bruto) && !acessoUtilizavel(bruto);
  let token = acessoMorto ? undefined : bruto;
  const refresh = req.cookies.get('refresh_token')?.value;

  /* A renovação vem ANTES dos dois guards, e não só do primeiro: quem tem
     sessão viva e cai em `/` deve ir para o painel, não ver a landing como
     visitante. Sem isto, o efeito da renovação dependeria da rota. */
  let acessoNovo: string | null = null;
  let refreshMorto = false;
  if (!token && refresh) {
    acessoNovo = await renovarAcesso(refresh);
    token = acessoNovo ?? undefined;
    refreshMorto = acessoNovo === null;
  }

  /* Toda resposta daqui para baixo — inclusive os redirects — precisa carregar
     o cookie novo. Um `NextResponse` que esquece isso renova a cada requisição
     e nunca persiste nada. */
  const comSessao = (res: NextResponse): NextResponse => {
    if (acessoNovo) gravarAcesso(res, acessoNovo);
    /* Refresh recusado pelo backend (expirado, revogado, conta inativa) é
       apagado: mantê-lo faria cada requisição seguinte pagar uma ida ao
       `/auth/refresh` para levar o mesmo 401. */
    if (refreshMorto) res.cookies.delete('refresh_token');
    /* Cookie morto é apagado mesmo quando a renovação não repõe nada: deixá-lo
       ali faria a próxima requisição repetir todo este caminho, e é ele que
       fazia `/login` devolver a pessoa para o painel. */
    if (acessoMorto && !acessoNovo) res.cookies.delete('access_token');
    return res;
  };

  if (!token && !isAnon && !isOpen) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return comSessao(NextResponse.redirect(loginUrl));
  }

  if (token && isAnon) {
    const painelUrl = req.nextUrl.clone();
    painelUrl.pathname = ROTA_PAINEL;
    painelUrl.search = '';
    return comSessao(NextResponse.redirect(painelUrl));
  }

  /* O cookie novo é gravado na RESPOSTA, mas quem renderiza é o Server
     Component desta mesma requisição — e ele lê o cookie de ENTRADA, que ainda
     é o velho. Reescrever o header aqui faz o `cookies()` do render já
     enxergar o token renovado; sem isso, a primeira navegação após os 15
     minutos ainda levaria 401 e cairia no `redirect('/login')` do
     `api.server.ts`. */
  if (acessoNovo) {
    const headers = new Headers(req.headers);
    const jar = req.cookies;
    jar.set('access_token', acessoNovo);
    headers.set('cookie', jar.toString());
    return comSessao(NextResponse.next({ request: { headers } }));
  }

  return comSessao(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
