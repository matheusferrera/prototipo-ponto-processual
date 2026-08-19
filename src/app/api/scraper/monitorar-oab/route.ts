import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy de `POST /scraper/monitorar-oab` — client-side nunca fala com o backend direto (ver CLAUDE.md).
 * Usado pelo onboarding logo após a prévia: salva a OAB na conta e dispara a
 * sincronização do DJEN, pra que o painel não fique vazio quando o usuário
 * escolhe "pular por agora" em vez de cadastrar credencial.
 */
export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.text();

  try {
    const res = await fetch(`${BACKEND_URL}/scraper/monitorar-oab`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
