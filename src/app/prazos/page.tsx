import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { FilterWorkspace } from '@/components/filters/FilterWorkspace';
import { getPrazos, getTribunaisDaCarteira } from '@/lib/api.server';
import { PrazosView } from '@/components/prazos/PrazosView/PrazosView';
import { ActivePrazoFilters } from '@/components/prazos/PrazoFilters/ActivePrazoFilters';
import { PrazoSummaryBar } from '@/components/prazos/PrazoSummaryBar/PrazoSummaryBar';
import { ExportPrazosPdfButton } from '@/components/prazos/ExportPrazosPdfButton/ExportPrazosPdfButton';
import {
  PrazoFilterControls,
  PRAZO_PANEL_HOST_ID,
} from '@/components/prazos/PrazoFilters/PrazoFilterControls';
import {
  parsePrazoFilters,
  prazoFiltersToApi,
  prazoFiltersToRecord,
  type PrazoSearchParams,
} from '@/lib/prazo-filters';

export const metadata: Metadata = {
  title: 'Prazos — Ponto Processual',
  description: 'Próximos prazos processuais.',
};

export default async function PrazosPage({
  searchParams,
}: {
  searchParams: Promise<PrazoSearchParams>;
}) {
  const sp = await searchParams;
  /* Só os tribunais em que esta conta tem processo: filtrar por um tribunal
     vazio nunca devolveu nada, e a lista completa escondia os que chegam
     pelas fontes públicas. Ver `getTribunaisDaCarteira`. */
  const tribunals = await getTribunaisDaCarteira();
  const filters = parsePrazoFilters(sp, tribunals.map(tribunal => tribunal.code));

  /* 500, e não 100: sem o corte por data a lista passou a trazer o acervo
     inteiro de prazos (medido: 773 numa conta, contra os 12 que a tela via
     antes), e um teto de 100 cortaria em silêncio — sem paginação visível,
     "não está na lista" viraria "não existe". */
  const { prazos } = await getPrazos(1, 500, prazoFiltersToApi(filters));
  const listParams = prazoFiltersToRecord(filters);

  return (
    <AppLayout
      active="Prazos"
      mobileTitle="Prazos"
      mobileBreadcrumb="Início / Prazos"
      mobileActions={(
        <PrazoFilterControls
          filters={filters}
          tribunals={tribunals}
          variant="mobile"
          trailing={<ExportPrazosPdfButton prazos={prazos} compact />}
        />
      )}
    >
      <PageHeader basePath="/prazos" title="Prazos" breadcrumb="Início / Prazos">
        <PrazoFilterControls
          filters={filters}
          tribunals={tribunals}
          trailing={<ExportPrazosPdfButton prazos={prazos} compact />}
        />
      </PageHeader>

      <FilterWorkspace panelHostId={PRAZO_PANEL_HOST_ID}>
        <PrazoSummaryBar listParams={listParams} />
        <ActivePrazoFilters filters={filters} />

        <PrazosView
          prazos={prazos}
          view={filters.view}
          sort={filters.sort}
        />
      </FilterWorkspace>
    </AppLayout>
  );
}
