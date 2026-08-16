import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Processo } from '@/types';
import { FilterWorkspace } from '@/components/filters/FilterWorkspace';
import { ProcessTable } from '../ProcessTable/ProcessTable';
import { buttonVariants } from '@/components/ui/button';
import { cn, buildQuery } from '@/lib/utils';
import styles from './PageContent.module.css';

const PAGE_SIZE = 20;

interface PageContentProps {
  processos: Processo[];
  total: number;
  totalPages: number;
  currentPage: number;
  /** params de filtro/busca a preservar nos links de paginação */
  listParams?: Record<string, string | undefined>;
  pageInfo?: ReactNode;
  /** Busca/filtro/ordenação — só aparece no mobile, em fluxo com o conteúdo (não fixo no topo). */
  mobileControls?: ReactNode;
  tableControls?: ReactNode;
  panelHostId: string;
}

export function PageContent({ processos, total, totalPages, currentPage, listParams = {}, pageInfo, mobileControls, tableControls, panelHostId }: PageContentProps) {
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);
  const pageHref = (p: number) => buildQuery(listParams, { page: String(p) });

  // filtros que efetivamente reduzem a lista (ordenação não conta)
  const hasFilters = [
    'q', 'tribunal', 'grau', 'state', 'status', 'monitored', 'assunto', 'classe', 'orgao',
    'valorMin', 'valorMax', 'autuadoFrom', 'autuadoTo', 'movFrom', 'movTo',
  ].some(key => Boolean(listParams[key]));
  const isEmpty = processos.length === 0;

  const btnBase = cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }), styles.pageBtn, 'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--paper-2)]');
  const btnDisabled = cn(btnBase, 'pointer-events-none opacity-40');

  return (
    <FilterWorkspace panelHostId={panelHostId}>
      <div className={styles.contentColumn}>
        <div className={styles.scrollArea}>
          {pageInfo}
          {mobileControls && <div className={styles.mobileControls}>{mobileControls}</div>}
          {tableControls}

          {isEmpty ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            <ProcessTable processos={processos} listParams={listParams} />
          )}
        </div>

        {!isEmpty && (
          <div className={`px-page ${styles.pagination}`}>
            <span className={styles.paginationInfo}>{rangeStart}–{rangeEnd} de {total}</span>
            <div className={styles.spacer} />
            {currentPage <= 1
              ? <span className={btnDisabled} aria-label="Página anterior" aria-disabled="true">←</span>
              : <Link href={pageHref(currentPage - 1)} className={btnBase} aria-label="Página anterior" rel="prev">←</Link>
            }
            <span className={styles.paginationPage}>{currentPage} / {totalPages}</span>
            {currentPage >= totalPages
              ? <span className={btnDisabled} aria-label="Próxima página" aria-disabled="true">→</span>
              : <Link href={pageHref(currentPage + 1)} className={btnBase} aria-label="Próxima página" rel="next">→</Link>
            }
          </div>
        )}
      </div>
    </FilterWorkspace>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className={`px-page ${styles.empty}`}>
      <div className={styles.emptyMark} aria-hidden="true" />
      {hasFilters ? (
        <>
          <p className={styles.emptyTitle}>Nenhum processo encontrado</p>
          <p className={styles.emptyText}>Nenhum processo corresponde aos filtros ou à busca atual.</p>
          <Link
            href="/processos"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-2)]')}
          >
            Limpar filtros
          </Link>
        </>
      ) : (
        <>
          <p className={styles.emptyTitle}>Nenhum processo monitorado ainda</p>
          <p className={styles.emptyText}>
            Assim que um processo for adicionado às suas credenciais, ele aparece aqui com o histórico de movimentações.
          </p>
        </>
      )}
    </div>
  );
}
