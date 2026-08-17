import type { ReactNode } from 'react';
import Link from 'next/link';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { buttonVariants } from '@/components/ui/button';
import { cn, buildQuery } from '@/lib/utils';
import { clienteMovimentacao, assuntoSecundario, descricaoMovimentacao } from '@/lib/movimentacao';
import type { Movimentacao } from '@/types';
import styles from './PageContent.module.css';

interface PageContentProps {
  movimentacoes: {
    date: string;
    day: string;
    items: Movimentacao[];
  }[];
  pageInfo?: ReactNode;
  total: number;
  totalPages: number;
  currentPage: number;
  /** params de filtro/busca a preservar nos links de paginação */
  listParams?: Record<string, string | undefined>;
}

export function PageContent({ movimentacoes, pageInfo, total, totalPages, currentPage, listParams = {} }: PageContentProps) {
  const itemsOnPage = movimentacoes.flatMap(g => g.items).length;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * 20 + 1;
  const rangeEnd = (currentPage - 1) * 20 + itemsOnPage;
  const pageHref = (p: number) => buildQuery(listParams, { page: String(p) });

  return (
    <>
      <div className={styles.scrollArea}>
        {pageInfo}

        <div className={`px-page ${styles.content}`}>
          {movimentacoes.map((g, gi) => (
            <div key={gi} className={styles.dateGroup}>
              <div className={styles.dateHeader}>
                <span className={`${styles.dateLabel}${gi === 0 ? ` ${styles.dateLabelFirst}` : ''}`}>
                  § {g.date} — {g.day}
                </span>
                <div className={styles.dateDivider} />
                <span className={styles.dateCount}>
                  {g.items.length} {g.items.length === 1 ? 'movimentação' : 'movimentações'}
                </span>
              </div>
              {g.items.map(m => <MovItem key={m.id} m={m} />)}
            </div>
          ))}
        </div>
      </div>

      <div className={`px-page ${styles.pagination}`}>
        <span className={styles.paginationInfo}>{rangeStart}–{rangeEnd} de {total}</span>
        <div className={styles.spacer} />
        <Link
          href={pageHref(currentPage - 1)}
          aria-disabled={currentPage === 1}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' }),
            'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--paper-2)]',
            currentPage === 1 && 'pointer-events-none opacity-40',
          )}
        >←</Link>
        <span className={styles.paginationPage}>{currentPage} / {totalPages}</span>
        <Link
          href={pageHref(currentPage + 1)}
          aria-disabled={currentPage === totalPages}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' }),
            'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--paper-2)]',
            currentPage === totalPages && 'pointer-events-none opacity-40',
          )}
        >→</Link>
      </div>
    </>
  );
}

function MovItem({ m }: { m: Movimentacao }) {
  const itemStateClass =
    m.state === 'signal' ? styles.itemSignal :
    m.state === 'alert'  ? styles.itemAlert  :
    styles.itemQuiet;

  const cliente = clienteMovimentacao(m);
  const assunto = assuntoSecundario(m, cliente);

  return (
    <Link href={`/movimentacoes/${m.id}`} className={`${styles.item} ${itemStateClass}`}>
      <div className={styles.timeCol}>
        <span className={styles.timeLabel}>horário</span>
        <span className={`${styles.time} ${m.state === 'signal' ? styles.timeSignal : styles.timeNormal}`}>
          {m.time}
        </span>
      </div>

      <div className={styles.bodyCol}>
        <div className={styles.bodyHeader}>
          <TribTag label={m.tribunal} />
          <span className={`${styles.tipoLabel} ${m.state === 'signal' ? styles.tipoSignal : styles.tipoNormal}`}>
            {m.tipo}
          </span>
          {m.state === 'signal' && <Seal variant="nova" />}
          {m.state === 'alert'  && <Seal variant="erro" />}
        </div>

        {/* Título — o cliente, o que o advogado procura ao varrer o feed */}
        <div className={styles.cliente}>{cliente}</div>
        {/* Subtítulo — a movimentação em si: o que aconteceu no processo */}
        <div className={styles.detail}>{descricaoMovimentacao(m)}</div>
        {assunto && <div className={styles.assunto}>{assunto}</div>}

        <div className={styles.processMeta}>
          <span className={styles.cnj}>autos nº {m.cnj}</span>
          {m.orgaoJulgador !== '—' && (
            <>
              <span className={styles.metaSep} aria-hidden="true">·</span>
              <span className={styles.orgaoJulgador}>{m.orgaoJulgador}</span>
            </>
          )}
        </div>
      </div>

      <span className={styles.go} aria-hidden="true">→</span>
    </Link>
  );
}
