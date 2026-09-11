import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy de `POST /ia/movimentacoes/{id}` — o client-side nunca fala com o
 * backend direto (ver CLAUDE.md).
 *
 * É o que o botão "Ler este ato com IA" dispara, dentro do collapse da
 * movimentação. A rota existe no backend desde 07/09/2026 (era
 * `POST /movements/{id}/analise`) e **nenhuma tela a chamava** — a leitura de um
 * ato só acontecia em lote, pela ronda do dia ou pelo botão do processo
 * inteiro.
 *
 * Três respostas, e as três são normais:
 *
 * - **200** — já lida: o corpo é a leitura gravada (`AnaliseDoAto`);
 * - **202** — enfileirada: `{ enfileirados, atos, analise }`, onde `analise` é a
 *   ANTERIOR, para a tela não piscar vazia. **Não vem `jobId`** — o resultado é
 *   gravado na própria movimentação, então quem acompanha é
 *   `GET /api/movimentacoes/{id}/leitura`, não `/api/jobs/{id}`;
 * - **409 `ATO_NAO_LEGIVEL`** — o ato não tem texto, ou é de categoria que só
 *   devolveria o rótulo (`publicacao`, `tramite`). É estado de tela, não erro.
 *
 * `?forcar=true` relê o que já foi lido — o caso de o inteiro teor ter chegado
 * depois da primeira leitura.
 *
 * **Esta é a única análise que pode MEXER EM PRAZO**: se a IA concluir que o ato
 * abre prazo que a heurística não viu, o `Deadline` nasce; se concluir que não
 * era prazo, ele é desfeito. Por isso ela lê o ato do diário e o da consulta
 * pública, e nunca o do painel autenticado, cujo vencimento é oficial.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const forcar = searchParams.get('forcar');
  const qs = forcar ? `?forcar=${encodeURIComponent(forcar)}` : '';

  try {
    const res = await fetch(`${BACKEND_URL}/ia/movimentacoes/${encodeURIComponent(id)}${qs}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
