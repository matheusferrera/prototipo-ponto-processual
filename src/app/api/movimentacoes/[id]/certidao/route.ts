import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * A certidão de publicação do ato, em PDF.
 *
 * Proxy e não link direto, por duas razões que se somam. A primeira é a de
 * sempre no `/api/*`: o browser tem o cookie httpOnly, não o Bearer, então
 * quem fala com o backend é o servidor do Next. A segunda é específica deste
 * documento — o backend guarda a chave da certidão e **nunca a devolve**,
 * porque ela abre uma rota pública do CNJ sem autenticação nenhuma. Um link
 * direto para o CNJ na tela entregaria o documento de um processo a qualquer
 * um que lesse o HTML.
 *
 * O corpo é binário, então `NextResponse.json` não serve: o PDF é repassado
 * como stream de bytes, com o `Content-Disposition` que o backend definiu
 * (`inline`, para abrir em aba em vez de baixar).
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
    backendRes = await fetch(`${BACKEND}/movements/${encodeURIComponent(id)}/certidao`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });
  }

  // Erro do backend chega como JSON (404 `SEM_CERTIDAO`, 502 do CNJ) e é
  // repassado como JSON — devolver um PDF vazio faria o navegador abrir uma
  // aba em branco, que é o sintoma mais difícil de diagnosticar.
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
