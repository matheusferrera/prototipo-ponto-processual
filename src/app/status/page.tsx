import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { PageInfo } from '@/components/layout/PageInfo/PageInfo';
import type { PageInfoContent } from '@/components/layout/PageInfo/PageInfo';
import { StatusPageContent } from '@/components/status/PageContent/StatusPageContent';
import { getTribunaisStatus } from '@/lib/api.server';
import { agruparPorTribunal } from '@/lib/tribunal-status';

export const metadata: Metadata = {
  title: 'Status dos Tribunais — Ponto Processual',
  description: 'Monitoramento em tempo real da última sincronização e saúde de cada tribunal.',
};

export default async function StatusPage() {
  const { tribunals, unavailable } = await getTribunaisStatus();

  // Os contadores falam de tribunais, não de graus — é o que a tabela mostra,
  // uma linha por tribunal. O status de um grupo é o pior grau dele.
  const grupos = agruparPorTribunal(tribunals);

  const totalTribunals = grupos.length;
  const operacionaisCount = grupos.filter(g => g.status === 'operacional').length;
  const emSincroniaCount = grupos.filter(g => g.status === 'sincronizando').length;
  const alertasCount = grupos.filter(g => g.status === 'atencao' || g.status === 'erro').length;
  const semCredencialCount = grupos.filter(g => g.status === 'nao_configurado').length;

  // Média apenas sobre tribunais efetivamente medidos: incluir os `null` como 0
  // afundaria a média e faria o sistema parecer mais rápido do que é.
  const measured = grupos.filter(g => g.latencyMs !== null);
  const avgLatency = measured.length
    ? `${(measured.reduce((acc, g) => acc + (g.latencyMs ?? 0), 0) / measured.length / 1000).toFixed(1)}s`
    : '—';

  const pageInfoContent: PageInfoContent = [
    {
      title: 'Saúde Geral dos Tribunais',
      variant: 'compact',
      items: [
        { label: 'Tribunais Monitorados', value: String(totalTribunals).padStart(2, '0') },
        { label: 'Operacionais', value: String(operacionaisCount).padStart(2, '0'), tone: 'positive' },
        { label: 'Em Varredura', value: String(emSincroniaCount).padStart(2, '0'), tone: 'signal' },
        { label: 'Com Alertas', value: String(alertasCount).padStart(2, '0'), tone: 'alert' },
        { label: 'Sem Credencial', value: String(semCredencialCount).padStart(2, '0') },
        { label: 'Duração Média', value: avgLatency },
      ],
    },
  ];

  return (
    <AppLayout
      active="Status"
      mobileTitle="Status dos Tribunais"
      mobileBreadcrumb="Início / Status"
    >
      <PageHeader
        basePath="/status"
        title="Status dos Tribunais"
        breadcrumb="Início / Monitoramento / Status"
        whatsBadge={{ active: true, count: totalTribunals }}
      />

      <StatusPageContent
        initialTribunals={tribunals}
        initialUnavailable={unavailable}
        pageInfo={<PageInfo pageInfoContent={pageInfoContent} />}
      />
    </AppLayout>
  );
}
