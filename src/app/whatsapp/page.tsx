import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { WhatsappPageContent } from '@/components/whatsapp/PageContent/WhatsappPageContent';

export const metadata: Metadata = {
  title: 'WhatsApp — Ponto Processual',
  description: 'Cadastre o celular que recebe os avisos de prazo e o resumo diário dos seus processos.',
};

export default function WhatsappPage() {
  return (
    <AppLayout
      active="WhatsApp"
      mobileTitle="WhatsApp"
      mobileBreadcrumb="Início / WhatsApp"
    >
      <PageHeader
        basePath="/whatsapp"
        title="WhatsApp"
        breadcrumb="Início / Configurações / WhatsApp"
      />
      <WhatsappPageContent />
    </AppLayout>
  );
}
