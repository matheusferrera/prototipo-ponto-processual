import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

/** Os três valores que `Process.meuPoloManual` aceita, mais o `null` que apaga. */
const VALORES = new Set(['ativo', 'passivo', 'nenhum']);

/**
 * Proxy de `PATCH /processes/{id}` restrito a **`meuPoloManual`**.
 *
 * ## Por que uma rota só para este campo
 *
 * `PATCH /processes/{id}` também aceita `status`, `monitored` e `officeId`.
 * Os três mexem em MONITORAMENTO — deixar de varrer um processo, movê-lo para
 * outro escritório —, e um proxy genérico daria à tela do cliente uma porta
 * para todos eles. Este endpoint faz uma coisa: registrar de que lado o
 * advogado está.
 *
 * `null` é valor legítimo e apaga a resposta, devolvendo o processo à derivação
 * por OAB. É o "me enganei" do par de botões.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const corpo = (await req.json().catch(() => ({}))) as { meuPoloManual?: unknown };
  const valor = corpo.meuPoloManual;

  if (valor !== null && !(typeof valor === 'string' && VALORES.has(valor))) {
    return NextResponse.json(
      { error: 'Informe `meuPoloManual` como ativo, passivo, nenhum ou null.', code: 'CORPO_INVALIDO' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${BACKEND}/processes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ meuPoloManual: valor }),
      cache: 'no-store',
    });

    /* Rota inexistente no Express responde 404 em `text/html` e um `res.json()`
       cego estoura nele — o 404 vira "Serviço indisponível" e a tela culpa a
       rede. Mesmo conserto de `/api/prazos/[id]`. */
    const tipo = res.headers.get('content-type') ?? '';
    if (!tipo.includes('application/json')) {
      console.error('[polo] resposta não-JSON do backend', { status: res.status, tipo });
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
