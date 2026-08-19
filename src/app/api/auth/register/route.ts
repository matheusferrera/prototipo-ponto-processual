import { NextRequest, NextResponse } from 'next/server';

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

  res.cookies.set('access_token', loginData.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15,
    path: '/',
  });

  res.cookies.set('refresh_token', loginData.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return res;
}
