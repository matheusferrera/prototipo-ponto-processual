import { NextResponse } from 'next/server';
import { getCalendarioDoProcesso } from '@/lib/api.server';

/**
 * A contagem de movimentações por dia — o que o calendário do processo pinta.
 *
 * Route handler além do Server Component porque a tela pode querer trocar de ano
 * sem recarregar; hoje quem consome é o próprio `page.tsx`, e ela fica pronta
 * para isso.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cat = new URL(req.url).searchParams.get('cat') ?? undefined;

  try {
    return NextResponse.json(await getCalendarioDoProcesso(id, cat));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serviço indisponível';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
