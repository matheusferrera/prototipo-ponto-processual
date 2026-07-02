import type { ReactNode } from 'react';
import { WhatsBadge } from '@/components/ui/WhatsBadge/WhatsBadge';
import { HeaderControls } from './HeaderControls';
import type { PageHeaderFilterGroup, PageHeaderTabs, FilterOption, CurrentParams } from './HeaderControls';
import styles from './PageHeader.module.css';

export type { FilterOption, PageHeaderFilterGroup, PageHeaderTabs } from './HeaderControls';

interface PageHeaderProps {
  /** Caminho base para montar os hrefs dos filtros/abas (ex.: "/processos"). */
  basePath: string;
  /** Params atuais da URL, usados para marcar o estado ativo e preservar filtros. */
  currentParams?: CurrentParams;
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
  breadcrumb?: ReactNode;
  /** Abas (ex.: Lista/Kanban/Calendário) renderizadas na linha do título. */
  tabs?: PageHeaderTabs;
  filters?: PageHeaderFilterGroup[];
  sortParam?: string;
  sortOptions?: FilterOption[];
  searchLabel?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  whatsBadge?: {
    active?: boolean;
    count: number;
  };
  syncButtonLabel?: string;
  loading?: boolean;
}

export function PageHeader({
  basePath,
  currentParams = {},
  eyebrow,
  title,
  children,
  className = 'px-page',
  breadcrumb,
  tabs,
  filters = [],
  sortParam = 'sort',
  sortOptions = [],
  searchLabel = 'Pesquisar',
  searchPlaceholder,
  searchValue,
  whatsBadge,
  syncButtonLabel,
  loading = false,
}: PageHeaderProps) {
  return (
    <div
      className={[styles.root, className, loading ? styles.loading : ''].filter(Boolean).join(' ')}
      aria-busy={loading || undefined}
    >
      <div className={styles.copy}>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        <div className={`${styles.title}${eyebrow ? ` ${styles.titleWithEyebrow}` : ''}`}>{title}</div>
        {breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}
      </div>

      <HeaderControls
        basePath={basePath}
        currentParams={currentParams}
        tabs={tabs}
        filters={filters}
        sortParam={sortParam}
        sortOptions={sortOptions}
        searchLabel={searchLabel}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
      />

      {whatsBadge && (
        <span className={styles.whatsBadge}>
          <WhatsBadge active={whatsBadge.active} count={whatsBadge.count} />
        </span>
      )}

      {syncButtonLabel && (
        <button className={styles.syncBtn}>
          ⟳ {syncButtonLabel}
        </button>
      )}

      {children}
    </div>
  );
}
