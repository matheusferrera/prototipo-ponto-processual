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

/** Mesmo `expiresIn` do access token no backend (`EXPIRA_ACESSO`). */
const QUINZE_MINUTOS = 60 * 15;
/** Mesmo `expiresIn` do refresh (`EXPIRA_REFRESH`) — o teto real da sessão. */
const SETE_DIAS = 60 * 60 * 24 * 7;

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function gravarSessao(res: NextResponse, sessao: SessaoBackend) {
  gravarAcesso(res, sessao.accessToken);
  res.cookies.set('refresh_token', sessao.refreshToken, { ...base, maxAge: SETE_DIAS });
}

/**
 * Grava só o access token — o caminho da RENOVAÇÃO.
 *
 * O refresh não é reescrito porque o backend não o rotaciona: a sessão dura os
 * 7 dias do refresh original, e não uma janela deslizante. Ver a nota sobre
 * corrida em `POST /auth/refresh`.
 */
export function gravarAcesso(res: NextResponse, accessToken: string) {
  res.cookies.set('access_token', accessToken, { ...base, maxAge: QUINZE_MINUTOS });
}
