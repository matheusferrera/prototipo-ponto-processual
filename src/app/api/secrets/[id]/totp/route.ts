import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy de `GET /users/me/secret/getTotp?id=` — código TOTP atual de uma credencial, para conferência. */
export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/users/me/secret/getTotp?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
