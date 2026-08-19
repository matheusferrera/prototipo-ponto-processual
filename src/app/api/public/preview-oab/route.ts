import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy de `GET /public/preview-oab` — client-side nunca fala com o backend
 * direto (ver CLAUDE.md).
 *
 * Diferente de `/api/scraper/preview-djen`, esta rota é **anônima**: alimenta
 * a busca por OAB do hero da landing, que acontece antes de existir conta.
 * Não repassa cookie nem Authorization — o backend também não pede.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const oabNumero = (searchParams.get('oabNumero') ?? '').replace(/\D/g, '');
  const oabUf = (searchParams.get('oabUf') ?? '').trim().toUpperCase();

  if (!/^\d{1,8}$/.test(oabNumero) || !/^[A-Z]{2}$/.test(oabUf)) {
    return NextResponse.json({ error: 'Informe um número de OAB e uma UF válidos.' }, { status: 400 });
  }

  const qs = new URLSearchParams({ oabNumero, oabUf }).toString();

  try {
    const res = await fetch(`${BACKEND_URL}/public/preview-oab?${qs}`, { cache: 'no-store' });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível consultar agora. Tente de novo em instantes.' },
      { status: 503 },
    );
  }
}
