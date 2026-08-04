'use client';

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpDown, Funnel, X } from 'lucide-react';
import { SearchControl } from '@/components/layout/PageHeader/SearchControl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  DEFAULT_PRAZO_FILTERS,
  PRAZO_TRIBUNAIS,
  countActivePrazoFilters,
  defaultOrderFor,
  serializePrazoFilters,
  type PrazoFilterState,
  type PrazoSort,
  type PrazoView,
} from '@/lib/prazo-filters';
import headerStyles from '@/components/layout/PageHeader/PageHeader.module.css';
import styles from '@/components/filters/FilterPanel.module.css';

/** Host do painel inline — renderizado pela página, dentro da área de conteúdo. */
export const PRAZO_PANEL_HOST_ID = 'prazo-inline-panel-host';

const VIEWS: { value: PrazoView; label: string }[] = [
  { value: 'lista', label: 'Pauta' },
  { value: 'kanban', label: 'Kanban' },
  { value: 'calendario', label: 'Calendário' },
];

const SORT_OPTIONS: { value: `${PrazoSort}:${'asc' | 'desc'}`; label: string }[] = [
  { value: 'fatal:asc', label: 'Prazo fatal · mais próximo' },
  { value: 'fatal:desc', label: 'Prazo fatal · mais distante' },
  { value: 'pauta:asc', label: 'Data da pauta · mais próxima' },
  { value: 'pauta:desc', label: 'Data da pauta · mais distante' },
  { value: 'cliente:asc', label: 'Cliente · A–Z' },
  { value: 'cliente:desc', label: 'Cliente · Z–A' },
  { value: 'tribunal:asc', label: 'Tribunal · A–Z' },
  { value: 'tribunal:desc', label: 'Tribunal · Z–A' },
  { value: 'expediente:asc', label: 'Expediente · A–Z' },
];

