import { NextResponse } from 'next/server';
import { getProcessoMovements } from '@/lib/api.server';
import { parseCategorias } from '@/lib/categoria-movimentacao';

/**
 * As movimentações de um processo, já no formato da timeline.
 *
 * Dois consumidores, e é por isso que ela aceita filtros em vez de devolver um
 * bloco fixo:
 *
 *  - **o "Carregar mais" da timeline** pede a página seguinte com os MESMOS
 *    filtros da tela. Sem repassá-los, a página 2 viria do acervo inteiro e a
 *    lista passaria a misturar o que o filtro tinha excluído — em silêncio,
 *    porque nada na tela diria que aquilo aconteceu;
 *  - **o PDF do processo**, que pede 100 de uma vez, sem filtro.
 *
 * **Devolve o `TimelineEvent` pronto, não o formato do backend.**
 * `toTimelineEvent` (em `api.server.ts`) resolve o número do movimento, o
 * wall-clock de Brasília e a leitura da IA; refazer isso no cliente seria
 * garantir que a página 2 e a página 1 divirjam na primeira mudança.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sp = new URL(req.url).searchParams;

  // 100 é o teto de `getProcessoMovements` — ela já corta, e repetir o número
  // aqui só criaria dois lugares para mudar.
  const limit = Number(sp.get('limit')) || 100;
  const pedida = Number(sp.get('page'));
  const page = Number.isSafeInteger(pedida) && pedida > 0 ? pedida : 1;
  // `todas` NÃO passa por `parseCategorias`: aquela função sanitiza contra o
  // enum de categorias e descarta o que não reconhece, e `todas` não é uma
  // categoria — é o pedido de "sem filtro nenhum, trâmite incluído" que o
  // backend entende. Sanitizá-lo devolvia lista vazia, o backend aplicava o
  // default (que ESCONDE trâmite) e a página 2 vinha de um conjunto menor que a
  // 1: medido, 3.986 contra as 4.900 que a tela mostrava.
  const catCru = sp.get('cat')?.trim();
  const categorias = catCru === 'todas' ? ['todas'] : parseCategorias(catCru ?? undefined);
  const validDate = (v: string | null) =>
    v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;

  try {
    const { events, total } = await getProcessoMovements(id, limit, categorias, {
      q: sp.get('q')?.trim() || undefined,
      from: validDate(sp.get('from')),
      to: validDate(sp.get('to')),
      sort: sp.get('sort') === 'asc' ? 'asc' : 'desc',
      page,
    });
    return NextResponse.json({ events, total });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
