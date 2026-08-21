import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy de `GET /users/me` — client-side nunca fala com o backend direto.
 * Quem consome é o rodapé do menu, que precisa do nome de quem está logado: o
 * JWT carrega só id, e-mail e papel.
 */
export async function GET() {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });
  }
}
