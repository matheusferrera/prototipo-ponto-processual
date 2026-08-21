import { NextRequest, NextResponse } from 'next/server';
import { gravarSessao } from '@/lib/auth-cookies';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (typeof body.email === 'string') body.email = body.email.trim().toLowerCase();

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });
  }

  const data = await backendRes.json();
  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  // Faz login automaticamente
  let loginRes: Response;
  try {
    loginRes = await fetch(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
  } catch {
    return NextResponse.json(data, { status: 201 }); // Pelo menos a conta foi criada
  }

  if (!loginRes.ok) {
    return NextResponse.json(data, { status: 201 });
  }

  const loginData = await loginRes.json();
  const res = NextResponse.json(data, { status: 201 });
  gravarSessao(res, loginData);
  return res;
}
