import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { HeaderControls } from '@/components/layout/PageHeader/HeaderControls';
import { getPrazos } from '@/lib/api.server';
import { PrazosView } from '@/components/prazos/PrazosView/PrazosView';
import type { PrazoView } from '@/components/prazos/PrazosView/PrazosView';

export const metadata: Metadata = {
  title: 'Prazos — Ponto Processual',
  description: 'Próximos prazos processuais.',
};

const viewsTab = [
  { label: 'Lista', value: '' },
  { label: 'Kanban', value: 'kanban' },
  { label: 'Calendário', value: 'calendario' },
];
const tribunaisFiltro = [
  { label: 'TODOS', value: '' },
  { label: 'TRF1', value: 'TRF1' },
  { label: 'TJDFT', value: 'TJDFT' },
  { label: 'TRF3', value: 'TRF3' },
];
const urgenciaFiltro = [
  { label: 'TODOS', value: '' },
  { label: 'CRÍTICO', value: 'critico' },
  { label: 'URGENTE', value: 'urgente' },
];
const ordenacao = [
  { label: 'MAIS URGENTE', value: '' },
  { label: 'MENOS URGENTE', value: 'menos-urgente' },
  { label: 'TRIBUNAL', value: 'tribunal' },
];

const VALID_VIEWS: PrazoView[] = ['lista', 'kanban', 'calendario'];

export default async function PrazosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tribunal?: string; urgencia?: string; sort?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? '';
  const view: PrazoView = VALID_VIEWS.includes(sp.view as PrazoView) ? (sp.view as PrazoView) : 'lista';

  const prazos = await getPrazos(1, 100, {
    q: query,
    tribunal: sp.tribunal,
    urgencia: sp.urgencia,
    sort: sp.sort,
  });

  const currentParams = {
    q: query || undefined,
    tribunal: sp.tribunal,
    urgencia: sp.urgencia,
    sort: sp.sort,
    view: sp.view,
  };

  const headerControls = {
    basePath: '/prazos',
    currentParams,
    tabs: { param: 'view', options: viewsTab },
    searchLabel: 'Pesquisar prazos',
    searchPlaceholder: 'Pesquisar prazos',
    searchValue: query,
    filters: [
      { label: 'Tribunal', param: 'tribunal', options: tribunaisFiltro },
      { label: 'Urgência', param: 'urgencia', options: urgenciaFiltro },
    ],
    sortOptions: ordenacao,
  };

  return (
    <AppLayout
      active="Prazos"
      mobileTitle="Prazos"
      mobileBreadcrumb="Início / Prazos"
      mobileActions={<HeaderControls {...headerControls} variant="mobile" />}
    >
      <PageHeader {...headerControls} title="Prazos" breadcrumb="Início / Prazos" />
      <PrazosView prazos={prazos} view={view} />
    </AppLayout>
  );
}
