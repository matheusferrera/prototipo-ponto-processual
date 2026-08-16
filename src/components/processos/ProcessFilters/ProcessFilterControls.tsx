'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpDown, Columns3, Funnel, X } from 'lucide-react';
import { SearchControl } from '@/components/layout/PageHeader/SearchControl';
import { ResponsiveFilterPanel } from '@/components/filters/ResponsiveFilterPanel';
import { ProcessTableSettingsPanel } from '@/components/processos/ProcessTable/ProcessTableProvider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  DEFAULT_PROCESS_FILTERS,
  countActiveProcessFilters,
  defaultOrderFor,
  serializeProcessFilters,
  type ProcessFilterState,
  type ProcessSort,
} from '@/lib/process-filters';
import styles from '@/components/filters/FilterPanel.module.css';
import type { TribunalOption } from '@/lib/tribunals';

export const PROCESS_FILTER_PANEL_HOST_ID = 'process-filter-panel-host';
const PROCESS_FILTER_PANEL_ID = 'process-filter-panel';

const PROCESS_STATUS = [
  { value: 'active', label: 'Ativo' },
  { value: 'archived', label: 'Arquivado' },
] as const;

const SORT_OPTIONS: { value: `${ProcessSort}:${'asc' | 'desc'}`; label: string }[] = [
  { value: 'recent:desc', label: 'Movimentação mais recente' },
  { value: 'recent:asc', label: 'Movimentação mais antiga' },
  { value: 'cnj:asc', label: 'Número CNJ · crescente' },
  { value: 'cnj:desc', label: 'Número CNJ · decrescente' },
  { value: 'tribunal:asc', label: 'Tribunal · A–Z' },
  { value: 'tribunal:desc', label: 'Tribunal · Z–A' },
  { value: 'valor:desc', label: 'Maior valor da causa' },
  { value: 'valor:asc', label: 'Menor valor da causa' },
  { value: 'autuado:desc', label: 'Autuação mais recente' },
  { value: 'autuado:asc', label: 'Autuação mais antiga' },
];

interface ProcessFilterControlsProps {
  filters: ProcessFilterState;
  tribunals: readonly TribunalOption[];
  variant?: 'desktop' | 'mobile';
  /** Usado quando os controles ficam em fluxo com o conteúdo (não colados a um título). */
  inline?: boolean;
}

type OpenPanel = 'filters' | 'columns' | null;

