import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Processo } from '@/types';
import { FilterWorkspace } from '@/components/filters/FilterWorkspace';
import { ProcessView } from '../ProcessView/ProcessView';
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
  /** barra de resumo: chips de estado + controles de exibição */
  summary?: ReactNode;
  /** Busca/filtro/ordenação — só aparece no mobile, em fluxo com o conteúdo (não fixo no topo). */
  mobileControls?: ReactNode;
  tableControls?: ReactNode;
  panelHostId: string;
}

export function PageContent({ processos, total, totalPages, currentPage, listParams = {}, summary, mobileControls, tableControls, panelHostId }: PageContentProps) {
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
          {mobileControls && <div className={styles.mobileControls}>{mobileControls}</div>}
          {summary}
          {tableControls}

          {isEmpty ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            <ProcessView processos={processos} listParams={listParams} />
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
  const buttonClass = cn(
    buttonVariants({ variant: 'outline', size: 'sm' }),
    'border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-2)]',
  );

  return (
    <div className={`px-page ${styles.empty}`}>
      <div className={styles.emptyMark} aria-hidden="true" />
      {hasFilters ? (
        <>
          <p className={styles.emptyTitle}>Nenhum processo encontrado</p>
          <p className={styles.emptyText}>Nenhum processo corresponde aos filtros ou à busca atual.</p>
          <Link href="/processos" className={buttonClass}>Limpar filtros</Link>
        </>
      ) : (
        <>
          <p className={styles.emptyTitle}>Sua carteira ainda está vazia</p>
          <p className={styles.emptyText}>
            Cadastre uma credencial de tribunal. A partir daí, cada processo aparece aqui
            com o nome das partes, a última movimentação e o próximo prazo.
          </p>
          <Link href="/credenciais" className={buttonClass}>Cadastrar credencial</Link>
        </>
      )}
    </div>
  );
}
