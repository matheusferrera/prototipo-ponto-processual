import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Proxy de `PATCH /deadlines/{id}` — a **primeira rota de escrita do produto
 * sobre um prazo**.
 *
 * Até 15/09/2026 o front inteiro era leitura: das 28 rotas de `/api`, nenhuma
 * mudava processo ou prazo. O backend já aceitava `{ fechado }` desde sempre,
 * relia a linha e devolvia a view completa — faltava só a porta.
 *
 * ## O que passa daqui para lá, e o que não passa
 *
 * `PATCH /deadlines/{id}` aceita os campos calculados do prazo e os verbos do
 * advogado. Esta rota encaminha **`fechado`**, **`lembrarEm`** e **`deQuem`**;
 * o recorte é deliberado: os demais são o RESULTADO do
 * cálculo forense — dias, data-limite, natureza —, e deixar a tela reescrevê-los
 * abriria um segundo caminho para a data do prazo mudar, ao lado da calculadora
 * e da leitura por IA. Duas camadas discutindo a mesma data é como se inventa um
 * prazo errado, e o lado perigoso do erro é a data para DEPOIS do vencimento
 * real.
 *
 * Dar baixa não decide data nenhuma: diz que o expediente foi cumprido.
 * `deQuem` também é afirmação do advogado e o backend a guarda separadamente
 * para que uma reanálise não a desfaça.
 *
 * **`lembrarEm` também atravessa**, pelo mesmo critério: o lembrete é a data em
 * que o ADVOGADO quer rever o prazo, não a data do prazo. Até 17/09/2026 esta
 * rota só aceitava `fechado`, e o "Lembrar" da pauta e do card — que manda só
 * `{ lembrarEm }` — recebia 400 em todo clique: o verbo existia na tela e nunca
 * gravou nada.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const jar = await cookies();
  const token = jar.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const corpo = (await req.json().catch(() => ({}))) as {
    fechado?: unknown;
    lembrarEm?: unknown;
    deQuem?: unknown;
  };
  const temFechado = corpo.fechado !== undefined;
  const temLembrete = corpo.lembrarEm !== undefined;
  const temDeQuem = corpo.deQuem !== undefined;
  /* `null` apaga o lembrete; ausente o preserva — a mesma disciplina do backend. */
  const lembreteValido = corpo.lembrarEm === null
    || (typeof corpo.lembrarEm === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(corpo.lembrarEm));
  const deQuemValido = corpo.deQuem === 'destinatario' || corpo.deQuem === 'parteContraria';
  if ((!temFechado && !temLembrete && !temDeQuem)
    || (temFechado && typeof corpo.fechado !== 'boolean')
    || (temLembrete && !lembreteValido)
    || (temDeQuem && !deQuemValido)) {
    return NextResponse.json(
      { error: 'Informe um campo válido para atualizar o prazo.', code: 'CORPO_INVALIDO' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${BACKEND}/deadlines/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(temFechado && { fechado: corpo.fechado }),
        ...(temLembrete && { lembrarEm: corpo.lembrarEm }),
        ...(temDeQuem && { deQuem: corpo.deQuem }),
      }),
      cache: 'no-store',
    });

    /* Rota inexistente no Express responde 404 em `text/html`, e um `res.json()`
       cego estoura nele — o erro vira "Serviço indisponível" e a tela culpa a
       rede por um 404. É o defeito que já custou o fluxo de cadastro pelo Google
       em 11/09/2026; conferir o tipo antes de desserializar é o conserto. */
    const tipo = res.headers.get('content-type') ?? '';
    if (!tipo.includes('application/json')) {
      console.error('[prazos] resposta não-JSON do backend', { status: res.status, tipo });
      return NextResponse.json(
        { error: 'O servidor respondeu de forma inesperada.', code: 'RESPOSTA_INVALIDA' },
        { status: 502 },
      );
    }

    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });
  }
}
