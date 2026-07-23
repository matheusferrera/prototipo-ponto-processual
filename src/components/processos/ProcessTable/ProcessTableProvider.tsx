'use client';

import {
  createContext,
  type DragEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  Columns3,
  GripVertical,
  Minus,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  createDefaultProcessTablePreferences,
  loadProcessTablePreferences,
  PROCESS_COLUMN_IDS,
  PROCESS_COLUMN_LABELS,
  type ProcessColumnId,
  type ProcessTableDensity,
  type ProcessTablePreferences,
  saveProcessTablePreferences,
} from '@/lib/process-table-preferences';
import styles from './ProcessTable.module.css';

interface ProcessTableContextValue {
  preferences: ProcessTablePreferences;
  setPreferences: (next: ProcessTablePreferences | ((current: ProcessTablePreferences) => ProcessTablePreferences)) => void;
  openSettings: () => void;
}

const ProcessTableContext = createContext<ProcessTableContextValue | null>(null);

export function ProcessTableProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(createDefaultProcessTablePreferences);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreferences(loadProcessTablePreferences());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) saveProcessTablePreferences(preferences);
  }, [hydrated, preferences]);

  const value = useMemo<ProcessTableContextValue>(() => ({
    preferences,
    setPreferences,
    openSettings: () => setOpen(true),
  }), [preferences]);

  return (
    <ProcessTableContext.Provider value={value}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={styles.settingsSheet}
          aria-label="Configurar tabela de processos"
        >
          <SheetHeader className={styles.settingsHeader}>
            <SheetTitle className={styles.settingsTitle}>Configurar tabela</SheetTitle>
            <SheetDescription className={styles.settingsDescription}>
              Escolha o que aparece e ajuste a leitura da sua carteira.
            </SheetDescription>
          </SheetHeader>
          <ProcessTableSettingsPanel />
        </SheetContent>
      </Sheet>
    </ProcessTableContext.Provider>
  );
}

export function useProcessTablePreferences(): ProcessTableContextValue {
  const value = useContext(ProcessTableContext);
  if (!value) throw new Error('ProcessTable deve estar dentro de ProcessTableProvider.');
  return value;
}

export function ProcessTableSettingsTrigger({ compact = false }: { compact?: boolean }) {
  const { openSettings } = useProcessTablePreferences();
  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? 'icon' : 'default'}
      className={styles.settingsTrigger}
      onClick={openSettings}
      aria-label={compact ? 'Configurar colunas da tabela' : undefined}
    >
      <Columns3 aria-hidden="true" />
      {!compact && <span>Colunas</span>}
    </Button>
  );
}

