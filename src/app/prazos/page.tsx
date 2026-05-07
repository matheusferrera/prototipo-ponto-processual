import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { prazos } from '@/lib/mock-data';
import { PrazosView } from '@/components/prazos/PrazosView';

export const metadata: Metadata = {
  title: 'Prazos — Ponto Processual',
  description: 'Próximos prazos processuais.',
};

export default function PrazosPage() {
  return (
    <AppLayout active="Prazos">
      <PrazosView prazos={prazos} />
    </AppLayout>
  );
}
