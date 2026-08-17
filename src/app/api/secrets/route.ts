import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/** Proxy de `GET/POST /users/me/secrets` — client-side nunca fala com o backend direto (ver CLAUDE.md). */
export async function GET() {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/users/me/secrets`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const res = await fetch(`${BACKEND_URL}/users/me/secrets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
