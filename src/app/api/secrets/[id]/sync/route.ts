import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Proxy de `POST /scraper/sync` escopado a uma credencial — dispara a
 * sincronização dos tribunais que ela cobre (o backend usa `secret.tribunais`
 * quando `tribunais` não é enviado).
 */
export async function POST(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/scraper/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretId: id }),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
