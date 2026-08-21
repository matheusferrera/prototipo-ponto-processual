import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { destinoSeguro } from '@/lib/utils';

/**
 * Fluxo OAuth do Google — a metade que vive no front.
 *
 * O papel se divide assim: **o front é o cliente OAuth** (é dele o
 * `redirect_uri` e o navegador do usuário), então é aqui que o `code` vira
 * `id_token` e é aqui que o client secret mora. **O backend é a autoridade de
 * identidade**: recebe o `id_token`, verifica por conta própria e devolve a
 * mesma sessão do login por senha. Nenhum dos dois confia no outro de graça.
 *
 * Authorization Code + PKCE, e não o botão do Google Identity Services, por
 * dois motivos: o segredo nunca chega ao navegador, e o `state` (cookie
 * httpOnly de 10 minutos) carrega o que o fluxo precisa lembrar do outro lado
 * do redirect — a OAB digitada no cadastro e para onde voltar.
 */

const AUTORIZACAO_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const COOKIE_ESTADO = 'g_oauth';
export const CAMINHO_CALLBACK = '/api/auth/google/callback';
/** O ida-e-volta inteiro é o tempo de escolher a conta no Google. 10 min é folgado. */
export const VALIDADE_ESTADO_S = 600;

export const googleClientId = () => process.env.GOOGLE_CLIENT_ID ?? '';
export const googleClientSecret = () => process.env.GOOGLE_CLIENT_SECRET ?? '';

/**
 * `true` quando dá para oferecer o botão. As páginas consultam isto no
 * servidor: botão que existe e não funciona é pior que botão ausente — a
 * pessoa clica achando que resolveu o cadastro.
 */
export const googleAtivo = () => !!googleClientId() && !!googleClientSecret();

/**
 * O `redirect_uri` precisa bater **caractere a caractere** com o que está
 * registrado no Google Cloud Console, senão o próprio Google recusa antes de
 * mostrar a tela de contas (`redirect_uri_mismatch`).
 *
 * Precedência: `GOOGLE_REDIRECT_URI` (escape para ambientes atrás de proxy que
 * reescreve host) → `NEXT_PUBLIC_SITE_URL`/`SITE_URL` → a origem da própria
 * requisição, que é o que faz o dev em `localhost:3001` funcionar sem
 * configurar nada. `getSiteUrl()` de `site-url.ts` NÃO serve aqui: o default
 * dele é `localhost:3000`, que em dev é o backend, não o front.
 */
export function redirectUri(req: NextRequest): string {
  const explicito = process.env.GOOGLE_REDIRECT_URI;
  if (explicito) return explicito;

  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || req.nextUrl.origin;
  return new URL(CAMINHO_CALLBACK, base.startsWith('http') ? base : `https://${base}`).toString();
}

/** O que o fluxo precisa lembrar do outro lado do redirect. Vai no cookie, nunca na URL. */
export interface EstadoOauth {
  /** Nonce anti-CSRF: precisa voltar igual no `state` que o Google devolve. */
  state: string;
  /** PKCE — prova de que quem troca o `code` é quem começou o fluxo. */
  verifier: string;
  /** De onde a pessoa saiu, para onde os erros voltam: `/login` ou `/cadastro`. */
  origem: '/login' | '/cadastro';
  /** Para onde ir depois, quando a conta já existia (o `?next=` do login). */
  next?: string;
  /** OAB respondida no formulário de cadastro — segue para o onboarding. */
  oab?: string;
  uf?: string;
}

const base64url = (b: Buffer) => b.toString('base64url');

export function novoEstado(dados: Omit<EstadoOauth, 'state' | 'verifier'>): EstadoOauth {
  return {
    state: base64url(randomBytes(32)),
    // 64 bytes → 86 chars em base64url, dentro do limite de 43–128 do RFC 7636.
    verifier: base64url(randomBytes(64)),
    ...dados,
  };
}

const desafioPkce = (verifier: string) => base64url(createHash('sha256').update(verifier).digest());

/** Comparação sem vazar por tempo — o `state` é um segredo curto vindo da URL. */
export function estadoConfere(recebido: string | null, esperado: string): boolean {
  if (!recebido || recebido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
}

export function urlDeAutorizacao(estado: EstadoOauth, redirect: string): string {
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: redirect,
    response_type: 'code',
    scope: 'openid email profile',
    state: estado.state,
    code_challenge: desafioPkce(estado.verifier),
    code_challenge_method: 'S256',
    // `select_account` em vez do silencioso: quem tem duas contas Google (a
    // pessoal e a do escritório) precisa escolher com qual entra, e é o mesmo
    // que impede o "já estou logado com a conta errada e não consigo trocar".
    prompt: 'select_account',
  });
  return `${AUTORIZACAO_URL}?${params}`;
}

/** Troca o `code` pelo `id_token`. `null` quando o Google recusa a troca. */
export async function trocarCodePorIdToken(
  code: string,
  estado: EstadoOauth,
  redirect: string,
): Promise<string | null> {
  const resposta = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      redirect_uri: redirect,
      grant_type: 'authorization_code',
      code_verifier: estado.verifier,
    }),
    cache: 'no-store',
  });

  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as { id_token?: string };
  return dados.id_token ?? null;
}

export { destinoSeguro };
