import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy de `POST /ia/prazos/{id}` — o client-side nunca fala com o backend
 * direto (ver CLAUDE.md).
 *
 * **Era `POST /deadlines/{id}/analise` até 07/09/2026**, quando as três rotas
 * de análise passaram para `/ia/*`. O caminho antigo virou 404 do Express — que
 * responde HTML —, então o `res.json()` daqui estourava e o botão mostrava
 * "Serviço indisponível" em vez da análise.
 *
 * É o que o botão "Analisar prazo com IA" do painel expandido dispara.
 * Responde 200 quando a análise já está em cache para o conteúdo atual (o
 * backend cacheia por hash), ou 202 com `{ jobId, analise }` — a análise
 * ANTERIOR, se houver, para a tela mostrar o que já se sabe enquanto a nova
 * chega. `?forcar=true` refaz mesmo com cache válido (não usado pelo botão
 * hoje; repassado por completude do contrato).
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
    const res = await fetch(`${BACKEND_URL}/ia/prazos/${encodeURIComponent(id)}${qs}`, {
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
