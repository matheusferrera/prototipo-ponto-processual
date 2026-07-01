import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { PageInfo } from '@/components/layout/PageInfo/PageInfo'
import type { PageInfoContent } from '@/components/layout/PageInfo/PageInfo';
import { PageContent } from '@/components/processos/PageContent/PageContent';
import { getProcessos } from '@/lib/api.server';

export const metadata: Metadata = {
  title: 'Processos — Ponto Processual',
  description: 'Carteira de processos monitorados.',
};

const tribunaisFiltro = ['TODOS', 'TRF1', 'TJDFT', 'TRF3'];
const statusFiltro = ['TODOS', 'COM NOVIDADE', 'COM ERRO', 'MONITORADOS'];
const whatsFiltro = ['TODOS', 'ATIVOS', 'INATIVOS'];
const ordenacao = ['MAIS RECENTES', 'NÚMERO CNJ', 'TRIBUNAL', 'STATUS'];

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam, q } = await searchParams;
  const query = q?.trim() ?? '';
  const currentPage = Math.max(1, Number(pageParam ?? 1));

  const { processos, total, totalPages } = await getProcessos(currentPage, 20, query);

  const comNovidade = processos.filter(p => p.state === 'signal').length;
  const comErro = processos.filter(p => p.state === 'alert').length;

  const pageInfoContent: PageInfoContent = [
    {
      title: 'Carteira',
      variant: 'compact',
      items: [
        { label: 'Total', value: String(total).padStart(2, '0') },
        { label: 'Com novidade', value: String(comNovidade).padStart(2, '0'), tone: 'signal' },
        { label: 'Com erro', value: String(comErro).padStart(2, '0'), tone: 'alert' },
      ],
    },
  ];

  return (
    <AppLayout active="Processos">
      <PageHeader
        title="Processos"
        breadcrumb="Início / Processos"
        searchLabel="Pesquisar processos"
        searchPlaceholder="Pesquisar processos"
        searchValue={query}
        filters={[
          { label: 'Tribunal', options: tribunaisFiltro },
          { label: 'Status', options: statusFiltro },
          { label: 'WhatsApp', options: whatsFiltro },
        ]}
        sortOptions={ordenacao}
      />
      <PageContent
        processos={processos}
        total={total}
        totalPages={totalPages}
        currentPage={currentPage}
        pageInfo={<PageInfo pageInfoContent={pageInfoContent} />}
      />
    </AppLayout>
  );
}
