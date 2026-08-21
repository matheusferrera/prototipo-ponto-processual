import { NextRequest, NextResponse } from 'next/server';
import {
  COOKIE_ESTADO,
  VALIDADE_ESTADO_S,
  destinoSeguro,
  googleAtivo,
  novoEstado,
  redirectUri,
  urlDeAutorizacao,
} from '@/lib/google-oauth.server';
import { limparOabNumero, limparOabUf } from '@/lib/previa';

/**
 * Passo 1 do login com Google: guarda o estado e manda o navegador ao Google.
 *
 * É um GET porque o navegador precisa **navegar** para cá (a resposta é um
 * redirect para outro domínio) — `fetch` não serve. Por isso também não há
 * corpo: o que o fluxo precisa lembrar vem em query params, é sanitizado aqui e
 * guardado no cookie httpOnly, fora do alcance da barra de endereço.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const origem = sp.get('origem') === '/cadastro' ? '/cadastro' : '/login';

  if (!googleAtivo()) {
    return NextResponse.redirect(new URL(`${origem}?erro=google_indisponivel`, req.nextUrl.origin));
  }

  const oab = limparOabNumero(sp.get('oab') ?? '');
  const uf = limparOabUf(sp.get('uf') ?? '');

  const estado = novoEstado({
    origem,
    next: destinoSeguro(sp.get('next'), ''),
    // Só viaja OAB completa: metade dela no onboarding daria uma busca que
    // falha sem que ninguém tenha digitado nada errado.
    ...(oab && uf.length === 2 ? { oab, uf } : {}),
  });

  const res = NextResponse.redirect(urlDeAutorizacao(estado, redirectUri(req)));

  res.cookies.set(COOKIE_ESTADO, JSON.stringify(estado), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // 'lax' porque o cookie precisa sobreviver à volta do domínio do Google.
    sameSite: 'lax',
    maxAge: VALIDADE_ESTADO_S,
    path: '/api/auth/google',
  });

  return res;
}
