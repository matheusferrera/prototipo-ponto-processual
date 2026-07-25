import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { PageInfo } from '@/components/layout/PageInfo/PageInfo';
import type { PageInfoContent } from '@/components/layout/PageInfo/PageInfo';
import { PageContent } from '@/components/processos/PageContent/PageContent';
import { ActiveProcessFilters } from '@/components/processos/ProcessFilters/ActiveProcessFilters';
import { ProcessFilterControls } from '@/components/processos/ProcessFilters/ProcessFilterControls';
import { ProcessSavedViewsControl } from '@/components/processos/ProcessFilters/ProcessSavedViewsControl';
import { ProcessTableProvider } from '@/components/processos/ProcessTable/ProcessTableProvider';
import { getProcessos } from '@/lib/api.server';
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
  const filters = parseProcessFilters(sp);

  const {
    processos,
    total,
    totalPages,
    page: backendPage,
    comNovidade,
    comErro,
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
        { label: 'Com erro', value: String(comErro).padStart(2, '0'), tone: 'alert' },
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
        mobileActions={(
          <ProcessFilterControls
            filters={filters}
            variant="mobile"
            viewsControl={<ProcessSavedViewsControl filters={filters} compact />}
          />
        )}
      >
        <PageHeader basePath="/processos" title="Processos" breadcrumb="Início / Processos">
          <ProcessFilterControls
            filters={filters}
            viewsControl={<ProcessSavedViewsControl filters={filters} />}
          />
        </PageHeader>

        <PageContent
          processos={processos}
          total={total}
          totalPages={totalPages}
          currentPage={backendPage}
          listParams={listParams}
          pageInfo={<PageInfo pageInfoContent={pageInfoContent} />}
          tableControls={(
            <>
              <div id="process-inline-panel-host" />
              <ActiveProcessFilters filters={filters} />
            </>
          )}
        />
      </AppLayout>
    </ProcessTableProvider>
  );
}
