import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { PageInfo } from '@/components/layout/PageInfo/PageInfo';
import type { PageInfoContent } from '@/components/layout/PageInfo/PageInfo';
import { PageContent } from '@/components/movimentacoes/PageContent/PageContent';
import { getMovimentacoes } from '@/lib/api.server';

export const metadata: Metadata = {
  title: 'Movimentações — Ponto Processual',
  description: 'Feed geral de movimentações de todos os processos monitorados.',
};

const tiposFiltro = ['TODAS', 'INTIMAÇÕES', 'SENTENÇAS', 'DESPACHOS', 'AUDIÊNCIAS', 'JUNTADAS'];
const tribunaisFiltro = ['TODOS', 'TRF1', 'TJDFT', 'TRF3'];
const statusFiltro = ['TODOS', 'ENVIADOS', 'NÃO ENVIADOS', 'COM ERRO'];
const ordenacao = ['MAIS RECENTES', 'MAIS ANTIGAS', 'TRIBUNAL', 'STATUS WHATSAPP'];

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, Number(pageParam ?? 1));

  const { groups, total, totalPages, newToday } = await getMovimentacoes(currentPage);

  const pageInfoContent: PageInfoContent = [
    {
      title: 'Últimas movimentações',
      variant: 'compact',
      items: [
        { label: 'Novas (48h)', value: String(newToday).padStart(2, '0'), tone: 'signal' },
        { label: 'Nesta página', value: String(groups.flatMap(g => g.items).length).padStart(2, '0') },
        { label: 'Total', value: String(total) },
      ],
    },
  ];

  return (
    <AppLayout active="Movimentações">
      <PageHeader
        title="Movimentações"
        searchLabel="Pesquisar movimentações"
        searchPlaceholder="Pesquisar movimentações"
        filters={[
          { label: 'Tipo', options: tiposFiltro },
          { label: 'Tribunal', options: tribunaisFiltro },
          { label: 'WhatsApp', options: statusFiltro },
        ]}
        sortOptions={ordenacao}
      />
      <PageContent
        key={currentPage}
        movimentacoes={groups}
        total={total}
        totalPages={totalPages}
        currentPage={currentPage}
        pageInfo={<PageInfo pageInfoContent={pageInfoContent} />}
      />
    </AppLayout>
  );
}
