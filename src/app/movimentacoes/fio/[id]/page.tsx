import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { FioDoPrazo } from '@/components/movimentacoes/FioDoPrazo/FioDoPrazo';
import { getFioDoPrazo, getMovimentacao } from '@/lib/api.server';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const fio = await getFioDoPrazo(id);
  if (!fio) return { title: 'Prazo não encontrado' };

  const peca = fio.prazo.ato?.ia?.peca?.trim() || fio.prazo.tipo;
  return {
    title: `${peca} — o fio do prazo`,
    description: `Tudo que aconteceu no processo ${fio.prazo.cnj} desde que o prazo abriu.`,
  };
}

/**
 * A tela do FIO — o prazo como recipiente, a movimentação como evento dentro.
 *
 * Ela é a resposta a "acompanhar as movimentações no decorrer do prazo", e
 * existe porque o feed não responde isso: ele é cronológico sobre o acervo
 * inteiro — 18.485 movimentações e 370 páginas numa conta real, contra 11
 * prazos abertos. Ver o docblock de `FioDoPrazo`.
 *
 * **Server Component puro.** Tudo que a tela mostra vem de uma requisição, e o
 * que é interativo (baixar o prazo, marcar lembrete) já eram client components
 * próprios da pauta — reaproveitados inteiros, sem uma segunda versão aqui.
 */
export default async function FioDoPrazoPage({ params }: Props) {
  const { id } = await params;
  const fio = await getFioDoPrazo(id);
  if (!fio) notFound();

  /* O ATO QUE ABRIU, só pela CADEIA. `/deadlines/{id}/fio` não devolve os
     marcos da contagem — medido em 18/09/2026: nem no `prazo`, nem nos eventos
     —, e quem os carrega é a visão do movimento (`PrazoDoAto.cadeia`). É uma
     requisição a mais, no servidor, para a conta do vencimento poder morar
     aqui em vez de no card do ato. */
  const ato = fio.prazo.movementId ? await getMovimentacao(fio.prazo.movementId) : null;

  const peca = fio.prazo.ato?.ia?.peca?.trim() || fio.prazo.tipo;

  return (
    <AppLayout
      active="Movimentações"
      mobileTitle="O fio do prazo"
      mobileBreadcrumb="Movimentações / Prazo"
    >
      <PageHeader
        basePath={`/movimentacoes/fio/${id}`}
        title="O fio do prazo"
        breadcrumb={`Início / Movimentações / ${peca}`}
      />
      <FioDoPrazo fio={fio} prazoDoAto={ato?.prazo ?? null} />
    </AppLayout>
  );
}
