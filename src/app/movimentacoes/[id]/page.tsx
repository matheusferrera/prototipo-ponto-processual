import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CorpoDoCard } from '@/components/movimentacoes/CorpoDoCard/CorpoDoCard';
import { CardDoAto } from '@/components/movimentacoes/CardDoAto/CardDoAto';
import { getMovimentacao } from '@/lib/api.server';
import { getAbsoluteUrl } from '@/lib/site-url';
import { cabecalhoDoAto } from '@/components/movimentacoes/CardDoAto/identidade';
import { AcoesDoDocumento, temAcoesDeDocumento } from '@/components/movimentacoes/AcoesDoDocumento/AcoesDoDocumento';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const mov = await getMovimentacao(id);
  if (!mov) return { title: 'Movimentação não encontrada' };

  const proc = mov.processData;
  const tribunal = proc?.tribunal.replace(/G[12]$/, '') ?? '—';
  const partes = proc?.summary?.partes?.split(';')[0].trim() ?? '—';
  const description = proc ? `${tribunal} · CNJ ${proc.numero}` : 'Movimentação';
  const imageUrl = getAbsoluteUrl('/opengraph-image');
  const title = `Movimentação — ${partes}`;

  return {
    title,
    description,
    openGraph: {
      title, description, type: 'article',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: 'Ponto Processual — Movimentação' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [imageUrl] },
  };
}

/**
 * O ATO, AUTÔNOMO — e é **o mesmo card** que abre sobre a lista.
 *
 * ## Por que esta página existe, se o ato abre como card
 *
 * Porque a rota **tem** de existir: é ela que resolve o link compartilhado, o
 * favorito e o F5, e é dela que `app/@card/(.)movimentacoes/[id]` intercepta.
 * Uma rota interceptada sem a rota real por baixo é um 404 esperando o
 * primeiro recarregamento.
 *
 * ## O que mudou em 15/09/2026
 *
 * Ela era uma tela INTEIRA e diferente — breadcrumb, hero, sidebar de processo,
 * 228 linhas de layout e um CSS Module só dela. O mesmo ato tinha duas caras:
 * uma quando se clicava no feed, outra quando se abria o link. Agora tem uma
 * só, e a diferença entre os dois caminhos é o que está ATRÁS do card (a lista,
 * ou nada) e para onde o × leva.
 *
 * Quem entende o produto em uma tela a menos é o advogado — era literalmente o
 * pedido: *"movimentação só aparece assim, pra ficar mais fácil de entender"*.
 *
 * ## O × leva ao feed, não a `back()`
 *
 * Aqui não houve navegação a desfazer: a entrada anterior do histórico pode ser
 * o e-mail em que o link chegou. `/movimentacoes` é o destino honesto — e "ver
 * o processo" continua dentro do card, que é para onde quem recebeu o link
 * costuma querer ir depois.
 */
export default async function MovimentacaoPage({ params }: Props) {
  const { id } = await params;
  const mov = await getMovimentacao(id);
  if (!mov) notFound();

  const { tipo, onde } = cabecalhoDoAto(mov);

  return (
    <CardDoAto
      titulo={mov.descricao}
      tipo={tipo}
      onde={onde}
      fecharPara="/movimentacoes"
      acoes={temAcoesDeDocumento(mov) ? <AcoesDoDocumento mov={mov} /> : undefined}
    >
      <CorpoDoCard mov={mov} />
    </CardDoAto>
  );
}
