import { NextRequest, NextResponse } from 'next/server';
import { gravarSessao } from '@/lib/auth-cookies';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (typeof body.email === 'string') body.email = body.email.trim().toLowerCase();

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });
  }

  const data = await backendRes.json();

  if (!backendRes.ok) {
    // `code` passa adiante: é por ele que a tela sabe quando o erro é "esta
    // conta entra pelo Google" e oferece o botão certo em vez do texto genérico.
    return NextResponse.json(data, { status: backendRes.status });
  }

  const res = NextResponse.json({ user: data.user });
  gravarSessao(res, data);
  return res;
}
