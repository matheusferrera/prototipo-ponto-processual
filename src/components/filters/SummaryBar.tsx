import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './SummaryBar.module.css';

export type SummaryTone = 'signal' | 'alert';

export interface SummaryChip {
  key: string;
  href: string;
  label: string;
  count: number;
  active: boolean;
  /** cor do número quando há algo a mostrar; sem tom, o número fica neutro */
  tone?: SummaryTone;
}

/**
 * A faixa logo abaixo do header. Processos põe ali os números da carteira como
 * filtros (à esquerda) e os controles de exibição (à direita); Prazos usa só
 * as visualizações, alinhadas à esquerda. Uma barra, a mesma leitura.
 */
export function SummaryBar({ chips = [], ariaLabel, align = 'end', children }: {
  chips?: SummaryChip[];
  ariaLabel?: string;
  /** onde ficam os `children` quando não há chips disputando a esquerda */
  align?: 'start' | 'end';
  children?: ReactNode;
}) {
  return (
    <div className={`px-page ${styles.bar}`}>
      {chips.length > 0 && (
        <nav className={styles.chips} aria-label={ariaLabel}>
          {chips.map(chip => (
            <Link
              key={chip.key}
              href={chip.href}
              className={styles.chip}
              data-active={chip.active || undefined}
              data-tone={chip.count > 0 ? chip.tone : undefined}
              aria-current={chip.active ? 'true' : undefined}
              scroll={false}
            >
              <span>{chip.label}</span>
              <span className={styles.count}>{chip.count}</span>
            </Link>
          ))}
        </nav>
      )}
      {children && <div className={styles.tools} data-align={align}>{children}</div>}
    </div>
  );
}

/** Segmentado de links (Pauta/Kanban/Calendário) com a mesma cara do Lista/Tabela. */
export function SummaryViewTabs({ tabs, ariaLabel }: {
  tabs: { key: string; href: string; label: string; active: boolean; icon?: ReactNode }[];
  ariaLabel: string;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label={ariaLabel}>
      {tabs.map(tab => (
        <Link
          key={tab.key}
          href={tab.href}
          className={styles.segment}
          aria-current={tab.active ? 'page' : undefined}
          scroll={false}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </Link>
      ))}
    </div>
  );
}
