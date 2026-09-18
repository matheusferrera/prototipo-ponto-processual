import { notFound } from 'next/navigation';
import { CardDoAto } from '@/components/movimentacoes/CardDoAto/CardDoAto';
import { FioDoPrazo } from '@/components/movimentacoes/FioDoPrazo/FioDoPrazo';
import { getFioDoPrazo, getMovimentacao } from '@/lib/api.server';

/**
 * O FIO, INTERCEPTADO — o card que abre por cima de onde a pessoa estava.
 *
 * O ato já abria assim desde 15/09/2026; o fio não, e a assimetria aparecia no
 * pior lugar: o botão "Ver o fio do prazo →" mora DENTRO do card do ato e
 * dentro do bloco "o que corre agora" da tela do processo. Clicar nele fechava
 * o card, trocava a tela inteira e levava a pessoa para fora da lista que ela
 * estava lendo — para ver os atos DAQUELE MESMO prazo. Voltar custava o
 * caminho todo de novo.
 *
 * Agora as duas superfícies do produto que respondem "o que aconteceu" abrem do
 * mesmo jeito, e por baixo continua o que estava: o feed, a pauta, a timeline
 * do processo.
 *
 * ## É a MESMA tela, não uma segunda versão
 *
 * O conteúdo é `FioDoPrazo`, o mesmo objeto que `app/movimentacoes/fio/[id]`
 * renderiza — que continua existindo e é quem resolve o link compartilhado, o
 * favorito e o F5. Rota interceptada sem a real por baixo é um 404 esperando o
 * primeiro recarregamento.
 *
 * ## O marcador fica no PRIMEIRO segmento
 *
 * `(.)movimentacoes/fio/[id]`, e não `movimentacoes/(.)fio/[id]`: a fenda mora
 * na raiz (`app/@card`), então o que ela intercepta é o caminho inteiro a
 * partir dali. É a mesma posição de `(.)movimentacoes/[id]` — e foi ela que
 * resolveu, naquele caso, o `Invalid interception route` que o Next 16.2.5 só
 * emite em desenvolvimento.
 */
export default async function CardDoFioInterceptado({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fio = await getFioDoPrazo(id);
  if (!fio) notFound();

  // A cadeia da contagem não vem no payload do fio — ver a página autônoma.
  const ato = fio.prazo.movementId ? await getMovimentacao(fio.prazo.movementId) : null;

  const { prazo } = fio;
  const peca = prazo.ato?.ia?.peca?.trim() || prazo.tipo;

  return (
    <CardDoAto
      titulo={`O fio do prazo — ${peca}`}
      tipo="O fio do prazo"
      /* A barra IDENTIFICA o processo; a peça, o vencimento e a régua são a
         cabeça do próprio fio, logo abaixo. Repetir a peça aqui seria escrevê-la
         duas vezes com 40px entre uma e outra. */
      onde={[prazo.tribunal, prazo.cnj].filter(Boolean).join(' · ')}
    >
      <FioDoPrazo fio={fio} prazoDoAto={ato?.prazo ?? null} />
    </CardDoAto>
  );
}
