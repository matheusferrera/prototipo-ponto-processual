import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Quanto deste processo a IA já leu — os três números da COBERTURA.
 *
 * Existe para o botão "Analisar processo" poder mostrar progresso REAL enquanto
 * a fila de IA drena. O job da consulta termina em segundos — ele enfileira as
 * leituras, não as executa —, e cada ato leva ~20 s (o modelo, mais o teto de
 * `KIMI_RPM` numa fila de concorrência 1). Sem esta rota, o botão só teria duas
 * opções ruins: dizer "pronto" quando nada foi lido ainda, ou girar um spinner
 * sem denominador.
 *
 * **Ela contava errado até 10/09/2026, e o erro era invisível.** A contagem
 * saía de `getProcessoMovements(id, 100)` — as **100 movimentações mais
 * NOVAS** —, enquanto a IA escolhe o que ler por CATEGORIA (decisório antes de
 * trâmite), não por data. Num processo de 292 movimentações, medido: 9 lidas no
 * total e só 6 dentro daquela janela. O botão esperava por um número que nunca
 * chegava ao alvo, ficava dez minutos girando e terminava anunciando "análise
 * concluída" sem que a tela tivesse mudado — o sintoma que o usuário relatou
 * como "o botão não funciona".
 *
 * Agora quem responde é `GET /ia/processos/{id}`, que já calcula a cobertura
 * sobre o processo INTEIRO (`movimentacoes`, `movimentacoesLegiveis`,
 * `movimentacoesLidas`). O payload dele é grande — traz cada ato lido com o
 * resumo —, e é exatamente por isso que ele é consumido AQUI, no servidor: o
 * que atravessa a rede até o navegador continuam sendo três números.
 *
 * `legiveis` é o denominador honesto: movimentação sem teor não tem como ser
 * lida. Ele NÃO é a meta da leitura — inclui `publicacao` e `tramite`, que a IA
 * recusa de propósito —, então a tela o usa como referência, nunca como
 * condição de parada.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;

  try {
    const res = await fetch(`${BACKEND_URL}/ia/processos/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Backend respondeu ${res.status}` }, { status: res.status });
    }
    const dossie = (await res.json()) as {
      cobertura?: { movimentacoes?: number; movimentacoesLegiveis?: number; movimentacoesLidas?: number };
    };
    const c = dossie.cobertura ?? {};
    return NextResponse.json({
      lidas: c.movimentacoesLidas ?? 0,
      legiveis: c.movimentacoesLegiveis ?? 0,
      total: c.movimentacoes ?? 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
