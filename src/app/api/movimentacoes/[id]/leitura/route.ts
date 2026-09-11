import { NextResponse } from 'next/server';
import { getMovimentacao } from '@/lib/api.server';

/**
 * O que a IA leu NESTE ato — só o bloco `ia`.
 *
 * Existe para o botão "Ler este ato com IA" poder acompanhar o resultado. O 202
 * de `POST /ia/movimentacoes/{id}` **não traz `jobId`** (diferente das análises
 * de prazo e de processo): o resultado é gravado na própria movimentação, então
 * quem responde "já saiu?" é a movimentação, não a fila.
 *
 * **O recorte é o ponto.** `GET /movements/{id}` traz o ato inteiro — 3,8 KB de
 * média e 288 KB no maior —, e o poll roda de 5 em 5 segundos por até cinco
 * minutos: puxar o detalhe completo a cada volta seria pagar o texto do ato
 * dezenas de vezes para ler seis campos. Mesmo argumento de
 * `/api/processos/{id}/leitura`, que devolve dois números em vez de cem
 * movimentações.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const mov = await getMovimentacao(encodeURIComponent(id));
    if (!mov) return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 });
    return NextResponse.json({ ia: mov.ia });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
