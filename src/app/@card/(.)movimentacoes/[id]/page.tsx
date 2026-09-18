import { notFound } from 'next/navigation';
import { CorpoDoCard } from '@/components/movimentacoes/CorpoDoCard/CorpoDoCard';
import { CardDoAto } from '@/components/movimentacoes/CardDoAto/CardDoAto';
import { cabecalhoDoAto } from '@/components/movimentacoes/CardDoAto/identidade';
import { AcoesDoDocumento, temAcoesDeDocumento } from '@/components/movimentacoes/AcoesDoDocumento/AcoesDoDocumento';
import { getFioDoPrazo, getMovimentacao } from '@/lib/api.server';

/**
 * O ATO, INTERCEPTADO — o card que abre por cima de onde a pessoa estava.
 *
 * ## A fenda mora na RAIZ, e a posição é a decisão
 *
 * `app/@card/(.)movimentacoes/[id]` intercepta a navegação para um ato **venha
 * ela de onde vier** — e vem de nove lugares: o feed, o painel, a pauta de
 * prazos, o fio, a timeline do processo, o panorama, as análises da IA e as
 * movimentações recentes do dashboard. Com o interceptador dentro de
 * `movimentacoes/`, só os cliques que já estavam no feed abriam o card; os
 * outros caíam na página, e o advogado via a mesma movimentação de duas formas
 * dependendo de onde clicou.
 *
 * > E naquela posição havia um defeito de verdade: com o interceptador irmão
 * > do alvo, o Next 16.2.5 duplica o marcador em desenvolvimento e recusa a
 * > rota — `Invalid interception route: /movimentacoes/(.)(.)(.)(.)(.)<id>`. A
 * > build de produção aceitava, o dev não, e o card simplesmente não abria sem
 * > nada na tela dizendo por quê.
 *
 * ## A lista não sai do DOM
 *
 * É a diferença entre isto e navegar para a página: fechar é `router.back()` e
 * devolve o filtro, a página e o **ponto de rolagem** exatos. Abrir a mesma URL
 * direto, ou recarregar, renderiza `app/movimentacoes/[id]` — que desde
 * 15/09/2026 mostra **este mesmo card**, autônomo. Uma movimentação tem uma
 * aparência só.
 *
 * **Server Component**, e o conteúdo é o MESMO objeto da página (`AtoDetalhe`).
 * Sem isso seria a quinta implementação do mesmo ato no produto, e a primeira a
 * divergir seria a regra do prazo — que é onde divergir custa caro.
 */
export default async function CardDoAtoInterceptado({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mov = await getMovimentacao(id);
  if (!mov) notFound();

  /* O FIO DO PRAZO DESTE ATO — o que o bloco da situação mostra desde
     18/09/2026, no lugar da conta do vencimento (que foi para a tela do fio).
     `mov.prazo.id` é o prazo que ESTE ato abriu; `prazoEmCurso.id` é o prazo do
     processo que já corria quando ele chegou. Sem nenhum dos dois não há fio, e
     o bloco não existe. */
  const idDoPrazo = mov.prazo?.id ?? mov.prazoEmCurso?.id ?? null;
  const fio = idDoPrazo ? await getFioDoPrazo(idDoPrazo) : null;

  const { tipo, onde } = cabecalhoDoAto(mov);

  return (
    <CardDoAto
      titulo={mov.descricao}
      tipo={tipo}
      onde={onde}
      acoes={temAcoesDeDocumento(mov) ? <AcoesDoDocumento mov={mov} /> : undefined}
    >
      <CorpoDoCard mov={mov} fio={fio} />
    </CardDoAto>
  );
}
