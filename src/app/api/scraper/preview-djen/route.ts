import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Prévia por OAB do onboarding — client-side nunca fala com o backend direto
 * (ver CLAUDE.md).
 *
 * **Aponta para `GET /consulta-publica/previa` desde 11/09/2026.** Apontava para
 * `GET /scraper/preview-djen`, que o backend removeu em 04/09/2026 junto com o
 * corte scraper × consulta pública. A rota morta respondia **404 em HTML**, o
 * `res.json()` aqui estourava no `<!DOCTYPE`, e o onboarding mostrava "Falha ao
 * conectar ao servidor" — como se o problema fosse rede.
 *
 * A resposta da rota viva é um SUPERCONJUNTO da antiga (`totalProcessos`,
 * `desde`, `tribunais[{sigla, processos}]`, mais o resto da prévia), então o
 * componente não muda.
 */
export async function GET(req: Request) {
  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const qs = new URL(req.url).searchParams.toString();

  try {
    const res = await fetch(`${BACKEND_URL}/consulta-publica/previa${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    /* Rota que não existe responde 404 em `text/html` ("Cannot GET …"), e um
       `res.json()` sobre isso vira erro de parse — que a tela lê como queda de
       rede. Este ramo é o que transforma rota órfã em mensagem que se entende,
       e é o modo de falha que já custou este fluxo uma vez. */
    const tipo = res.headers.get('content-type') ?? '';
    if (!tipo.includes('application/json')) {
      console.error(
        `[preview-djen] ${BACKEND_URL} respondeu ${res.status} com content-type "${tipo}" — a rota do backend mudou?`,
      );
      return NextResponse.json(
        { error: 'A consulta pública não respondeu como esperado. Tente de novo em instantes.' },
        { status: 502 },
      );
    }

    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
