import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy de `GET /scraper/preview-djen` — client-side nunca fala com o backend direto (ver CLAUDE.md).
 * Usado pelo onboarding: prévia ao vivo do DJEN nacional por OAB, sem credencial nenhuma.
 */
export async function GET(req: Request) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const qs = new URL(req.url).searchParams.toString();

  try {
    const res = await fetch(`${BACKEND_URL}/scraper/preview-djen${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
