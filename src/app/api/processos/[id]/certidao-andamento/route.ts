import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * A certidão de andamento do processo no STJ, em PDF.
 *
 * Documento do PROCESSO, não de uma movimentação — é a diferença que justifica
 * a rota viver sob `/api/processos/` e não sob `/api/movimentacoes/`: a via
 * pública do STJ não expõe peça por ato, e essa certidão é o que cobre a
 * timeline inteira (capa, partes e todas as fases até o trânsito e a baixa).
 *
 * Proxy pelas duas razões de sempre: o browser tem o cookie httpOnly e não o
 * Bearer, e a chave que emite a certidão no STJ não precisa chegar à tela.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = req.cookies.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;

  let backendRes: Response;
  try {
    backendRes = await fetch(
      `${BACKEND}/processes/${encodeURIComponent(id)}/certidao-andamento`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    );
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });
  }

  // Erro do backend chega como JSON (404 `SEM_CERTIDAO_ANDAMENTO`, 502 do STJ) e
  // é repassado como JSON — PDF vazio faria o navegador abrir aba em branco.
  if (!backendRes.ok) {
    const erro = await backendRes.json().catch(() => ({ error: 'Falha ao buscar a certidão' }));
    return NextResponse.json(erro, { status: backendRes.status });
  }

  return new NextResponse(backendRes.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': backendRes.headers.get('content-disposition') ?? 'inline',
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
