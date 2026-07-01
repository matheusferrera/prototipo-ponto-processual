import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { getPrazos } from '@/lib/api.server';
import { PrazosView } from '@/components/prazos/PrazosView/PrazosView';

export const metadata: Metadata = {
  title: 'Prazos — Ponto Processual',
  description: 'Próximos prazos processuais.',
};

export default async function PrazosPage() {
  const prazos = await getPrazos();
  return (
    <AppLayout active="Prazos">
      <PrazosView prazos={prazos} />
    </AppLayout>
  );
}
