import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { getPrazos } from '@/lib/api.server';
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
  const filters = parsePrazoFilters(sp);

  const { prazos, criticos, pautaAtrasada } = await getPrazos(1, 100, prazoFiltersToApi(filters));

  return (
    <AppLayout
      active="Prazos"
      mobileTitle="Prazos"
      mobileBreadcrumb="Início / Prazos"
      mobileActions={<PrazoFilterControls filters={filters} variant="mobile" />}
    >
      <PageHeader basePath="/prazos" title="Prazos" breadcrumb="Início / Prazos">
        <PrazoFilterControls filters={filters} />
      </PageHeader>

      <div id={PRAZO_PANEL_HOST_ID} />
      <ActivePrazoFilters filters={filters} />

      <PrazosView
        prazos={prazos}
        view={filters.view}
        sort={filters.sort}
        order={filters.order}
        criticos={criticos}
        pautaAtrasada={pautaAtrasada}
      />
    </AppLayout>
  );
}
