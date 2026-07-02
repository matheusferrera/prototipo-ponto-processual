import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { ProcessoListSkeleton } from '@/components/processos/ProcessoRow/ProcessoRowSkeleton';

export default function Loading() {
  return (
    <AppLayout active="Processos" mobileTitle="Processos" mobileBreadcrumb="Início / Processos">
      <PageHeader basePath="/processos" title="Processos" breadcrumb="Início / Processos" loading />
      <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
        <ProcessoListSkeleton />
      </div>
    </AppLayout>
  );
}
