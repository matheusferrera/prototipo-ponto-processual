import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageInfo } from '@/components/layout/PageInfo';
import { Ticker } from '@/components/layout/Ticker';
import type { PageInfoContent } from '@/components/layout/PageInfo';
import { PageContent } from '@/components/movimentacoes/PageContent';
import { movimentacoes } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Movimentações — Ponto Processual',
  description: 'Feed geral de movimentações de todos os processos monitorados.',
};

const tiposFiltro = ['TODAS', 'INTIMAÇÕES', 'SENTENÇAS', 'DESPACHOS', 'AUDIÊNCIAS', 'JUNTADAS'];
const tribunaisFiltro = ['TODOS', 'TRF1', 'TJDFT', 'TRF3'];
const statusFiltro = ['TODOS', 'ENVIADOS', 'NÃO ENVIADOS', 'COM ERRO'];

const pageInfoContent: PageInfoContent = [
  {
    title: 'Últimas movimentações',
    variant: 'compact',
    items: [
      { label: 'Novas hoje', value: '40', tone: 'signal' },
      { label: 'Últimos 7 dias', value: '27' },
      { label: 'Atualizadas hoje', value: '02' },
    ],
  },
  {
    title: 'Tribunais',
    variant: 'bars',
    items: [
      { label: 'TRF1', value: '02', percent: 67 },
      { label: 'TJDFT', value: '03', percent: 100 },
      { label: 'TRF3', value: '02', percent: 67 },
    ],
  },
  {
    title: 'WhatsApp',
    variant: 'status',
    items: [
      { label: 'Enviados', value: '05' },
      { label: 'Pendências', value: '02', tone: 'alert' },
      { label: 'Auto-envio', value: 'ON', tone: 'signal' },
    ],
  },
];

export default function MovimentacoesPage() {
  return (
    <AppLayout active="Movimentações">
      <PageHeader
        eyebrow="Quarta · 06 maio 2026"
        title="Movimentações"
        breadcrumb="Início / Movimentações"
        filters={[
          { label: 'Tipo', options: tiposFiltro },
          { label: 'Tribunal', options: tribunaisFiltro },
          { label: 'WhatsApp', options: statusFiltro },
        ]}
      />
      <Ticker />
      <PageContent
        movimentacoes={movimentacoes}
        pageInfo={<PageInfo pageInfoContent={pageInfoContent} />}
      />
    </AppLayout>
  );
}
