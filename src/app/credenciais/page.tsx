import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { PageInfo } from '@/components/layout/PageInfo/PageInfo';
import type { PageInfoContent } from '@/components/layout/PageInfo/PageInfo';
import { CredenciaisPageContent } from '@/components/credenciais/PageContent/CredenciaisPageContent';
import { getScraperSecrets, getTribunaisStatus } from '@/lib/api.server';
import { agruparPorSistema } from '@/lib/credenciais';

export const metadata: Metadata = {
  title: 'Credenciais — Ponto Processual',
  description: 'Cadastre os logins usados pela plataforma para centralizar e sincronizar seus processos de cada tribunal.',
};

export default async function CredenciaisPage() {
  const [secrets, { tribunals, unavailable }] = await Promise.all([
    getScraperSecrets(),
    getTribunaisStatus(),
  ]);

  const sistemas = agruparPorSistema(tribunals);

  const totalGraus = sistemas.reduce((acc, s) => acc + s.totalGraus, 0);
  const cobertos = sistemas.reduce((acc, s) => acc + s.cobertos, 0);
  const ativas = secrets.filter(s => s.isActive).length;
  const comErro = secrets.filter(s => s.isActive && s.lastError).length;
  const nuncaSincronizadas = secrets.filter(s => s.isActive && !s.lastSuccessAt && !s.lastError).length;

  const pageInfoContent: PageInfoContent = [
    {
      title: 'Cobertura das credenciais',
      variant: 'compact',
      items: [
        { label: 'Credenciais ativas', value: String(ativas).padStart(2, '0') },
        { label: 'Tribunais cobertos', value: `${cobertos}/${totalGraus}` },
        { label: 'Com erro', value: String(comErro).padStart(2, '0'), tone: comErro > 0 ? 'alert' : undefined },
        { label: 'Nunca sincronizadas', value: String(nuncaSincronizadas).padStart(2, '0'), tone: nuncaSincronizadas > 0 ? 'signal' : undefined },
      ],
    },
  ];

  return (
    <AppLayout
      active="Credenciais"
      mobileTitle="Credenciais"
      mobileBreadcrumb="Início / Credenciais"
    >
      <PageHeader
        basePath="/credenciais"
        title="Credenciais"
        breadcrumb="Início / Configurações / Credenciais"
      />

      <CredenciaisPageContent
        initialSecrets={secrets}
        sistemas={sistemas}
        unavailable={unavailable}
        pageInfo={<PageInfo pageInfoContent={pageInfoContent} />}
      />
    </AppLayout>
  );
}
