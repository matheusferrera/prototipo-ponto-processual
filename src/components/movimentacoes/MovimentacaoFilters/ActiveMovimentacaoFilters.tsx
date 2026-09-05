'use client';

import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import {
  DEFAULT_MOVIMENTACAO_FILTERS,
  serializeMovimentacaoFilters,
  type MovimentacaoFilterState,
} from '@/lib/movimentacao-filters';
import { categoriaLabel } from '@/lib/categoria-movimentacao';
import styles from '@/components/filters/FilterPanel.module.css';

interface Chip {
  id: string;
  label: string;
  remove: (filters: MovimentacaoFilterState) => MovimentacaoFilterState;
}

export function ActiveMovimentacaoFilters({ filters }: { filters: MovimentacaoFilterState }) {
  const router = useRouter();
  const pathname = usePathname();
  const chips = buildChips(filters);

  function navigate(next: MovimentacaoFilterState) {
    const params = serializeMovimentacaoFilters(next);
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  if (!chips.length) return null;

  return (
    <div className={`px-page ${styles.activeBar}`} aria-label="Filtros aplicados">
      <span className={styles.activeLabel}>{chips.length} {chips.length === 1 ? 'critério' : 'critérios'}</span>
      <div className={styles.chips}>
        {chips.map(chip => (
          <button
            key={chip.id}
            type="button"
            className={styles.chip}
            onClick={() => navigate(chip.remove(filters))}
            aria-label={`Remover filtro ${chip.label}`}
          >
            <span>{chip.label}</span>
            <X aria-hidden="true" />
          </button>
        ))}
      </div>
      <button
        type="button"
        className={styles.clearAll}
        onClick={() => navigate({ ...DEFAULT_MOVIMENTACAO_FILTERS, sort: filters.sort })}
      >
        Limpar tudo
      </button>
    </div>
  );
}

function buildChips(filters: MovimentacaoFilterState): Chip[] {
  const chips: Chip[] = [];
  if (filters.q) chips.push({ id: 'q', label: `Busca: ${filters.q}`, remove: c => ({ ...c, q: '' }) });
  filters.tribunal.forEach(value => chips.push({
    id: `tribunal-${value}`,
    label: value,
    remove: c => ({ ...c, tribunal: c.tribunal.filter(item => item !== value) }),
  }));
  filters.tipo.forEach(value => chips.push({
    id: `tipo-${value}`,
    label: value,
    remove: c => ({ ...c, tipo: c.tipo.filter(item => item !== value) }),
  }));
  filters.categoria.forEach(value => chips.push({
    id: `categoria-${value}`,
    label: categoriaLabel(value),
    remove: c => ({ ...c, categoria: c.categoria.filter(item => item !== value) }),
  }));
  return chips;
}
