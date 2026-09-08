import { CalendarDays, Columns3, List } from 'lucide-react';
import { SummaryBar, SummaryViewTabs } from '@/components/filters/SummaryBar';
import { buildQuery } from '@/lib/utils';
import type { PrazoView } from '@/lib/prazo-filters';

const VIEWS: { value: PrazoView; label: string; Icon: typeof List }[] = [
  { value: 'lista', label: 'Pauta', Icon: List },
  { value: 'kanban', label: 'Kanban', Icon: Columns3 },
  { value: 'calendario', label: 'Calendário', Icon: CalendarDays },
];

/** A faixa abaixo do header com as três visualizações da pauta. */
export function PrazoSummaryBar({ listParams }: { listParams: Record<string, string | undefined> }) {
  const ativa = (listParams.view ?? 'lista') as PrazoView;
  return (
    <SummaryBar align="start">
      <SummaryViewTabs
        ariaLabel="Visualização"
        tabs={VIEWS.map(({ value, label, Icon }) => ({
          key: value,
          href: `/prazos${buildQuery(listParams, { view: value === 'lista' ? undefined : value })}`,
          label,
          active: ativa === value,
          icon: <Icon aria-hidden="true" />,
        }))}
      />
    </SummaryBar>
  );
}
