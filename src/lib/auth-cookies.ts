import type { NextResponse } from 'next/server';

/**
 * Grava a sessão devolvida pelo backend nos cookies httpOnly.
 *
 * Três rotas abrem sessão — login por senha, cadastro e volta do Google — e as
 * três precisam gravar exatamente os mesmos cookies, com os mesmos tempos. Cada
 * uma com a sua cópia era o caminho curto para uma delas esquecer o
 * `refresh_token` ou o `secure` e ninguém notar até produção.
 *
 * `sameSite: 'lax'` é obrigatório no fluxo do Google: o navegador chega ao
 * `/api/auth/google/callback` vindo do domínio do Google, e em `strict` o
 * cookie recém-gravado não acompanharia o redirect seguinte.
 */
export interface SessaoBackend {
  accessToken: string;
  refreshToken: string;
}

const QUINZE_MINUTOS = 60 * 15;
const SETE_DIAS = 60 * 60 * 24 * 7;

export function gravarSessao(res: NextResponse, sessao: SessaoBackend) {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  res.cookies.set('access_token', sessao.accessToken, { ...base, maxAge: QUINZE_MINUTOS });
  res.cookies.set('refresh_token', sessao.refreshToken, { ...base, maxAge: SETE_DIAS });
}
