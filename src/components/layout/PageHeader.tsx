import type { ReactNode } from 'react';
import { TribTag } from '@/components/ui/TribTag';
import { WhatsBadge } from '@/components/ui/WhatsBadge';

type PageHeaderFilterGroup = {
  label: string;
  options: string[];
};

interface PageHeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
  breadcrumb?: ReactNode;
  filters?: PageHeaderFilterGroup[];
  whatsBadge?: {
    active?: boolean;
    count: number;
  };
  syncButtonLabel?: string;
}

export function PageHeader({
  eyebrow,
  title,
  children,
  className = 'px-page topbar-inner',
  breadcrumb,
  filters = [],
  whatsBadge,
  syncButtonLabel,
}: PageHeaderProps) {
  return (
    <div
      className={className}
      style={{
        padding: '18px 32px',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'var(--paper)',
        flexShrink: 0,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)' }}>
          {eyebrow}
        </div>
        <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', marginTop: 2 }}>{title}</div>
        {breadcrumb && (
          <div className="page-header-breadcrumb">
            {breadcrumb}
          </div>
        )}
      </div>
      {filters.length > 0 && <PageHeaderFilters groups={filters} />}
      {whatsBadge && (
        <span className="whats-badge-topbar" style={{ display: 'inline-flex' }}>
          <WhatsBadge active={whatsBadge.active} count={whatsBadge.count} />
        </span>
      )}
      {syncButtonLabel && (
        <button
          className="sync-btn-topbar"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontFamily: 'var(--ui)',
            fontWeight: 600,
            fontSize: 12,
            padding: '6px 10px',
            border: '1px solid var(--ink)',
            background: 'var(--paper)',
            color: 'var(--ink)',
            borderRadius: 0,
            cursor: 'pointer',
          }}
        >
          ⟳ {syncButtonLabel}
        </button>
      )}
      {children}
    </div>
  );
}

function PageHeaderFilters({ groups }: { groups: PageHeaderFilterGroup[] }) {
  return (
    <details className="page-header-filter">
      <summary
        style={{
          background: 'var(--paper)',
          color: 'var(--ink)',
          border: '1px solid var(--ink)',
        }}
      >
        <FilterIcon />
        <span>Filtros</span>
      </summary>
      <div className="page-header-filter-panel">
        {groups.map(group => (
          <div className="page-header-filter-group" key={group.label}>
            <div className="page-header-filter-label">{group.label}</div>
            <div className="page-header-filter-options">
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

function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 5h18" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </svg>
  );
}