export function PrazoFilterControls({
  filters,
  variant = 'desktop',
}: {
  filters: PrazoFilterState;
  variant?: 'desktop' | 'mobile';
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [panelHost, setPanelHost] = useState<HTMLElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeCount = countActivePrazoFilters(filters);

  const preservedForSearch = useMemo(() => {
    const params = serializePrazoFilters(filters);
    params.delete('q');
    return [...params.entries()] as [string, string][];
  }, [filters]);

  function navigate(next: PrazoFilterState) {
    const params = serializePrazoFilters(next);
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    });
  }

  function changeDraft(update: (current: PrazoFilterState) => PrazoFilterState, immediate = false) {
    const next = update(draft);
    setDraft(next);
    if (immediate) navigate(next);
  }

  function changeSort(value: string) {
    const [sortValue, orderValue] = value.split(':') as [PrazoSort, 'asc' | 'desc'];
    navigate({ ...filters, sort: sortValue, order: orderValue ?? defaultOrderFor(sortValue) });
  }

  // Sincroniza o rascunho quando a URL muda (voltar/avançar, chip removido…)
  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(filters), 0);
    return () => window.clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPanelHost(document.getElementById(PRAZO_PANEL_HOST_ID));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Campos de texto/data aplicam sozinhos, com folga para o usuário terminar de digitar
  useEffect(() => {
    const campos: (keyof PrazoFilterState)[] = [
      'tipo', 'assunto', 'orgao', 'cliente', 'fatalFrom', 'fatalTo', 'pautaFrom', 'pautaTo',
    ];
    if (!campos.some(key => draft[key] !== filters[key])) return;
    const timer = window.setTimeout(() => navigate(draft), 400);
    return () => window.clearTimeout(timer);
    // navigate depende do router/pathname atuais; listar os campos evita uma segunda consulta após selects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draft.tipo, draft.assunto, draft.orgao, draft.cliente,
    draft.fatalFrom, draft.fatalTo, draft.pautaFrom, draft.pautaTo,
    filters,
  ]);

  const sortValue = `${filters.sort}:${filters.order}`;
  const tabs = (
    <div className={headerStyles.tabs} role="tablist" aria-label="Visualização">
      {VIEWS.map(view => (
        <Link
          key={view.value}
          href={hrefFor(pathname, { ...filters, view: view.value })}
          role="tab"
          aria-selected={filters.view === view.value}
          className={`${headerStyles.tab}${filters.view === view.value ? ` ${headerStyles.tabActive}` : ''}`}
        >
          {view.label}
        </Link>
      ))}
    </div>
  );

  const actions = (
    <div className={`${styles.controls} ${variant === 'mobile' ? styles.controlsMobile : ''}`} aria-label="Controles de prazos">
      <SearchControl
        basePath="/prazos"
        searchLabel="Pesquisar prazos"
        searchPlaceholder="Cliente, autos, expediente ou órgão"
        searchValue={filters.q}
        preservedParams={preservedForSearch}
      />

      <Button
        type="button"
        variant="outline"
        size={variant === 'mobile' ? 'icon-lg' : 'icon'}
        className={styles.iconButton}
        data-active={activeCount > 0 || undefined}
        aria-label={activeCount ? `Abrir filtros, ${activeCount} ativos` : 'Abrir filtros'}
        aria-expanded={open}
        aria-controls="prazo-inline-panel"
        onClick={() => setOpen(current => {
          if (!current) setDraft(filters);
          return !current;
        })}
      >
        <Funnel />
        {activeCount > 0 && <span className={styles.controlCount} aria-hidden="true">{activeCount}</span>}
      </Button>

      <label className={styles.sortControl} title="Ordenar prazos">
        <ArrowUpDown aria-hidden="true" />
        <span className="sr-only">Ordenar prazos</span>
        <NativeSelect value={sortValue} onChange={event => changeSort(event.target.value)}>
          {SORT_OPTIONS.map(option => (
            <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
    </div>
  );

  return (
    <>
      {variant === 'mobile' ? (
        <>
          {actions}
          <div className={headerStyles.mobileTabsRow}>{tabs}</div>
        </>
      ) : (
        <>
          {tabs}
          {actions}
        </>
      )}

      {open && panelHost && createPortal(
        <div id="prazo-inline-panel" className={styles.inlinePanel}>
          <form
            className={`${styles.filterForm} ${styles.inlineFilterForm}`}
            onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); navigate(draft); }}
          >
            <div className={styles.sheetHeader}>
              <div>
                <h2>Filtrar prazos</h2>
                <p>As alterações são aplicadas automaticamente à pauta.</p>
              </div>
              <div className={styles.panelStatus} role="status" aria-live="polite">
                {isPending && <span>Atualizando pauta…</span>}
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => setOpen(false)} aria-label="Fechar filtros">
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
                      {PRAZO_TRIBUNAIS.map(tribunal => (
                        <Field key={tribunal} orientation="horizontal" className={styles.checkField}>
                          <Checkbox
                            id={`${variant}-prazo-tribunal-${tribunal}`}
                            checked={draft.tribunal.includes(tribunal)}
                            onCheckedChange={checked => changeDraft(current => ({
                              ...current,
                              tribunal: checked
                                ? [...new Set([...current.tribunal, tribunal])]
                                : current.tribunal.filter(item => item !== tribunal),
                            }), true)}
                          />
                          <FieldLabel htmlFor={`${variant}-prazo-tribunal-${tribunal}`}>{tribunal}</FieldLabel>
                        </Field>
                      ))}
                    </FieldGroup>
                  </FieldSet>

                  <div className={styles.fieldGrid}>
                    <Field className={styles.fieldSpan}>
                      <FieldLabel htmlFor={`${variant}-prazo-titular`}>Titular do expediente</FieldLabel>
                      <NativeSelect
                        id={`${variant}-prazo-titular`}
                        value={draft.titular}
                        onChange={event => changeDraft(current => ({ ...current, titular: event.target.value as PrazoFilterState['titular'] }), true)}
                      >
                        <NativeSelectOption value="">Ambos os lados</NativeSelectOption>
                        <NativeSelectOption value="dr">Somente do Dr.</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${variant}-prazo-urgencia`}>Urgência</FieldLabel>
                      <NativeSelect
                        id={`${variant}-prazo-urgencia`}
                        value={draft.urgencia}
                        onChange={event => changeDraft(current => ({ ...current, urgencia: event.target.value as PrazoFilterState['urgencia'] }), true)}
                      >
                        <NativeSelectOption value="">Todas</NativeSelectOption>
                        <NativeSelectOption value="critico">Crítico · até 3 dias</NativeSelectOption>
                        <NativeSelectOption value="urgente">Urgente · até 7 dias</NativeSelectOption>
                        <NativeSelectOption value="atencao">Atenção · até 14 dias</NativeSelectOption>
                        <NativeSelectOption value="normal">Normal · mais de 14 dias</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${variant}-prazo-pauta`}>Pauta</FieldLabel>
                      <NativeSelect
                        id={`${variant}-prazo-pauta`}
                        value={draft.pauta}
                        onChange={event => changeDraft(current => ({ ...current, pauta: event.target.value as PrazoFilterState['pauta'] }), true)}
                      >
                        <NativeSelectOption value="">Toda a pauta</NativeSelectOption>
                        <NativeSelectOption value="atrasada">Em atraso</NativeSelectOption>
                        <NativeSelectOption value="hoje">Trabalhar hoje</NativeSelectOption>
                        <NativeSelectOption value="semana">Próximos 7 dias</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${variant}-prazo-grau`}>Grau</FieldLabel>
                      <NativeSelect
                        id={`${variant}-prazo-grau`}
                        value={draft.grau}
                        onChange={event => changeDraft(current => ({ ...current, grau: event.target.value as PrazoFilterState['grau'] }), true)}
                      >
                        <NativeSelectOption value="">Todos</NativeSelectOption>
                        <NativeSelectOption value="1">1º grau</NativeSelectOption>
                        <NativeSelectOption value="2">2º grau</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${variant}-prazo-situacao`}>Expediente</FieldLabel>
                      <NativeSelect
                        id={`${variant}-prazo-situacao`}
                        value={draft.situacao}
                        onChange={event => changeDraft(current => ({ ...current, situacao: event.target.value as PrazoFilterState['situacao'] }), true)}
                      >
                        <NativeSelectOption value="">Todos</NativeSelectOption>
                        <NativeSelectOption value="pendente">Pendente</NativeSelectOption>
                        <NativeSelectOption value="fechado">Fechado</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${variant}-prazo-natureza`}>Prazo para</FieldLabel>
                      <NativeSelect
                        id={`${variant}-prazo-natureza`}
                        value={draft.natureza}
                        onChange={event => changeDraft(current => ({ ...current, natureza: event.target.value as PrazoFilterState['natureza'] }), true)}
                      >
                        <NativeSelectOption value="">Todos</NativeSelectOption>
                        <NativeSelectOption value="ciencia">Ciência</NativeSelectOption>
                        <NativeSelectOption value="manifestacao">Manifestação</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                  </div>
                </FieldSet>

                <FieldSet className={styles.filterSection}>
                  <FieldLegend variant="label">Dados do prazo</FieldLegend>
                  <Field>
                    <FieldLabel htmlFor={`${variant}-prazo-cliente`}>Cliente / parte</FieldLabel>
                    <Input id={`${variant}-prazo-cliente`} value={draft.cliente} onChange={event => setDraft(current => ({ ...current, cliente: event.target.value }))} placeholder="Contém…" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${variant}-prazo-tipo`}>Expediente</FieldLabel>
                    <Input id={`${variant}-prazo-tipo`} value={draft.tipo} onChange={event => setDraft(current => ({ ...current, tipo: event.target.value }))} placeholder="Contém…" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${variant}-prazo-assunto`}>Assunto</FieldLabel>
                    <Input id={`${variant}-prazo-assunto`} value={draft.assunto} onChange={event => setDraft(current => ({ ...current, assunto: event.target.value }))} placeholder="Contém…" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${variant}-prazo-orgao`}>Órgão julgador</FieldLabel>
                    <Input id={`${variant}-prazo-orgao`} value={draft.orgao} onChange={event => setDraft(current => ({ ...current, orgao: event.target.value }))} placeholder="Contém…" />
                  </Field>
                </FieldSet>

                <FieldSet className={styles.filterSection}>
                  <FieldLegend variant="label">Faixas</FieldLegend>
                  <RangeFields
                    id={`${variant}-prazo-fatal`}
                    label="Prazo fatal"
                    from={draft.fatalFrom}
                    to={draft.fatalTo}
                    onFrom={value => setDraft(current => ({ ...current, fatalFrom: value }))}
                    onTo={value => setDraft(current => ({ ...current, fatalTo: value }))}
                  />
                  <RangeFields
                    id={`${variant}-prazo-pauta-range`}
                    label="Data da pauta"
                    from={draft.pautaFrom}
                    to={draft.pautaTo}
                    onFrom={value => setDraft(current => ({ ...current, pautaFrom: value }))}
                    onTo={value => setDraft(current => ({ ...current, pautaTo: value }))}
                  />
                </FieldSet>
              </FieldGroup>
            </div>

            <div className={styles.sheetFooter}>
              <Button
                type="button"
                variant="outline"
                onClick={() => changeDraft(current => ({
                  ...DEFAULT_PRAZO_FILTERS,
                  q: current.q,
                  sort: current.sort,
                  order: current.order,
                  view: current.view,
                }), true)}
              >
                Limpar filtros
              </Button>
              <span className={styles.autosaveHint}>Aplicação automática</span>
            </div>
          </form>
        </div>,
        panelHost,
      )}
    </>
  );
}

function hrefFor(pathname: string, filters: PrazoFilterState) {
  const params = serializePrazoFilters(filters);
  return params.size ? `${pathname}?${params.toString()}` : pathname;
}

function RangeFields({
  id,
  label,
  from,
  to,
  onFrom,
  onTo,
}: {
  id: string;
  label: string;
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  return (
    <FieldSet className={styles.nestedGroup}>
      <FieldLegend variant="label">{label}</FieldLegend>
      <div className={styles.rangeGrid}>
        <Field>
          <FieldLabel htmlFor={`${id}-from`}>De</FieldLabel>
          <Input id={`${id}-from`} type="date" value={from} onChange={event => onFrom(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-to`}>Até</FieldLabel>
          <Input id={`${id}-to`} type="date" value={to} onChange={event => onTo(event.target.value)} />
        </Field>
      </div>
    </FieldSet>
  );
}
