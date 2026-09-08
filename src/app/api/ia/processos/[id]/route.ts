import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy de `POST /ia/processos/{id}` — o client-side nunca fala com o backend
 * direto (ver CLAUDE.md).
 *
 * É a SEGUNDA metade do botão "Analisar processo". A primeira
 * (`/api/consulta-publica/processo`) atualiza o processo nas fontes; esta manda
 * a IA ler o que veio — os três níveis de uma vez, nesta ordem: os ATOS ainda
 * não lidos, os PRAZOS em aberto e o CASO (a síntese, que consome os resumos
 * dos atos).
 *
 * Responde `202` com o que foi enfileirado (`atos.enfileirados`, `analises`);
 * a fila `ia` resolve no tempo dela e o resultado aparece em
 * `GET /ia/processos/{id}`, que é a aba de IA da tela do processo.
 *
 * **Era o job da consulta que fazia isto até 07/09/2026.** Naquele dia a
 * leitura saiu do `consultaProcesso` e virou rota própria — e o botão ficou
 * chamando só a metade que sobrou, terminando em "nada novo para ler" em
 * processo nenhum lido. `503` aqui é a instalação sem chave de IA, e a tela
 * deve dizer isso em vez de girar.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;

  try {
    const res = await fetch(`${BACKEND_URL}/ia/processos/${encodeURIComponent(id)}`, {
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
