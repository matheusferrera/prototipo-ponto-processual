import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Processo } from '@/types';
import { COLS, ProcessoRow } from '../ProcessoRow/ProcessoRow';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import styles from './PageContent.module.css';

const PAGE_SIZE = 20;

interface PageContentProps {
  processos: Processo[];
  total: number;
  totalPages: number;
  currentPage: number;
  pageInfo?: ReactNode;
}

export function PageContent({ processos, total, totalPages, currentPage, pageInfo }: PageContentProps) {
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  const btnBase = cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }), 'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--paper-2)]');
  const btnDisabled = cn(btnBase, 'pointer-events-none opacity-40');

  return (
    <>
      <div className={styles.scrollArea}>
        {pageInfo}

        <div className={styles.tableMinWidth}>
          <div
            className={styles.tableHeader}
            style={{ gridTemplateColumns: COLS }}
          >
            <div /><div>Tribunal</div><div>Nº CNJ</div><div>Classe judicial</div>
            <div>Polo ativo</div><div>Última movimentação</div>
          </div>

          {processos.map(processo => (
            <ProcessoRow key={processo.id} p={processo} />
          ))}
        </div>
      </div>

      <div className={`px-page ${styles.pagination}`}>
        <span className={styles.paginationInfo}>{rangeStart}–{rangeEnd} de {total}</span>
        <div className={styles.spacer} />
        {currentPage <= 1
          ? <span className={btnDisabled}>←</span>
          : <Link href={`?page=${currentPage - 1}`} className={btnBase}>←</Link>
        }
        <span className={styles.paginationPage}>{currentPage} / {totalPages}</span>
        {currentPage >= totalPages
          ? <span className={btnDisabled}>→</span>
          : <Link href={`?page=${currentPage + 1}`} className={btnBase}>→</Link>
        }
      </div>
    </>
  );
}
