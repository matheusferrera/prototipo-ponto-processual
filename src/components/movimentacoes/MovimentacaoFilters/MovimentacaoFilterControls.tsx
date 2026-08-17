'use client';

import { useMemo, useRef, useState, useTransition, type FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpDown, Funnel, X } from 'lucide-react';
import { SearchControl } from '@/components/layout/PageHeader/SearchControl';
import { ResponsiveFilterPanel } from '@/components/filters/ResponsiveFilterPanel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  DEFAULT_MOVIMENTACAO_FILTERS,
  TIPOS_MOVIMENTACAO,
  countActiveMovimentacaoFilters,
  serializeMovimentacaoFilters,
  type MovimentacaoFilterState,
  type MovimentacaoSort,
} from '@/lib/movimentacao-filters';
import type { TribunalOption } from '@/lib/tribunals';
import styles from '@/components/filters/FilterPanel.module.css';

export const MOVIMENTACAO_PANEL_HOST_ID = 'movimentacao-filter-panel-host';
const MOVIMENTACAO_PANEL_ID = 'movimentacao-filter-panel';

const SORT_OPTIONS: { value: MovimentacaoSort; label: string }[] = [
  { value: '', label: 'Mais recentes' },
  { value: 'antigas', label: 'Mais antigas' },
  { value: 'tribunal', label: 'Tribunal · A–Z' },
];

interface MovimentacaoFilterControlsProps {
  filters: MovimentacaoFilterState;
  tribunals: readonly TribunalOption[];
  variant?: 'desktop' | 'mobile';
}

export function MovimentacaoFilterControls({
  filters,
  tribunals,
  variant = 'desktop',
}: MovimentacaoFilterControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [isPending, startTransition] = useTransition();
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const activeCount = countActiveMovimentacaoFilters(filters);

  const preservedForSearch = useMemo(() => {
    const params = serializeMovimentacaoFilters(filters);
    params.delete('q');
    return [...params.entries()] as [string, string][];
  }, [filters]);

  function navigate(next: MovimentacaoFilterState) {
    const params = serializeMovimentacaoFilters(next);
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    });
  }

  function changeDraft(update: (current: MovimentacaoFilterState) => MovimentacaoFilterState, immediate = false) {
    const next = update(draft);
    setDraft(next);
    if (immediate) navigate(next);
  }

  return (
    <>
      <div className={`${styles.controls} ${variant === 'mobile' ? styles.controlsMobile : ''}`} aria-label="Controles de movimentações">
        <SearchControl
          basePath="/movimentacoes"
          searchLabel="Pesquisar movimentações"
          searchPlaceholder="Número, órgão, assunto ou descrição"
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
          aria-expanded={open}
          aria-controls={MOVIMENTACAO_PANEL_ID}
          onClick={() => {
            returnFocusRef.current = filterButtonRef.current;
            setOpen(current => {
              if (!current) setDraft(filters);
              return !current;
            });
          }}
        >
          <Funnel />
          {activeCount > 0 && <span className={styles.controlCount} aria-hidden="true">{activeCount}</span>}
        </Button>

        <label className={styles.sortControl} title="Ordenar movimentações">
          <ArrowUpDown aria-hidden="true" />
          <span className="sr-only">Ordenar movimentações</span>
          <NativeSelect
            value={filters.sort}
            onChange={event => navigate({ ...filters, sort: event.target.value as MovimentacaoSort })}
          >
            {SORT_OPTIONS.map(option => (
              <NativeSelectOption key={option.value || 'recentes'} value={option.value}>{option.label}</NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      </div>

      <ResponsiveFilterPanel
        open={open}
        onOpenChange={setOpen}
        panelHostId={MOVIMENTACAO_PANEL_HOST_ID}
        panelId={MOVIMENTACAO_PANEL_ID}
        title="Filtrar movimentações"
        returnFocusRef={returnFocusRef}
      >
        <form
          className={`${styles.filterForm} ${styles.inlineFilterForm}`}
          onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); navigate(draft); }}
        >
          <div className={styles.sheetHeader}>
            <div>
              <h2 data-filter-panel-title tabIndex={-1}>Filtrar movimentações</h2>
              <p>As alterações são aplicadas automaticamente ao feed.</p>
            </div>
            <div className={styles.panelStatus} role="status" aria-live="polite">
              {isPending && <span>Atualizando feed…</span>}
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
                    {tribunals.map(tribunal => (
                      <Field key={tribunal.code} orientation="horizontal" className={styles.checkField}>
                        <Checkbox
                          id={`${variant}-mov-tribunal-${tribunal.code}`}
                          checked={draft.tribunal.includes(tribunal.code)}
                          onCheckedChange={checked => changeDraft(current => ({
                            ...current,
                            tribunal: checked
                              ? [...new Set([...current.tribunal, tribunal.code])]
                              : current.tribunal.filter(item => item !== tribunal.code),
                          }), true)}
                        />
                        <FieldLabel className={styles.tribunalLabel} htmlFor={`${variant}-mov-tribunal-${tribunal.code}`}>
                          <span>{tribunal.code}</span>
                          <small>{tribunal.system}</small>
                        </FieldLabel>
                      </Field>
                    ))}
                  </FieldGroup>
                </FieldSet>

                <FieldSet className={styles.nestedGroup}>
                  <FieldLegend variant="label">Tipo</FieldLegend>
                  <FieldGroup data-slot="checkbox-group" className={styles.checkboxGrid}>
                    {TIPOS_MOVIMENTACAO.map(tipo => (
                      <Field key={tipo} orientation="horizontal" className={styles.checkField}>
                        <Checkbox
                          id={`${variant}-mov-tipo-${tipo}`}
                          checked={draft.tipo.includes(tipo)}
                          onCheckedChange={checked => changeDraft(current => ({
                            ...current,
                            tipo: checked
                              ? [...new Set([...current.tipo, tipo])]
                              : current.tipo.filter(item => item !== tipo),
                          }), true)}
                        />
                        <FieldLabel htmlFor={`${variant}-mov-tipo-${tipo}`}>{tipo}</FieldLabel>
                      </Field>
                    ))}
                  </FieldGroup>
                </FieldSet>
              </FieldSet>
            </FieldGroup>
          </div>

          <div className={styles.sheetFooter}>
            <Button
              type="button"
              variant="outline"
              onClick={() => changeDraft(current => ({
                ...DEFAULT_MOVIMENTACAO_FILTERS,
                q: current.q,
                sort: current.sort,
              }), true)}
            >
              Limpar filtros
            </Button>
            <span className={styles.autosaveHint}>Aplicação automática</span>
          </div>
        </form>
      </ResponsiveFilterPanel>
    </>
  );
}
