import { NextResponse } from 'next/server';
import { getProcessoMovements } from '@/lib/api.server';

/**
 * Quantas movimentações deste processo a IA já leu.
 *
 * Existe para o botão "Analisar processo" poder mostrar progresso REAL enquanto
 * a fila de IA drena. O job da consulta termina em segundos — ele enfileira as
 * leituras, não as executa —, e cada ato leva ~20 s no teto da Moonshot
 * (`KIMI_RPM` 3, concorrência 1, fila global). Sem esta rota, o botão só teria
 * duas opções ruins: dizer "pronto" quando nada foi lido ainda, ou girar um
 * spinner sem denominador.
 *
 * **A contagem é feita no servidor de propósito.** A resposta do backend traz
 * as 100 movimentações inteiras; o que atravessa a rede até o navegador são dois
 * números. Contar no cliente significaria baixar esse payload a cada volta do
 * poll, por minutos.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const { events, total } = await getProcessoMovements(id, 100);
    return NextResponse.json({
      lidas: events.filter(e => Boolean(e.ia?.resumo)).length,
      carregadas: events.length,
      total,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
