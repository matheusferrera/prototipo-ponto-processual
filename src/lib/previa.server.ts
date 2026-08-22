import 'server-only';
import { cache } from 'react';
import type { PreviaOab } from '@/lib/previa';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

export type PreviaResultado =
  | { ok: true; previa: PreviaOab }
  | { ok: false; motivo: 'oab-invalida' | 'limite' | 'indisponivel' };

/**
 * Consulta anônima ao DJEN pela OAB — a mesma rota que a busca do hero usa.
 * Sem cookie e sem `Authorization`: a rota é pública de propósito, porque a
 * página existe antes de haver conta.
 *
 * Nunca lança: a página tem tela para cada motivo de falha, e um throw aqui
 * viraria erro 500 num fluxo de aquisição.
 *
 * Memoizado por request (`cache`): o /cadastro precisa da mesma prévia em três
 * lugares — painel lateral, faixa do celular e nome sugerido — e sem isso cada
 * um pagaria uma ida ao DJEN.
 */
export const getPrevia = cache(async function getPrevia(
  numero: string,
  uf: string,
): Promise<PreviaResultado> {
  const qs = new URLSearchParams({ oabNumero: numero, oabUf: uf });

  try {
    const res = await fetch(`${BACKEND}/public/preview-oab?${qs}`, {
      // A borda do backend já manda `max-age=300`; espelhar aqui evita refazer
      // a consulta ao DJEN a cada carregamento da mesma OAB.
      next: { revalidate: 300 },
    });

    if (res.status === 400) return { ok: false, motivo: 'oab-invalida' };
    if (res.status === 429) return { ok: false, motivo: 'limite' };
    if (!res.ok) {
      console.error(`[previa] ${BACKEND} devolveu HTTP ${res.status} para ${numero}/${uf}`);
      return { ok: false, motivo: 'indisponivel' };
    }

    // Resposta 200 que não é JSON quer dizer que `BACKEND_URL` não aponta para a
    // API: quem respondeu foi outra coisa (o próprio Next, um proxy, uma tela de
    // login). Sem esta checagem o `res.json()` estoura, cai no catch abaixo e a
    // página acusa o DJEN de estar fora do ar por um erro que é de configuração.
    const tipo = res.headers.get('content-type') ?? '';
    if (!tipo.includes('application/json')) {
      console.error(
        `[previa] ${BACKEND} respondeu 200 com content-type "${tipo}" (esperado JSON) — ` +
          `BACKEND_URL provavelmente não aponta para a API. URL final: ${res.url}`,
      );
      return { ok: false, motivo: 'indisponivel' };
    }

    return { ok: true, previa: (await res.json()) as PreviaOab };
  } catch (erro) {
    console.error(`[previa] falha ao chamar ${BACKEND} para ${numero}/${uf}:`, erro);
    return { ok: false, motivo: 'indisponivel' };
  }
});
