import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { PageInfo } from '@/components/layout/PageInfo/PageInfo'
import type { PageInfoContent } from '@/components/layout/PageInfo/PageInfo';
import { PageContent } from '@/components/processos/PageContent/PageContent';
import { processos } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Processos — Ponto Processual',
  description: 'Carteira de processos monitorados.',
};

const tribunaisFiltro = ['TODOS', 'TRF1', 'TJDFT', 'TRF3'];
const statusFiltro = ['TODOS', 'COM NOVIDADE', 'COM ERRO', 'MONITORADOS'];
const whatsFiltro = ['TODOS', 'ATIVOS', 'INATIVOS'];
const ordenacao = ['MAIS RECENTES', 'NÚMERO CNJ', 'TRIBUNAL', 'STATUS'];
const totalProcessos = 142;

const pageInfoContent: PageInfoContent = [
  {
    title: 'Carteira',
    variant: 'compact',
    items: [
      { label: 'Processos', value: String(totalProcessos).padStart(2, '0') },
      { label: 'Com novidade', value: '03', tone: 'signal' },
      { label: 'Com erro', value: '01', tone: 'alert' },
    ],
  },
    {
    title: 'Carteira',
    variant: 'compact',
    items: [
      { label: 'Processos', value: String(totalProcessos).padStart(2, '0') },
      { label: 'Com novidade', value: '03', tone: 'signal' },
      { label: 'Com erro', value: '01', tone: 'alert' },
    ],
  },
  
];

export default function ProcessosPage() {
  return (
    <AppLayout active="Processos">
      <PageHeader
        title="Processos"
        breadcrumb="Início / Processos"
        searchLabel="Pesquisar processos"
        searchPlaceholder="Pesquisar processos"
        filters={[
          { label: 'Tribunal', options: tribunaisFiltro },
          { label: 'Status', options: statusFiltro },
          { label: 'WhatsApp', options: whatsFiltro },
        ]}
        sortOptions={ordenacao}
      />
      <PageContent
        processos={processos}
        pageInfo={<PageInfo pageInfoContent={pageInfoContent} />}
      />
    </AppLayout>
  );
}
