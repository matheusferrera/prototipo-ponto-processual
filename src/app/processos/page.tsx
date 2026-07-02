import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { HeaderControls } from '@/components/layout/PageHeader/HeaderControls';
import { PageInfo } from '@/components/layout/PageInfo/PageInfo'
import type { PageInfoContent } from '@/components/layout/PageInfo/PageInfo';
import { PageContent } from '@/components/processos/PageContent/PageContent';
import { getProcessos } from '@/lib/api.server';

export const metadata: Metadata = {
  title: 'Processos — Ponto Processual',
  description: 'Carteira de processos monitorados.',
};

const tribunaisFiltro = [
  { label: 'TODOS', value: '' },
  { label: 'TRF1', value: 'TRF1' },
  { label: 'TJDFT', value: 'TJDFT' },
  { label: 'TRF3', value: 'TRF3' },
];
const statusFiltro = [
  { label: 'TODOS', value: '' },
  { label: 'COM NOVIDADE', value: 'signal' },
  { label: 'COM ERRO', value: 'alert' },
  { label: 'MONITORADOS', value: 'quiet' },
];
const whatsFiltro = [
  { label: 'TODOS', value: '' },
  { label: 'ATIVOS', value: 'ativos' },
  { label: 'INATIVOS', value: 'inativos' },
];
const ordenacao = [
  { label: 'MAIS RECENTES', value: '' },
  { label: 'NÚMERO CNJ', value: 'cnj' },
  { label: 'TRIBUNAL', value: 'tribunal' },
  { label: 'STATUS', value: 'status' },
];

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; tribunal?: string; status?: string; whats?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? '';
  const currentPage = Math.max(1, Number(sp.page ?? 1));

  const filters = {
    q: query,
    tribunal: sp.tribunal,
    status: sp.status,
    whats: sp.whats,
    sort: sp.sort,
  };

  const { processos, total, totalPages } = await getProcessos(currentPage, 20, filters);

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

  // params preservados na navegação (filtros/busca, sem a página)
  const currentParams = { q: query || undefined, tribunal: sp.tribunal, status: sp.status, whats: sp.whats, sort: sp.sort };

  const headerControls = {
    basePath: '/processos',
    currentParams,
    searchLabel: 'Pesquisar processos',
    searchPlaceholder: 'Pesquisar processos',
    searchValue: query,
    filters: [
      { label: 'Tribunal', param: 'tribunal', options: tribunaisFiltro },
      { label: 'Status', param: 'status', options: statusFiltro },
      { label: 'WhatsApp', param: 'whats', options: whatsFiltro },
    ],
    sortOptions: ordenacao,
  };

  return (
    <AppLayout
      active="Processos"
      mobileTitle="Processos"
      mobileBreadcrumb="Início / Processos"
      mobileActions={<HeaderControls {...headerControls} variant="mobile" />}
    >
      <PageHeader {...headerControls} title="Processos" breadcrumb="Início / Processos" />
      <PageContent
        processos={processos}
        total={total}
        totalPages={totalPages}
        currentPage={currentPage}
        listParams={currentParams}
        pageInfo={<PageInfo pageInfoContent={pageInfoContent} />}
      />
    </AppLayout>
  );
}
