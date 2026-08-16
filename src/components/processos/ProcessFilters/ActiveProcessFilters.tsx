'use client';

import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { DEFAULT_PROCESS_FILTERS, serializeProcessFilters, type ProcessFilterState } from '@/lib/process-filters';
import styles from '@/components/filters/FilterPanel.module.css';

const LABELS = {
  state: { signal: 'Com novidade', alert: 'Com erro', quiet: 'Sem novidade' },
  monitored: { true: 'Monitorados', false: 'Não monitorados' },
  status: { active: 'Ativo', archived: 'Arquivado' },
} as const;

interface Chip {
  id: string;
  label: string;
  remove: (filters: ProcessFilterState) => ProcessFilterState;
}

export function ActiveProcessFilters({ filters }: { filters: ProcessFilterState }) {
  const router = useRouter();
  const pathname = usePathname();
  const chips = buildChips(filters);

  function navigate(next: ProcessFilterState) {
    const params = serializeProcessFilters(next);
    // scroll:false — sem isso o Next volta a página pro topo a cada filtro removido.
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }

  if (!chips.length) return null;

  return (
    <div className={`px-page ${styles.activeBar}`} aria-label="Filtros aplicados">
      <span className={styles.activeLabel}>{chips.length} {chips.length === 1 ? 'critério' : 'critérios'}</span>
      <div className={styles.chips}>
        {chips.map(chip => (
          <button key={chip.id} type="button" className={styles.chip} onClick={() => navigate(chip.remove(filters))} aria-label={`Remover filtro ${chip.label}`}>
            <span>{chip.label}</span>
            <X aria-hidden="true" />
          </button>
        ))}
      </div>
      <button
        type="button"
        className={styles.clearAll}
        onClick={() => navigate({ ...DEFAULT_PROCESS_FILTERS, sort: filters.sort, order: filters.order })}
      >
        Limpar tudo
      </button>
    </div>
  );
}

function buildChips(filters: ProcessFilterState): Chip[] {
  const chips: Chip[] = [];
  if (filters.q) chips.push({ id: 'q', label: `Busca: ${filters.q}`, remove: current => ({ ...current, q: '' }) });
  filters.tribunal.forEach(value => chips.push({ id: `tribunal-${value}`, label: value, remove: current => ({ ...current, tribunal: current.tribunal.filter(item => item !== value) }) }));
  if (filters.grau) chips.push({ id: 'grau', label: `${filters.grau}º grau`, remove: current => ({ ...current, grau: '' }) });
  if (filters.state) chips.push({ id: 'state', label: LABELS.state[filters.state], remove: current => ({ ...current, state: '' }) });
  filters.status.forEach(value => chips.push({ id: `status-${value}`, label: LABELS.status[value as keyof typeof LABELS.status] ?? value, remove: current => ({ ...current, status: current.status.filter(item => item !== value) }) }));
  if (filters.monitored) chips.push({ id: 'monitored', label: LABELS.monitored[filters.monitored], remove: current => ({ ...current, monitored: '' }) });
  if (filters.assunto) chips.push({ id: 'assunto', label: `Assunto: ${filters.assunto}`, remove: current => ({ ...current, assunto: '' }) });
  if (filters.classe) chips.push({ id: 'classe', label: `Classe: ${filters.classe}`, remove: current => ({ ...current, classe: '' }) });
  if (filters.orgao) chips.push({ id: 'orgao', label: `Órgão: ${filters.orgao}`, remove: current => ({ ...current, orgao: '' }) });
  if (filters.valorMin || filters.valorMax) chips.push({ id: 'valor', label: rangeLabel('Valor', filters.valorMin, filters.valorMax), remove: current => ({ ...current, valorMin: '', valorMax: '' }) });
  if (filters.autuadoFrom || filters.autuadoTo) chips.push({ id: 'autuado', label: rangeLabel('Autuação', filters.autuadoFrom, filters.autuadoTo), remove: current => ({ ...current, autuadoFrom: '', autuadoTo: '' }) });
  if (filters.movFrom || filters.movTo) chips.push({ id: 'mov', label: rangeLabel('Movimentação', filters.movFrom, filters.movTo), remove: current => ({ ...current, movFrom: '', movTo: '' }) });
  return chips;
}

function rangeLabel(label: string, from: string, to: string) {
  if (from && to) return `${label}: ${from}–${to}`;
  return from ? `${label}: desde ${from}` : `${label}: até ${to}`;
}
