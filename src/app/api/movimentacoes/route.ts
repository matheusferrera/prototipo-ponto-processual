import { NextResponse } from 'next/server';
import { getMovimentacoes } from '@/lib/api.server';
import {
  MOVIMENTACOES_POR_PAGINA,
  movimentacaoFiltersToApi,
  parseMovimentacaoFilters,
} from '@/lib/movimentacao-filters';

/**
 * Uma página da lista de todas, já agrupada por dia — o "Carregar dias
 * anteriores".
 *
 * **Recebe os MESMOS filtros da tela** (serializados por
 * `serializeMovimentacaoFilters`): sem eles, a página 2 viria do acervo inteiro
 * e a lista passaria a misturar o que o filtro excluiu, em silêncio.
 *
 * **Devolve os grupos prontos**, não o formato do backend: `getMovimentacoes`
 * resolve wall-clock de Brasília, rótulo do dia e leitura da IA, e refazer isso
 * no cliente seria garantir que a página 2 e a 1 divirjam na primeira mudança.
 *
 * O tribunal não é conferido contra a carteira aqui (custaria uma ida a mais
 * ao backend por página): o valor é o que a própria tela mandou, e o backend
 * filtra pelo que recebe.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const params = Object.fromEntries(sp.entries());
  const tribunais = (params.tribunal ?? '').split(',').map(t => t.trim()).filter(Boolean);
  const filtros = parseMovimentacaoFilters(params, tribunais);

  const pedida = Number(params.pagina);
  const pagina = Number.isSafeInteger(pedida) && pedida > 0 ? pedida : 1;

  try {
    const r = await getMovimentacoes(pagina, MOVIMENTACOES_POR_PAGINA, movimentacaoFiltersToApi(filtros));
    return NextResponse.json({ grupos: r.groups, totalPaginas: r.totalPages, pagina: r.page });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
