'use client';

import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import {
  DEFAULT_PRAZO_FILTERS,
  serializePrazoFilters,
  type PrazoFilterState,
} from '@/lib/prazo-filters';
import styles from '@/components/filters/FilterPanel.module.css';

const LABELS = {
  urgencia: {
    critico: 'Crítico · até 3d',
    urgente: 'Urgente · até 7d',
    atencao: 'Atenção · até 14d',
    normal: 'Normal · +14d',
  },
  pauta: {
    atrasada: 'Pauta em atraso',
    hoje: 'Trabalhar hoje',
    semana: 'Pauta · próximos 7d',
  },
  situacao: { pendente: 'Expediente pendente', fechado: 'Expediente fechado' },
  origem: { scraper: 'Sincronização Integrada', djen: 'Diário Oficial' },
} as const;

interface Chip {
  id: string;
  label: string;
  remove: (filters: PrazoFilterState) => PrazoFilterState;
}

export function ActivePrazoFilters({ filters }: { filters: PrazoFilterState }) {
  const router = useRouter();
  const pathname = usePathname();
  const chips = buildChips(filters);

  function navigate(next: PrazoFilterState) {
    const params = serializePrazoFilters(next);
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
        onClick={() => navigate({
          ...DEFAULT_PRAZO_FILTERS,
          sort: filters.sort,
          order: filters.order,
          view: filters.view,
        })}
      >
        Limpar tudo
      </button>
    </div>
  );
}

function buildChips(filters: PrazoFilterState): Chip[] {
  const chips: Chip[] = [];
  if (filters.q) chips.push({ id: 'q', label: `Busca: ${filters.q}`, remove: c => ({ ...c, q: '' }) });
  filters.tribunal.forEach(value => chips.push({
    id: `tribunal-${value}`,
    label: value,
    remove: c => ({ ...c, tribunal: c.tribunal.filter(item => item !== value) }),
  }));
  if (filters.grau) chips.push({
    id: 'grau',
    label: filters.grau === 'djen' ? 'DJEN' : `${filters.grau}º grau`,
    remove: c => ({ ...c, grau: '' }),
  });
  if (filters.origem) chips.push({ id: 'origem', label: LABELS.origem[filters.origem], remove: c => ({ ...c, origem: '' }) });
  if (filters.urgencia) chips.push({ id: 'urgencia', label: LABELS.urgencia[filters.urgencia], remove: c => ({ ...c, urgencia: '' }) });
  if (filters.pauta) chips.push({ id: 'pauta', label: LABELS.pauta[filters.pauta], remove: c => ({ ...c, pauta: '' }) });
  if (filters.situacao) chips.push({ id: 'situacao', label: LABELS.situacao[filters.situacao], remove: c => ({ ...c, situacao: '' }) });
  if (filters.cliente) chips.push({ id: 'cliente', label: `Cliente: ${filters.cliente}`, remove: c => ({ ...c, cliente: '' }) });
  if (filters.natureza) chips.push({
    id: 'natureza',
    label: `Prazo para: ${filters.natureza === 'ciencia' ? 'ciência' : 'manifestação'}`,
    remove: c => ({ ...c, natureza: '' }),
  });
  if (filters.tipo) chips.push({ id: 'tipo', label: `Expediente: ${filters.tipo}`, remove: c => ({ ...c, tipo: '' }) });
  if (filters.assunto) chips.push({ id: 'assunto', label: `Assunto: ${filters.assunto}`, remove: c => ({ ...c, assunto: '' }) });
  if (filters.orgao) chips.push({ id: 'orgao', label: `Órgão: ${filters.orgao}`, remove: c => ({ ...c, orgao: '' }) });
  if (filters.fatalFrom || filters.fatalTo) chips.push({
    id: 'fatal',
    label: rangeLabel('Fatal', filters.fatalFrom, filters.fatalTo),
    remove: c => ({ ...c, fatalFrom: '', fatalTo: '' }),
  });
  if (filters.pautaFrom || filters.pautaTo) chips.push({
    id: 'pauta-range',
    label: rangeLabel('Pauta', filters.pautaFrom, filters.pautaTo),
    remove: c => ({ ...c, pautaFrom: '', pautaTo: '' }),
  });
  return chips;
}

function rangeLabel(label: string, from: string, to: string) {
  if (from && to) return `${label}: ${from}–${to}`;
  return from ? `${label}: desde ${from}` : `${label}: até ${to}`;
}
