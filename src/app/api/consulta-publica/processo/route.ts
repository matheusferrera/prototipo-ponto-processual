import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy de `POST /consulta-publica/processo` — o client-side nunca fala com o
 * backend direto (ver CLAUDE.md).
 *
 * É o que o botão "Analisar processo" dispara. O backend consulta as fontes
 * públicas por NÚMERO (DataJud, certidão do STJ, e-SAJ e PJe público) e manda a
 * IA ler as movimentações que ainda não foram lidas, gravando o resumo em cada
 * uma. Responde `202` com o `jobId` — o trabalho é acompanhado em
 * `/api/jobs/{jobId}`.
 *
 * O corpo é repassado cru: quem valida o número (20 dígitos e o dígito
 * verificador da Resolução CNJ 65/2008) é o backend, e duplicar a conta aqui
 * criaria duas regras para manter em sincronia.
 */
export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.text();

  try {
    const res = await fetch(`${BACKEND_URL}/consulta-publica/processo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
