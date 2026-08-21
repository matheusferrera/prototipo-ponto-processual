import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { PageInfo } from '@/components/layout/PageInfo/PageInfo';
import type { PageInfoContent } from '@/components/layout/PageInfo/PageInfo';
import { PageContent } from '@/components/processos/PageContent/PageContent';
import { ActiveProcessFilters } from '@/components/processos/ProcessFilters/ActiveProcessFilters';
import {
  PROCESS_FILTER_PANEL_HOST_ID,
  ProcessFilterControls,
} from '@/components/processos/ProcessFilters/ProcessFilterControls';
import { ProcessTableProvider } from '@/components/processos/ProcessTable/ProcessTableProvider';
import { getProcessos, getTribunaisDaCarteira } from '@/lib/api.server';
import {
  parseProcessFilters,
  processFiltersToApi,
  processFiltersToRecord,
  type ProcessSearchParams,
} from '@/lib/process-filters';

export const metadata: Metadata = {
  title: 'Processos — Ponto Processual',
  description: 'Carteira de processos monitorados.',
};

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<ProcessSearchParams>;
}) {
  const sp = await searchParams;
  const requestedPage = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  const currentPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  /* Só os tribunais em que esta conta tem processo: filtrar por um tribunal
     vazio nunca devolveu nada, e a lista completa escondia os que chegam
     pelas fontes públicas. Ver `getTribunaisDaCarteira`. */
  const tribunals = await getTribunaisDaCarteira();
  const tribunalCodes = tribunals.map(tribunal => tribunal.code);
  const filters = parseProcessFilters(sp, tribunalCodes);

  const {
    processos,
    total,
    totalPages,
    page: backendPage,
    comNovidade,
  } = await getProcessos(currentPage, 20, processFiltersToApi(filters));

  // prazos abertos só são conhecidos na página carregada — o backend não agrega isso
  const prazosNaPagina = processos.reduce((soma, processo) => soma + processo.prazosAbertos, 0);

  const pageInfoContent: PageInfoContent = [
    {
      title: 'Carteira',
      variant: 'compact',
      items: [
        { label: 'Total filtrado', value: String(total).padStart(2, '0') },
        { label: 'Com novidade', value: String(comNovidade).padStart(2, '0'), tone: 'signal' },
        { label: 'Prazos abertos nesta página', value: String(prazosNaPagina).padStart(2, '0') },
      ],
    },
  ];

  const listParams = processFiltersToRecord(filters);

  return (
    <ProcessTableProvider>
      <AppLayout
        active="Processos"
        mobileTitle="Processos"
        mobileBreadcrumb="Início / Processos"
      >
        <PageHeader basePath="/processos" title="Processos" breadcrumb="Início / Processos">
          <ProcessFilterControls filters={filters} tribunals={tribunals} />
        </PageHeader>

        <PageContent
          processos={processos}
          total={total}
          totalPages={totalPages}
          currentPage={backendPage}
          listParams={listParams}
          panelHostId={PROCESS_FILTER_PANEL_HOST_ID}
          pageInfo={<PageInfo pageInfoContent={pageInfoContent} />}
          mobileControls={(
            <ProcessFilterControls filters={filters} tribunals={tribunals} variant="mobile" inline />
          )}
          tableControls={(
            <ActiveProcessFilters filters={filters} />
          )}
        />
      </AppLayout>
    </ProcessTableProvider>
  );
}
