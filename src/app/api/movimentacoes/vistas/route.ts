import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy de `POST /users/me/movimentacoes-vistas` — o "marcar tudo como visto"
 * do feed.
 *
 * **Marcar não tem corpo, de propósito.** O carimbo é o instante do SERVIDOR,
 * que é o mesmo relógio que grava `detectedAt`. Deixar o cliente mandar a data
 * permitiria marcar como visto algo que ainda vai chegar — e um navegador com
 * o relógio adiantado faria isso sem ninguém pedir.
 *
 * **Desfazer tem**: `{ voltarPara }`, a marca de antes do clique. Só esse campo
 * atravessa o proxy, e o backend recusa qualquer data posterior à marca atual.
 */
export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const corpo = await req.json().catch(() => null) as { voltarPara?: unknown } | null;
  const desfazer = corpo !== null && typeof corpo === 'object' && 'voltarPara' in corpo;

  try {
    const res = await fetch(`${BACKEND}/users/me/movimentacoes-vistas`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(desfazer ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(desfazer ? { body: JSON.stringify({ voltarPara: corpo.voltarPara ?? null }) } : {}),
      cache: 'no-store',
    });

    /* Rota inexistente responde 404 em `text/html`; um `res.json()` cego
       estoura nele e o 404 vira "Serviço indisponível". Mesmo conserto de
       `/api/prazos/[id]`. */
    const tipo = res.headers.get('content-type') ?? '';
    if (!tipo.includes('application/json')) {
      console.error('[vistas] resposta não-JSON do backend', { status: res.status, tipo });
      return NextResponse.json(
        { error: 'O servidor respondeu de forma inesperada.', code: 'RESPOSTA_INVALIDA' },
        { status: 502 },
      );
    }
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });
  }
}
