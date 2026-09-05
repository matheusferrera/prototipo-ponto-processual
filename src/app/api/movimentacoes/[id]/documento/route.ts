import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * A peça anexada à movimentação, em PDF — despacho, decisão, sentença,
 * certidão, petição.
 *
 * Irmã de `certidao/route.ts`, e pela mesma razão dupla: o browser tem o cookie
 * httpOnly e não o Bearer, então quem fala com o backend é o servidor do Next;
 * e a chave que abre o documento na consulta pública do tribunal não precisa
 * chegar à tela para o documento chegar.
 *
 * Existe porque `documentos[].urlDocumento` vem **vazio** na maior parte do
 * acervo público (medido em 05/09/2026: 57 de 532 movimentações com documento
 * tinham URL). A tela filtrava por URL e escondia as outras 475 como se não
 * houvesse documento — quando o que faltava era um caminho para pedi-lo.
 *
 * `?i=` é o índice em `documentos[]`. Repassado como está: quem valida é o
 * backend, que responde 404 `SEM_DOCUMENTO` para índice inexistente.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = req.cookies.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const indice = req.nextUrl.searchParams.get('i') ?? '0';

  let backendRes: Response;
  try {
    backendRes = await fetch(
      `${BACKEND}/movements/${encodeURIComponent(id)}/documento?i=${encodeURIComponent(indice)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    );
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });
  }

  // Erro do backend chega como JSON (404 `SEM_DOCUMENTO`/`DOCUMENTO_INDISPONIVEL`,
  // 502 do tribunal) e é repassado como JSON — devolver PDF vazio faria o
  // navegador abrir uma aba em branco, que é o sintoma mais difícil de
  // diagnosticar.
  if (!backendRes.ok) {
    const erro = await backendRes.json().catch(() => ({ error: 'Falha ao buscar o documento' }));
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
