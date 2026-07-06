import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Processo } from '@/types';
import { COLS, ProcessoRow } from '../ProcessoRow/ProcessoRow';
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
}

export function PageContent({ processos, total, totalPages, currentPage, listParams = {}, pageInfo }: PageContentProps) {
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);
  const pageHref = (p: number) => buildQuery(listParams, { page: String(p) });

  // filtros que efetivamente reduzem a lista (ordenação não conta)
  const hasFilters = Boolean(listParams.q || listParams.tribunal || listParams.status || listParams.whats);
  const isEmpty = processos.length === 0;

  const btnBase = cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }), styles.pageBtn, 'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--paper-2)]');
  const btnDisabled = cn(btnBase, 'pointer-events-none opacity-40');

  return (
    <>
      <div className={styles.scrollArea}>
        {pageInfo}

        {isEmpty ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className={styles.tableMinWidth}>
            <div
              className={styles.tableHeader}
              style={{ gridTemplateColumns: COLS }}
            >
              <div /><div>Tribunal</div><div>Nº CNJ / Órgão julgador</div><div>Assunto</div>
              <div>Polo ativo</div><div>Última movimentação</div>
            </div>

            {processos.map(processo => (
              <ProcessoRow key={processo.id} p={processo} />
            ))}
          </div>
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
    </>
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
