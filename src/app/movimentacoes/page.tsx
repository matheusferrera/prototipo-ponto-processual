import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { HeaderControls } from '@/components/layout/PageHeader/HeaderControls';
import { PageInfo } from '@/components/layout/PageInfo/PageInfo';
import type { PageInfoContent } from '@/components/layout/PageInfo/PageInfo';
import { PageContent } from '@/components/movimentacoes/PageContent/PageContent';
import { getMovimentacoes } from '@/lib/api.server';

export const metadata: Metadata = {
  title: 'Movimentações — Ponto Processual',
  description: 'Feed geral de movimentações de todos os processos monitorados.',
};

const tiposFiltro = [
  { label: 'TODAS', value: '' },
  { label: 'INTIMAÇÕES', value: 'Intimação' },
  { label: 'SENTENÇAS', value: 'Sentença' },
  { label: 'DESPACHOS', value: 'Despacho' },
  { label: 'AUDIÊNCIAS', value: 'Audiência' },
  { label: 'JUNTADAS', value: 'Juntada' },
];
const tribunaisFiltro = [
  { label: 'TODOS', value: '' },
  { label: 'TRF1', value: 'TRF1' },
  { label: 'TJDFT', value: 'TJDFT' },
  { label: 'TRF3', value: 'TRF3' },
];
const statusFiltro = [
  { label: 'TODOS', value: '' },
  { label: 'ENVIADOS', value: 'enviados' },
  { label: 'NÃO ENVIADOS', value: 'nao-enviados' },
  { label: 'COM ERRO', value: 'erro' },
];
const ordenacao = [
  { label: 'MAIS RECENTES', value: '' },
  { label: 'MAIS ANTIGAS', value: 'antigas' },
  { label: 'TRIBUNAL', value: 'tribunal' },
  { label: 'STATUS WHATSAPP', value: 'whats' },
];

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; tipo?: string; tribunal?: string; status?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? '';
  const currentPage = Math.max(1, Number(sp.page ?? 1));

  const filters = {
    q: query,
    tipo: sp.tipo,
    tribunal: sp.tribunal,
    status: sp.status,
    sort: sp.sort,
  };

  const { groups, total, totalPages, newToday } = await getMovimentacoes(currentPage, 20, filters);

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

  const currentParams = { q: query || undefined, tipo: sp.tipo, tribunal: sp.tribunal, status: sp.status, sort: sp.sort };

  const headerControls = {
    basePath: '/movimentacoes',
    currentParams,
    searchLabel: 'Pesquisar movimentações',
    searchPlaceholder: 'Pesquisar movimentações',
    searchValue: query,
    filters: [
      { label: 'Tipo', param: 'tipo', options: tiposFiltro },
      { label: 'Tribunal', param: 'tribunal', options: tribunaisFiltro },
      { label: 'WhatsApp', param: 'status', options: statusFiltro },
    ],
    sortOptions: ordenacao,
  };

  return (
    <AppLayout
      active="Movimentações"
      mobileTitle="Movimentações"
      mobileBreadcrumb="Início / Movimentações"
      mobileActions={<HeaderControls {...headerControls} variant="mobile" />}
    >
      <PageHeader {...headerControls} title="Movimentações" breadcrumb="Início / Movimentações" />
      <PageContent
        key={currentPage}
        movimentacoes={groups}
        total={total}
        totalPages={totalPages}
        currentPage={currentPage}
        listParams={currentParams}
        pageInfo={<PageInfo pageInfoContent={pageInfoContent} />}
      />
    </AppLayout>
  );
}
