import { NextResponse } from 'next/server';
import { getProcessoMovements } from '@/lib/api.server';

/**
 * As movimentações de um processo, já no formato da timeline.
 *
 * Existe para o PDF do processo, e só para ele. A página de detalhe carrega
 * `MOVS_PAGE` (20) movimentações por padrão e o dossiê leva `MOVS_MAX` (100) —
 * então uma das duas coisas teria de acontecer sem esta rota: a página passaria
 * a buscar 100 sempre, e a serializar as 100 no payload do RSC para entregá-las
 * a um botão que quase ninguém clica; ou o botão receberia só as 20 da tela e
 * geraria um PDF mais pobre que a própria página na segunda página de scroll.
 *
 * Buscar no clique resolve as duas: a página segue com 20, e quem exporta paga
 * uma requisição.
 *
 * **Devolve o TimelineEvent pronto, não o formato do backend.** `toTimelineEvent`
 * (em `api.server.ts`) resolve o número do movimento, o wall-clock de Brasília e
 * a leitura da IA; refazer isso no cliente seria garantir que o PDF e a tela
 * divirjam na primeira mudança.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    // 100 é o teto de `getProcessoMovements` (e de `MOVS_MAX` na página). Um
    // processo com mais que isso exporta os 100 mais recentes, e o PDF declara
    // o total no rodapé em vez de se apresentar como completo.
    const { events, total } = await getProcessoMovements(id, 100);
    return NextResponse.json({ events, total });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
