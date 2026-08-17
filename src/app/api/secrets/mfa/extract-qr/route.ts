import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy multipart de `POST /users/me/mfa/extract-qr` — repassa o print do QR
 * como `FormData` (o `fetch` do Node monta o boundary sozinho a partir dela).
 * A imagem passa só pela memória, nunca é salva em disco aqui nem no backend.
 */
export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const incoming = await req.formData();
    const file = incoming.get('file');
    if (!file) return NextResponse.json({ error: 'Envie a imagem no campo "file"' }, { status: 400 });

    const outgoing = new FormData();
    outgoing.set('file', file);

    const res = await fetch(`${BACKEND_URL}/users/me/mfa/extract-qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: outgoing,
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
