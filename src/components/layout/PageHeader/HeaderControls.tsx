'use client';

import Link from 'next/link';
import { useRef, type PointerEvent, type RefObject } from 'react';
import { ArrowUpDown, Funnel, X } from 'lucide-react';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { SearchControl } from './SearchControl';
import { buildQuery } from '@/lib/utils';
import styles from './PageHeader.module.css';

export type FilterOption = { label: string; value: string };

export type PageHeaderFilterGroup = {
  label: string;
  param: string;
  options: FilterOption[];
};

export type PageHeaderTabs = {
  param: string;
  options: FilterOption[];
};

export type CurrentParams = Record<string, string | undefined>;

/** Valor ativo de um param — default é a 1ª opção (value ""). */
function activeValue(current: CurrentParams, param: string, fallback = '') {
  return current[param] ?? fallback;
}

function clearParams(current: CurrentParams, params: string[]) {
  return buildQuery(
    current,
    params.reduce<CurrentParams>((acc, param) => {
      acc[param] = undefined;
      return acc;
    }, { page: undefined }),
  );
}

function closeDetails(ref: RefObject<HTMLDetailsElement | null>) {
  if (ref.current) ref.current.open = false;
}

function useDragToClose(detailsRef: RefObject<HTMLDetailsElement | null>) {
  const startY = useRef<number | null>(null);
  const lastY = useRef(0);

  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      startY.current = event.clientY;
      lastY.current = event.clientY;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      if (startY.current === null) return;
      lastY.current = event.clientY;
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      if (startY.current !== null && lastY.current - startY.current > 64) {
        closeDetails(detailsRef);
      }
      startY.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    onPointerCancel() {
      startY.current = null;
    },
  };
}

export interface HeaderControlsProps {
  /** Caminho base para montar os hrefs dos filtros/abas (ex.: "/processos"). */
  basePath: string;
  /** Params atuais da URL, usados para marcar o estado ativo e preservar filtros. */
  currentParams?: CurrentParams;
  /** Abas (ex.: Lista/Kanban/Calendário). */
  tabs?: PageHeaderTabs;
  filters?: PageHeaderFilterGroup[];
  sortParam?: string;
  sortOptions?: FilterOption[];
  searchLabel?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  /**
   * `desktop` (default): fragmento com abas + ações para a linha do título do PageHeader.
   * `mobile`: mesmo conteúdo, mas com as ações à direita e as abas em linha própria,
   * para ser injetado na barra do menu (AppLayout).
   */
  variant?: 'desktop' | 'mobile';
}

export function HeaderControls({
  basePath,
  currentParams = {},
  tabs,
  filters = [],
  sortParam = 'sort',
  sortOptions = [],
  searchLabel = 'Pesquisar',
  searchPlaceholder,
  searchValue,
  variant = 'desktop',
}: HeaderControlsProps) {
  // params preservados no form de busca (todos menos q e page)
  const preservedForSearch = Object.entries(currentParams).filter(
    ([key, value]) => key !== 'q' && key !== 'page' && value !== undefined && value !== '',
  );

  const tabsEl = tabs ? <HeaderTabs basePath={basePath} currentParams={currentParams} tabs={tabs} /> : null;

  const hasActions = Boolean(searchPlaceholder) || filters.length > 0 || sortOptions.length > 0;
  const actionsEl = hasActions ? (
    <div
      className={`${styles.actions}${variant === 'mobile' ? ` ${styles.mobileActions}` : ''}`}
      aria-label="Ações de listagem"
    >
      {searchPlaceholder && (
        <SearchControl
          basePath={basePath}
          searchLabel={searchLabel}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          preservedParams={preservedForSearch as [string, string][]}
        />
      )}
      {filters.length > 0 && (
        <HeaderFilters basePath={basePath} currentParams={currentParams} groups={filters} />
      )}
      {sortOptions.length > 0 && (
        <HeaderSort basePath={basePath} currentParams={currentParams} param={sortParam} options={sortOptions} />
      )}
    </div>
  ) : null;

  if (variant === 'mobile') {
    return (
      <>
        {actionsEl}
        {tabsEl && <div className={styles.mobileTabsRow}>{tabsEl}</div>}
      </>
    );
  }

  return (
    <>
      {tabsEl}
      {actionsEl}
    </>
  );
}

