import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy de `/users/me/whatsapp` — o cliente nunca fala com o backend direto,
 * mesmo padrão de `/api/me` e `/api/secrets`.
 *
 * Aqui isso importa mais que nos outros: o corpo do POST carrega um telefone
 * pessoal, e o token vive num cookie httpOnly que o JavaScript da página não
 * enxerga. Passar por aqui é o que mantém as duas coisas fora do browser.
 */
async function encaminhar(metodo: string, corpo?: unknown) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND}/users/me/whatsapp`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
      cache: 'no-store',
    });

    // 204 = ainda não cadastrou. Não é erro, e devolver corpo vazio deixa a
    // tela decidir mostrar o formulário em vez de uma mensagem de falha.
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });
  }
}

export async function GET() {
  return encaminhar('GET');
}

export async function POST(req: Request) {
  return encaminhar('POST', await req.json().catch(() => ({})));
}

export async function PATCH(req: Request) {
  return encaminhar('PATCH', await req.json().catch(() => ({})));
}

export async function DELETE() {
  return encaminhar('DELETE');
}
