import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { PageInfo } from '@/components/layout/PageInfo/PageInfo';
import type { PageInfoContent } from '@/components/layout/PageInfo/PageInfo';
import { FilterWorkspace } from '@/components/filters/FilterWorkspace';
import { PageContent } from '@/components/movimentacoes/PageContent/PageContent';
import { ActiveMovimentacaoFilters } from '@/components/movimentacoes/MovimentacaoFilters/ActiveMovimentacaoFilters';
import {
  MOVIMENTACAO_PANEL_HOST_ID,
  MovimentacaoFilterControls,
} from '@/components/movimentacoes/MovimentacaoFilters/MovimentacaoFilterControls';
import { getMovimentacoes, getTribunaisDaCarteira } from '@/lib/api.server';
import {
  movimentacaoFiltersToApi,
  movimentacaoFiltersToRecord,
  parseMovimentacaoFilters,
  type MovimentacaoSearchParams,
} from '@/lib/movimentacao-filters';

export const metadata: Metadata = {
  title: 'Movimentações — Ponto Processual',
  description: 'Feed geral de movimentações de todos os processos monitorados.',
};

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<MovimentacaoSearchParams>;
}) {
  const sp = await searchParams;
  const requestedPage = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  const currentPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  /* Só os tribunais em que esta conta tem processo: filtrar por um tribunal
     vazio nunca devolveu nada, e a lista completa escondia os que chegam
     pelas fontes públicas. Ver `getTribunaisDaCarteira`. */
  const tribunals = await getTribunaisDaCarteira();
  const filters = parseMovimentacaoFilters(sp, tribunals.map(tribunal => tribunal.code));

  const { groups, total, totalPages, page: backendPage, newToday } =
    await getMovimentacoes(currentPage, 20, movimentacaoFiltersToApi(filters));

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

  const listParams = movimentacaoFiltersToRecord(filters);

  return (
    <AppLayout
      active="Movimentações"
      mobileTitle="Movimentações"
      mobileBreadcrumb="Início / Movimentações"
      mobileActions={<MovimentacaoFilterControls filters={filters} tribunals={tribunals} variant="mobile" />}
    >
      <PageHeader basePath="/movimentacoes" title="Movimentações" breadcrumb="Início / Movimentações">
        <MovimentacaoFilterControls filters={filters} tribunals={tribunals} />
      </PageHeader>

      <FilterWorkspace panelHostId={MOVIMENTACAO_PANEL_HOST_ID}>
        <ActiveMovimentacaoFilters filters={filters} />

        <PageContent
          key={backendPage}
          movimentacoes={groups}
          total={total}
          totalPages={totalPages}
          currentPage={backendPage}
          listParams={listParams}
          pageInfo={<PageInfo pageInfoContent={pageInfoContent} />}
        />
      </FilterWorkspace>
    </AppLayout>
  );
}
