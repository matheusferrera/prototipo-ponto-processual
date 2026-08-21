import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { FilterWorkspace } from '@/components/filters/FilterWorkspace';
import { getPrazos, getTribunaisDaCarteira } from '@/lib/api.server';
import { PrazosView } from '@/components/prazos/PrazosView/PrazosView';
import { ActivePrazoFilters } from '@/components/prazos/PrazoFilters/ActivePrazoFilters';
import {
  PrazoFilterControls,
  PRAZO_PANEL_HOST_ID,
} from '@/components/prazos/PrazoFilters/PrazoFilterControls';
import {
  parsePrazoFilters,
  prazoFiltersToApi,
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

  const { prazos, criticos } = await getPrazos(1, 100, prazoFiltersToApi(filters));

  return (
    <AppLayout
      active="Prazos"
      mobileTitle="Prazos"
      mobileBreadcrumb="Início / Prazos"
      mobileActions={<PrazoFilterControls filters={filters} tribunals={tribunals} variant="mobile" />}
    >
      <PageHeader basePath="/prazos" title="Prazos" breadcrumb="Início / Prazos">
        <PrazoFilterControls filters={filters} tribunals={tribunals} />
      </PageHeader>

      <FilterWorkspace panelHostId={PRAZO_PANEL_HOST_ID}>
        <ActivePrazoFilters filters={filters} />

        <PrazosView
          prazos={prazos}
          view={filters.view}
          sort={filters.sort}
          order={filters.order}
          criticos={criticos}
        />
      </FilterWorkspace>
    </AppLayout>
  );
}