export function ProcessTableSettingsPanel({ embedded = false }: { embedded?: boolean }) {
  const { preferences, setPreferences } = useProcessTablePreferences();
  const [dragged, setDragged] = useState<ProcessColumnId | null>(null);

  const update = useCallback(<K extends keyof ProcessTablePreferences>(
    key: K,
    value: ProcessTablePreferences[K],
  ) => {
    setPreferences(current => ({ ...current, [key]: value }));
  }, [setPreferences]);

  const move = (id: ProcessColumnId, direction: -1 | 1) => {
    const order = [...preferences.columnOrder];
    const index = order.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    applyOrder(order);
  };

  const applyOrder = (order: string[]) => {
    const pinned = new Set(preferences.columnPinning.left ?? []);
    setPreferences(current => ({
      ...current,
      columnOrder: order,
      columnPinning: { left: order.filter(id => pinned.has(id)), right: [] },
    }));
  };

  const moveTo = (source: ProcessColumnId, target: ProcessColumnId) => {
    if (source === target) return;
    const order = preferences.columnOrder.filter(id => id !== source);
    const targetIndex = order.indexOf(target);
    order.splice(Math.max(0, targetIndex), 0, source);
    applyOrder(order);
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>, target: ProcessColumnId) => {
    event.preventDefault();
    if (dragged) moveTo(dragged, target);
    setDragged(null);
  };

  const togglePin = (id: ProcessColumnId) => {
    const left = preferences.columnPinning.left ?? [];
    const nextPinned = new Set(left.includes(id) ? left.filter(item => item !== id) : [...left, id]);
    update('columnPinning', {
      left: preferences.columnOrder.filter(columnId => nextPinned.has(columnId)),
      right: [],
    });
  };

  const visibleCount = PROCESS_COLUMN_IDS.filter(id => preferences.columnVisibility[id] !== false).length;

  return (
    <div className={`${styles.settingsBody} ${embedded ? styles.settingsInline : ''}`}>
      <section className={styles.settingsSection} aria-labelledby="columns-title">
        <div className={styles.sectionHeading}>
          <div>
            <h3 id="columns-title">Colunas</h3>
            <p>{visibleCount} de {PROCESS_COLUMN_IDS.length} visíveis</p>
          </div>
          <span className={styles.autosave}>Salvo automaticamente</span>
        </div>

        <ul className={styles.columnList} aria-label="Ordem e visibilidade das colunas">
          {preferences.columnOrder.map((rawId, index) => {
            const id = rawId as ProcessColumnId;
            const pinned = preferences.columnPinning.left?.includes(id) ?? false;
            return (
              <li
                key={id}
                className={`${styles.columnItem} ${dragged === id ? styles.columnItemDragging : ''}`}
                draggable
                onDragStart={() => setDragged(id)}
                onDragEnd={() => setDragged(null)}
                onDragOver={event => event.preventDefault()}
                onDrop={event => handleDrop(event, id)}
              >
                <GripVertical className={styles.grip} aria-hidden="true" />
                <label className={styles.visibilityLabel}>
                  <Checkbox
                    checked={preferences.columnVisibility[id] !== false}
                    onCheckedChange={checked => update('columnVisibility', {
                      ...preferences.columnVisibility,
                      [id]: checked,
                    })}
                  />
                  <span>{PROCESS_COLUMN_LABELS[id]}</span>
                </label>
                <div className={styles.columnActions}>
                  <button
                    type="button"
                    onClick={() => togglePin(id)}
                    aria-label={`${pinned ? 'Desafixar' : 'Fixar'} coluna ${PROCESS_COLUMN_LABELS[id]}`}
                    aria-pressed={pinned}
                  >
                    {pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => move(id, -1)}
                    disabled={index === 0}
                    aria-label={`Mover coluna ${PROCESS_COLUMN_LABELS[id]} para cima`}
                  >
                    <ArrowUp aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(id, 1)}
                    disabled={index === preferences.columnOrder.length - 1}
                    aria-label={`Mover coluna ${PROCESS_COLUMN_LABELS[id]} para baixo`}
                  >
                    <ArrowDown aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className={styles.dragHint}>Arraste para reordenar ou use os botões subir e descer.</p>
      </section>

      <section className={styles.settingsSection} aria-labelledby="density-title">
        <div className={styles.sectionHeading}>
          <div>
            <h3 id="density-title">Densidade</h3>
            <p>Altera o espaço vertical, sem mudar a fonte.</p>
          </div>
        </div>
        <div className={styles.segmented} role="group" aria-label="Densidade das linhas">
          {([
            ['compact', 'Compacta'],
            ['comfortable', 'Confortável'],
            ['spacious', 'Ampla'],
          ] as [ProcessTableDensity, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={preferences.density === value ? styles.segmentActive : ''}
              aria-pressed={preferences.density === value}
              onClick={() => update('density', value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.settingsSection} aria-labelledby="font-title">
        <div className={styles.sectionHeading}>
          <div>
            <h3 id="font-title">Tamanho da fonte</h3>
            <p>De 12 a 18 px, independente da densidade.</p>
          </div>
        </div>
        <div className={styles.fontControl}>
          <button
            type="button"
            onClick={() => update('fontSize', Math.max(12, preferences.fontSize - 1))}
            disabled={preferences.fontSize <= 12}
            aria-label="Diminuir tamanho da fonte"
          >
            <Minus aria-hidden="true" />
          </button>
          <output aria-live="polite">{preferences.fontSize} px</output>
          <button
            type="button"
            onClick={() => update('fontSize', Math.min(18, preferences.fontSize + 1))}
            disabled={preferences.fontSize >= 18}
            aria-label="Aumentar tamanho da fonte"
          >
            <Plus aria-hidden="true" />
          </button>
        </div>
      </section>

      <div className={styles.settingsFooter}>
        <Button
          type="button"
          variant="outline"
          className={styles.resetButton}
          onClick={() => setPreferences(createDefaultProcessTablePreferences())}
        >
          <RotateCcw aria-hidden="true" />
          Restaurar padrão
        </Button>
      </div>
    </div>
  );
}
