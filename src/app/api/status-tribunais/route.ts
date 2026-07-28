import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy do status real por tribunal (`GET /scraper/status` no backend).
 *
 * Não existe dataset de fallback aqui de propósito: é uma tela de monitoramento,
 * e devolver saúde fabricada quando o backend está fora faria a página afirmar
 * que tribunais estão operacionais sem ninguém ter checado.
 */
export async function GET(req: Request) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;

  if (!token) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const incoming = new URL(req.url).searchParams;
  const qs = incoming.toString();

  try {
    const res = await fetch(`${BACKEND_URL}/scraper/status${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Backend respondeu ${res.status}` },
        { status: res.status },
      );
    }

    return NextResponse.json(await res.json());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Backend inacessível';
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;

  if (!token) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { secretId, tribunais } = body as { secretId?: string; tribunais?: string[] };

    if (!secretId) {
      return NextResponse.json({ success: false, error: 'secretId é obrigatório' }, { status: 400 });
    }

    const res = await fetch(`${BACKEND_URL}/scraper/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ secretId, tribunais }),
    });

    const payload = await res.json().catch(() => ({}));
    return NextResponse.json(payload, { status: res.status });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erro ao processar solicitação';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
