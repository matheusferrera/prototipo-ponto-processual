import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { PageInfo } from '@/components/layout/PageInfo/PageInfo';
import type { PageInfoContent } from '@/components/layout/PageInfo/PageInfo';
import { PageContent } from '@/components/movimentacoes/PageContent/PageContent';
import { movimentacoes } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Movimentações — Ponto Processual',
  description: 'Feed geral de movimentações de todos os processos monitorados.',
};

const tiposFiltro = ['TODAS', 'INTIMAÇÕES', 'SENTENÇAS', 'DESPACHOS', 'AUDIÊNCIAS', 'JUNTADAS'];
const tribunaisFiltro = ['TODOS', 'TRF1', 'TJDFT', 'TRF3'];
const statusFiltro = ['TODOS', 'ENVIADOS', 'NÃO ENVIADOS', 'COM ERRO'];
const ordenacao = ['MAIS RECENTES', 'MAIS ANTIGAS', 'TRIBUNAL', 'STATUS WHATSAPP'];

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
    title: 'Últimas movimentações',
    variant: 'compact',
    items: [
      { label: 'Novas hoje', value: '40', tone: 'signal' },
      { label: 'Últimos 7 dias', value: '27' },
      { label: 'Atualizadas hoje', value: '02' },
    ],
  }
];

export default function MovimentacoesPage() {
  return (
    <AppLayout active="Movimentações">
      <PageHeader
        title="Movimentações"
        //breadcrumb="Início / Movimentações"
        loading
        searchLabel="Pesquisar movimentações"
        searchPlaceholder="Pesquisar movimentações"
        filters={[
          { label: 'Tipo', options: tiposFiltro },
          { label: 'Tribunal', options: tribunaisFiltro },
          { label: 'WhatsApp', options: statusFiltro },
        ]}
        sortOptions={ordenacao}
      />
      <PageContent
        movimentacoes={movimentacoes}
        pageInfo={<PageInfo pageInfoContent={pageInfoContent} />}
      />
    </AppLayout>
  );
}
