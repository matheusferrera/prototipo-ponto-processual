import type { ReactNode } from 'react';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { WhatsBadge } from '@/components/ui/WhatsBadge/WhatsBadge';
import styles from './PageHeader.module.css';

type PageHeaderFilterGroup = {
  label: string;
  options: string[];
};

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
  breadcrumb?: ReactNode;
  filters?: PageHeaderFilterGroup[];
  sortOptions?: string[];
  searchLabel?: string;
  searchPlaceholder?: string;
  whatsBadge?: {
    active?: boolean;
    count: number;
  };
  syncButtonLabel?: string;
  loading?: boolean;
}

export function PageHeader({
  eyebrow,
  title,
  children,
  className = 'px-page',
  breadcrumb,
  filters = [],
  sortOptions = [],
  searchLabel = 'Pesquisar',
  searchPlaceholder,
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

      {searchPlaceholder && (
        <div className={styles.search} role="search">
          <label className="sr-only" htmlFor="page-header-search-input">{searchLabel}</label>
          <SearchIcon />
          <input
            id="page-header-search-input"
            name="search"
            type="search"
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
          />
        </div>
      )}

      {(filters.length > 0 || sortOptions.length > 0) && (
        <div className={styles.actions} aria-label="Ações de listagem">
          {filters.length > 0 && <PageHeaderFilters groups={filters} />}
          {sortOptions.length > 0 && <PageHeaderSort options={sortOptions} />}
        </div>
      )}

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

function PageHeaderFilters({ groups }: { groups: PageHeaderFilterGroup[] }) {
  return (
    <details className={styles.filter}>
      <summary className={styles.iconControl} aria-label="Abrir filtros" title="Filtros">
        <FilterIcon />
        <span className="sr-only">Filtros</span>
      </summary>
      <div className={styles.filterPanel}>
        {groups.map(group => (
          <div className={styles.filterGroup} key={group.label}>
            <div className={styles.filterLabel}>{group.label}</div>
            <div className={styles.filterOptions}>
              {group.options.map((option, index) => (
                <TribTag key={option} label={option} active={index === 0} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function PageHeaderSort({ options }: { options: string[] }) {
  return (
    <details className={styles.filter}>
      <summary className={styles.iconControl} aria-label="Abrir ordenação" title="Ordenação">
        <SortIcon />
        <span className="sr-only">Ordenação</span>
      </summary>
      <div className={`${styles.filterPanel} ${styles.sortPanel}`}>
        <div className={styles.filterGroup}>
          <div className={styles.filterLabel}>Ordenação</div>
          <div className={styles.filterOptions}>
            {options.map((option, index) => (
              <TribTag key={option} label={option} active={index === 0} />
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h18" /><path d="M7 12h10" /><path d="M10 19h4" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
    </svg>
  );
}