function HeaderTabs({
  basePath,
  currentParams,
  tabs,
}: {
  basePath: string;
  currentParams: CurrentParams;
  tabs: PageHeaderTabs;
}) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Visualização">
      {tabs.options.map((option, index) => {
        const active =
          activeValue(currentParams, tabs.param) === option.value ||
          (index === 0 && !currentParams[tabs.param]);
        return (
          <Link
            key={option.value}
            href={`${basePath}${buildQuery(currentParams, { [tabs.param]: option.value || undefined, page: undefined })}`}
            role="tab"
            aria-selected={active}
            className={`${styles.tab}${active ? ` ${styles.tabActive}` : ''}`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

function OptionLink({
  basePath,
  currentParams,
  param,
  option,
  active,
}: {
  basePath: string;
  currentParams: CurrentParams;
  param: string;
  option: FilterOption;
  active: boolean;
}) {
  return (
    <Link
      href={`${basePath}${buildQuery(currentParams, { [param]: option.value || undefined, page: undefined })}`}
      className={styles.optionLink}
      aria-pressed={active}
    >
      <TribTag label={option.label} active={active} />
    </Link>
  );
}

function HeaderFilters({
  basePath,
  currentParams,
  groups,
}: {
  basePath: string;
  currentParams: CurrentParams;
  groups: PageHeaderFilterGroup[];
}) {
  const anyActive = groups.some(g => (currentParams[g.param] ?? '') !== '');
  const clearHref = `${basePath}${clearParams(currentParams, groups.map(group => group.param))}`;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const dragProps = useDragToClose(detailsRef);
  return (
    <details ref={detailsRef} className={styles.filter}>
      <summary
        className={`${styles.iconControl}${anyActive ? ` ${styles.iconControlActive}` : ''}`}
        aria-label="Abrir filtros"
        title="Filtros"
      >
        <FilterIcon />
        <span className="sr-only">Filtros</span>
      </summary>
      <div className={styles.filterPanel}>
        <div className={styles.filterDragHandle} aria-hidden="true" {...dragProps}>
          <span />
        </div>
        <div className={styles.filterPanelHeader}>
          <div>
            <div className={styles.filterPanelTitle}>Filtros</div>
            <div className={styles.filterPanelSubtitle}>Refine a carteira de processos</div>
          </div>
          <div className={styles.filterPanelActions}>
            {anyActive && (
              <Link href={clearHref} className={styles.filterClear}>
                Limpar
              </Link>
            )}
            <button
              type="button"
              className={styles.filterClose}
              aria-label="Fechar filtros"
              onClick={() => {
                closeDetails(detailsRef);
              }}
            >
              <X aria-hidden="true" size={18} strokeWidth={2} />
              <span className="sr-only">Fechar filtros</span>
            </button>
          </div>
        </div>
        {groups.map(group => {
          const current = activeValue(currentParams, group.param);
          return (
            <div className={styles.filterGroup} key={group.param}>
              <div className={styles.filterLabel}>{group.label}</div>
              <div className={styles.filterOptions}>
                {group.options.map(option => (
                  <OptionLink
                    key={option.value}
                    basePath={basePath}
                    currentParams={currentParams}
                    param={group.param}
                    option={option}
                    active={current === option.value}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

function HeaderSort({
  basePath,
  currentParams,
  param,
  options,
}: {
  basePath: string;
  currentParams: CurrentParams;
  param: string;
  options: FilterOption[];
}) {
  const current = activeValue(currentParams, param);
  const anyActive = current !== '';
  const clearHref = `${basePath}${clearParams(currentParams, [param])}`;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const dragProps = useDragToClose(detailsRef);
  return (
    <details ref={detailsRef} className={styles.filter}>
      <summary
        className={`${styles.iconControl}${anyActive ? ` ${styles.iconControlActive}` : ''}`}
        aria-label="Abrir ordenação"
        title="Ordenação"
      >
        <SortIcon />
        <span className="sr-only">Ordenação</span>
      </summary>
      <div className={`${styles.filterPanel} ${styles.sortPanel}`}>
        <div className={styles.filterDragHandle} aria-hidden="true" {...dragProps}>
          <span />
        </div>
        <div className={styles.filterPanelHeader}>
          <div>
            <div className={styles.filterPanelTitle}>Ordenação</div>
            <div className={styles.filterPanelSubtitle}>Escolha como listar</div>
          </div>
          <div className={styles.filterPanelActions}>
            {anyActive && (
              <Link href={clearHref} className={styles.filterClear}>
                Limpar
              </Link>
            )}
            <button
              type="button"
              className={styles.filterClose}
              aria-label="Fechar ordenação"
              onClick={() => {
                closeDetails(detailsRef);
              }}
            >
              <X aria-hidden="true" size={18} strokeWidth={2} />
              <span className="sr-only">Fechar ordenação</span>
            </button>
          </div>
        </div>
        <div className={styles.filterGroup}>
          <div className={styles.filterLabel}>Ordenação</div>
          <div className={styles.filterOptions}>
            {options.map(option => (
              <OptionLink
                key={option.value}
                basePath={basePath}
                currentParams={currentParams}
                param={param}
                option={option}
                active={current === option.value}
              />
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}

function FilterIcon() {
  return (
    <Funnel aria-hidden="true" size={16} strokeWidth={2} />
  );
}

function SortIcon() {
  return (
    <ArrowUpDown aria-hidden="true" size={16} strokeWidth={2} />
  );
}
