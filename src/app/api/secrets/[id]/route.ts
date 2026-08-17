import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

type RouteContext = { params: Promise<{ id: string }> };

/** Proxy de `PATCH/DELETE /users/me/secrets/:secretId`. */
export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const res = await fetch(`${BACKEND_URL}/users/me/secrets/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND_URL}/users/me/secrets/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