export function ProcessFilterControls({
  filters,
  tribunals,
  variant = 'desktop',
  inline = false,
}: ProcessFilterControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [draft, setDraft] = useState(filters);
  const [isPending, startTransition] = useTransition();
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const columnsButtonRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const activeCount = countActiveProcessFilters(filters);

  const preservedForSearch = useMemo(() => {
    const params = serializeProcessFilters(filters);
    params.delete('q');
    return [...params.entries()];
  }, [filters]);

  function navigate(next: ProcessFilterState) {
    const params = serializeProcessFilters(next);
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    });
  }

  function togglePanel(panel: Exclude<OpenPanel, null>) {
    setOpenPanel(current => {
      const next = current === panel ? null : panel;
      if (next === 'filters') setDraft(filters);
      return next;
    });
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(draft);
  }

  function changeDraft(
    update: (current: ProcessFilterState) => ProcessFilterState,
    immediate = false,
  ) {
    const next = update(draft);
    setDraft(next);
    if (immediate) navigate(next);
  }

  function changeSort(value: string) {
    const [sortValue, orderValue] = value.split(':') as [ProcessSort, 'asc' | 'desc'];
    navigate({ ...filters, sort: sortValue, order: orderValue ?? defaultOrderFor(sortValue) });
  }

  const sortValue = `${filters.sort}:${filters.order}`;

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(filters), 0);
    return () => window.clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    const fields: (keyof ProcessFilterState)[] = [
      'assunto', 'classe', 'orgao', 'valorMin', 'valorMax',
      'autuadoFrom', 'autuadoTo', 'movFrom', 'movTo',
    ];
    const changed = fields.some(key => draft[key] !== filters[key]);
    if (!changed) return;
    const timer = window.setTimeout(() => navigate(draft), 400);
    return () => window.clearTimeout(timer);
    // navigate usa o pathname e o router atuais; os campos explícitos evitam uma segunda consulta após selects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draft.assunto,
    draft.classe,
    draft.orgao,
    draft.valorMin,
    draft.valorMax,
    draft.autuadoFrom,
    draft.autuadoTo,
    draft.movFrom,
    draft.movTo,
    filters,
  ]);

  return (
    <>
      <div
        className={`${styles.controls} ${variant === 'mobile' ? styles.controlsMobile : ''} ${inline ? styles.controlsInline : ''}`}
        aria-label="Controles de processos"
      >
      <SearchControl
        basePath="/processos"
        searchLabel="Pesquisar processos"
        searchPlaceholder="Número, classe, assunto, órgão ou movimentação"
        searchValue={filters.q}
        preservedParams={preservedForSearch}
      />

      <Button
        ref={filterButtonRef}
        type="button"
        variant="outline"
        size={variant === 'mobile' ? 'icon-lg' : 'icon'}
        className={styles.iconButton}
        data-active={activeCount > 0 || undefined}
        aria-label={activeCount ? `Abrir filtros, ${activeCount} ativos` : 'Abrir filtros'}
        aria-expanded={openPanel === 'filters'}
        aria-controls={PROCESS_FILTER_PANEL_ID}
        onClick={() => {
          returnFocusRef.current = filterButtonRef.current;
          togglePanel('filters');
        }}
      >
        <Funnel />
        {activeCount > 0 && <span className={styles.controlCount} aria-hidden="true">{activeCount}</span>}
      </Button>

      <label className={styles.sortControl} title="Ordenar processos">
        <ArrowUpDown aria-hidden="true" />
        <span className="sr-only">Ordenar processos</span>
        <NativeSelect value={sortValue} onChange={event => changeSort(event.target.value)}>
          {SORT_OPTIONS.map(option => (
            <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>
          ))}
        </NativeSelect>
      </label>

        <Button
          ref={columnsButtonRef}
          type="button"
          variant="outline"
          className={styles.panelButton}
          data-active={openPanel === 'columns' || undefined}
          aria-expanded={openPanel === 'columns'}
          aria-controls={PROCESS_FILTER_PANEL_ID}
          onClick={() => {
            returnFocusRef.current = columnsButtonRef.current;
            togglePanel('columns');
          }}
        >
          <Columns3 />
          <span>Colunas</span>
        </Button>
      </div>

      <ResponsiveFilterPanel
        open={openPanel !== null}
        onOpenChange={open => { if (!open) setOpenPanel(null); }}
        panelHostId={PROCESS_FILTER_PANEL_HOST_ID}
        panelId={PROCESS_FILTER_PANEL_ID}
        title={openPanel === 'columns' ? 'Configurar tabela' : 'Filtrar processos'}
        returnFocusRef={returnFocusRef}
      >
          {openPanel === 'filters' ? (
          <form className={`${styles.filterForm} ${styles.inlineFilterForm}`} onSubmit={applyFilters}>
            <div className={styles.sheetHeader}>
              <div>
                <h2 data-filter-panel-title tabIndex={-1}>Filtrar processos</h2>
                <p>As alterações são aplicadas automaticamente à tabela.</p>
              </div>
              <div className={styles.panelStatus} role="status" aria-live="polite">
                {isPending && <span>Atualizando tabela…</span>}
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => setOpenPanel(null)} aria-label="Fechar filtros">
                <X />
              </Button>
            </div>

            <div className={styles.sheetBody}>
              <FieldGroup className={styles.inlineFilterGrid}>
                <FieldSet className={styles.filterSection}>
                  <FieldLegend variant="label">Filtros frequentes</FieldLegend>

                  <FieldSet className={styles.nestedGroup}>
                    <FieldLegend variant="label">Tribunal</FieldLegend>
                    <FieldGroup data-slot="checkbox-group" className={styles.checkboxGrid}>
                      {tribunals.map(tribunal => (
                        <Field key={tribunal.code} orientation="horizontal" className={styles.checkField}>
                          <Checkbox
                            id={`${variant}-tribunal-${tribunal.code}`}
                            checked={draft.tribunal.includes(tribunal.code)}
                            onCheckedChange={checked => changeDraft(current => ({
                              ...current,
                              tribunal: checked
                                ? [...new Set([...current.tribunal, tribunal.code])]
                                : current.tribunal.filter(item => item !== tribunal.code),
                            }), true)}
                          />
                          <FieldLabel className={styles.tribunalLabel} htmlFor={`${variant}-tribunal-${tribunal.code}`}>
                            <span>{tribunal.code}</span>
                            <small>{tribunal.system}</small>
                          </FieldLabel>
                        </Field>
                      ))}
                    </FieldGroup>
                  </FieldSet>

                  <div className={styles.fieldGrid}>
                    <Field>
                      <FieldLabel htmlFor={`${variant}-state`}>Estado</FieldLabel>
                      <NativeSelect id={`${variant}-state`} value={draft.state} onChange={event => changeDraft(current => ({ ...current, state: event.target.value as ProcessFilterState['state'] }), true)}>
                        <NativeSelectOption value="">Todos</NativeSelectOption>
                        <NativeSelectOption value="signal">Com novidade</NativeSelectOption>
                        <NativeSelectOption value="alert">Com erro</NativeSelectOption>
                        <NativeSelectOption value="quiet">Sem novidade</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${variant}-grau`}>Grau</FieldLabel>
                      <NativeSelect id={`${variant}-grau`} value={draft.grau} onChange={event => changeDraft(current => ({ ...current, grau: event.target.value as ProcessFilterState['grau'] }), true)}>
                        <NativeSelectOption value="">Todos</NativeSelectOption>
                        <NativeSelectOption value="1">1º grau</NativeSelectOption>
                        <NativeSelectOption value="2">2º grau</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${variant}-monitored`}>Monitoramento</FieldLabel>
                      <NativeSelect id={`${variant}-monitored`} value={draft.monitored} onChange={event => changeDraft(current => ({ ...current, monitored: event.target.value as ProcessFilterState['monitored'] }), true)}>
                        <NativeSelectOption value="">Todos</NativeSelectOption>
                        <NativeSelectOption value="true">Monitorados</NativeSelectOption>
                        <NativeSelectOption value="false">Não monitorados</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                  </div>

                  <FieldSet className={styles.nestedGroup}>
                    <FieldLegend variant="label">Status do processo</FieldLegend>
                    <FieldGroup data-slot="checkbox-group" className={styles.checkboxGrid}>
                      {PROCESS_STATUS.map(status => (
                        <Field key={status.value} orientation="horizontal" className={styles.checkField}>
                          <Checkbox
                            id={`${variant}-status-${status.value}`}
                            checked={draft.status.includes(status.value)}
                            onCheckedChange={checked => changeDraft(current => ({
                              ...current,
                              status: checked
                                ? [...new Set([...current.status, status.value])]
                                : current.status.filter(item => item !== status.value),
                            }), true)}
                          />
                          <FieldLabel htmlFor={`${variant}-status-${status.value}`}>{status.label}</FieldLabel>
                        </Field>
                      ))}
                    </FieldGroup>
                  </FieldSet>
                </FieldSet>

                <FieldSet className={styles.filterSection}>
                  <FieldLegend variant="label">Dados processuais</FieldLegend>
                  <Field>
                    <FieldLabel htmlFor={`${variant}-assunto`}>Assunto</FieldLabel>
                    <Input id={`${variant}-assunto`} value={draft.assunto} onChange={event => setDraft(current => ({ ...current, assunto: event.target.value }))} placeholder="Contém…" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${variant}-classe`}>Classe judicial</FieldLabel>
                    <Input id={`${variant}-classe`} value={draft.classe} onChange={event => setDraft(current => ({ ...current, classe: event.target.value }))} placeholder="Contém…" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${variant}-orgao`}>Órgão julgador</FieldLabel>
                    <Input id={`${variant}-orgao`} value={draft.orgao} onChange={event => setDraft(current => ({ ...current, orgao: event.target.value }))} placeholder="Contém…" />
                  </Field>
                </FieldSet>

                <FieldSet className={styles.filterSection}>
                  <FieldLegend variant="label">Faixas</FieldLegend>
                  <RangeFields
                    id={`${variant}-valor`}
                    label="Valor da causa"
                    type="number"
                    from={draft.valorMin}
                    to={draft.valorMax}
                    fromLabel="Valor mínimo"
                    toLabel="Valor máximo"
                    onFrom={value => setDraft(current => ({ ...current, valorMin: value }))}
                    onTo={value => setDraft(current => ({ ...current, valorMax: value }))}
                  />
                  <RangeFields
                    id={`${variant}-autuado`}
                    label="Data de autuação"
                    type="date"
                    from={draft.autuadoFrom}
                    to={draft.autuadoTo}
                    onFrom={value => setDraft(current => ({ ...current, autuadoFrom: value }))}
                    onTo={value => setDraft(current => ({ ...current, autuadoTo: value }))}
                  />
                  <RangeFields
                    id={`${variant}-mov`}
                    label="Última movimentação"
                    type="date"
                    from={draft.movFrom}
                    to={draft.movTo}
                    onFrom={value => setDraft(current => ({ ...current, movFrom: value }))}
                    onTo={value => setDraft(current => ({ ...current, movTo: value }))}
                  />
                </FieldSet>
              </FieldGroup>
            </div>

            <div className={styles.sheetFooter}>
              <Button
                type="button"
                variant="outline"
                onClick={() => changeDraft(current => ({
                  ...DEFAULT_PROCESS_FILTERS,
                  q: current.q,
                  sort: current.sort,
                  order: current.order,
                }), true)}
              >
                Limpar filtros
              </Button>
              <span className={styles.autosaveHint}>Aplicação automática</span>
            </div>
          </form>
          ) : (
            <div className={styles.inlineSettingsWrap}>
              <div className={styles.sheetHeader}>
                <div>
                  <h2 data-filter-panel-title tabIndex={-1}>Configurar tabela</h2>
                  <p>As alterações aparecem imediatamente e são salvas automaticamente.</p>
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => setOpenPanel(null)} aria-label="Fechar configuração de colunas">
                  <X />
                </Button>
              </div>
              <ProcessTableSettingsPanel embedded />
            </div>
          )}
      </ResponsiveFilterPanel>
    </>
  );
}

function RangeFields({
  id,
  label,
  type,
  from,
  to,
  fromLabel = 'De',
  toLabel = 'Até',
  onFrom,
  onTo,
}: {
  id: string;
  label: string;
  type: 'date' | 'number';
  from: string;
  to: string;
  fromLabel?: string;
  toLabel?: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  return (
    <FieldSet className={styles.nestedGroup}>
      <FieldLegend variant="label">{label}</FieldLegend>
      <div className={styles.rangeGrid}>
        <Field>
          <FieldLabel htmlFor={`${id}-from`}>{fromLabel}</FieldLabel>
          <Input id={`${id}-from`} type={type} min={type === 'number' ? 0 : undefined} inputMode={type === 'number' ? 'decimal' : undefined} value={from} onChange={event => onFrom(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-to`}>{toLabel}</FieldLabel>
          <Input id={`${id}-to`} type={type} min={type === 'number' ? 0 : undefined} inputMode={type === 'number' ? 'decimal' : undefined} value={to} onChange={event => onTo(event.target.value)} />
        </Field>
      </div>
    </FieldSet>
  );
}
