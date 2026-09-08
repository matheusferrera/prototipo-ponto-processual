import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy de `GET /scraper/jobs/{jobId}` — o estado de um job enfileirado.
 *
 * Existe para o botão "Analisar processo" poder mostrar FATO em vez de spinner.
 * A rota do backend devolve `status` e, com ela, o `result` publicado por etapa
 * (`etapa`, `datajud`, `leitura`) — inclusive enquanto o job ainda está
 * `active`, que é o que permite escrever "consultando o tribunal" e depois
 * "lendo 3 de 10 atos" sem inventar porcentagem.
 *
 * O backend confere que o job é de quem pediu (403 se não for); aqui só o
 * cookie vira `Authorization`.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { jobId } = await params;

  try {
    const res = await fetch(`${BACKEND_URL}/scraper/jobs/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
