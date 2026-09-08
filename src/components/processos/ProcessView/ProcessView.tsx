'use client';

import { List, Settings2, Table2 } from 'lucide-react';
import type { Processo } from '@/types';
import { Button } from '@/components/ui/button';
import { ProcessList } from '../ProcessList/ProcessList';
import { ProcessTable } from '../ProcessTable/ProcessTable';
import { useProcessTablePreferences } from '../ProcessTable/ProcessTableProvider';
import type { ProcessViewMode } from '@/lib/process-table-preferences';
import styles from './ProcessView.module.css';

interface ProcessViewProps {
  processos: Processo[];
  listParams?: Record<string, string | undefined>;
}

/** Lista por padrão; a tabela de colunas configuráveis fica como modo alternativo. */
export function ProcessView({ processos, listParams }: ProcessViewProps) {
  const { preferences } = useProcessTablePreferences();
  if (preferences.viewMode === 'table') {
    return <ProcessTable processos={processos} listParams={listParams} />;
  }
  return <ProcessList processos={processos} />;
}

const MODES: { value: ProcessViewMode; label: string; Icon: typeof List }[] = [
  { value: 'list', label: 'Lista', Icon: List },
  { value: 'table', label: 'Tabela', Icon: Table2 },
];

/** Alternar lista/tabela e abrir a configuração — mora na barra de resumo. */
export function ProcessViewToolbar() {
  const { preferences, setPreferences, openSettings } = useProcessTablePreferences();

  return (
    <div className={styles.toolbar}>
      <div className={styles.segmented} role="group" aria-label="Modo de exibição">
        {MODES.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            className={styles.segment}
            aria-pressed={preferences.viewMode === value}
            onClick={() => setPreferences(current => ({ ...current, viewMode: value }))}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={styles.gear}
        onClick={openSettings}
        aria-label="Configurar exibição dos processos"
        title="Configurar exibição"
      >
        <Settings2 aria-hidden="true" />
      </Button>
    </div>
  );
}
