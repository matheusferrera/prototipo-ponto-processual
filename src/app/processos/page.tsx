import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { PageContent } from '@/components/processos/PageContent/PageContent';
import { ActiveProcessFilters } from '@/components/processos/ProcessFilters/ActiveProcessFilters';
import {
  PROCESS_FILTER_PANEL_HOST_ID,
  ProcessFilterControls,
} from '@/components/processos/ProcessFilters/ProcessFilterControls';
import { ProcessSummaryBar } from '@/components/processos/ProcessSummaryBar/ProcessSummaryBar';
import { ProcessTableProvider } from '@/components/processos/ProcessTable/ProcessTableProvider';
import { ProcessViewToolbar } from '@/components/processos/ProcessView/ProcessView';
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
    contagem,
  } = await getProcessos(currentPage, 20, processFiltersToApi(filters));

  const listParams = processFiltersToRecord(filters);

  return (
    <ProcessTableProvider>
      <AppLayout
        active="Processos"
        mobileTitle="Processos"
        mobileBreadcrumb="Início / Processos"
        mobileActions={<ProcessFilterControls filters={filters} tribunals={tribunals} variant="mobile" />}
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
          summary={(
            <ProcessSummaryBar contagem={contagem} listParams={listParams}>
              <ProcessViewToolbar />
            </ProcessSummaryBar>
          )}
          tableControls={(
            <ActiveProcessFilters filters={filters} />
          )}
        />
      </AppLayout>
    </ProcessTableProvider>
  );
}
