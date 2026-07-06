import type { ReactNode } from 'react';
import Link from 'next/link';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { buttonVariants } from '@/components/ui/button';
import { cn, buildQuery } from '@/lib/utils';
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

  return (
    <div className={`${styles.item} ${itemStateClass}`}>
      <div className={styles.itemInner}>

        <div className={styles.timeCol}>
          <div className={`${styles.time} ${m.state === 'signal' ? styles.timeSignal : styles.timeNormal}`}>
            {m.time}
          </div>
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
          <div className={styles.parte}>{m.assunto}</div>
          <div className={styles.detail}>{m.detail}</div>
          <div className={styles.processMeta}>
            <span className={styles.cnj}>{m.cnj}</span>
            {m.orgaoJulgador !== '—' && (
              <>
                <span className={styles.metaSep} aria-hidden="true">·</span>
                <span className={styles.orgaoJulgador}>{m.orgaoJulgador}</span>
              </>
            )}
          </div>
        </div>

        <div className={styles.whatsCol}>
          <div className={styles.whatsRow}>
            <span className={`${styles.whatsIcon} ${m.whats.sent ? styles.whatsIconSent : styles.whatsIconUnsent}`}>
              W
            </span>
            <span className={`${styles.whatsLabel} ${m.whats.sent ? styles.whatsLabelSent : styles.whatsLabelUnsent}`}>
              {m.whats.sent ? 'Enviado' : 'Não enviado'}
            </span>
          </div>
          <div className={styles.whatsStatus}>
            {m.whats.sent ? `às ${m.whats.time} · entregue ✓✓` : m.whats.reason}
          </div>
        </div>

        <div className={styles.actionCol}>
          <Link
            href={`/movimentacoes/${m.id}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--paper-2)]')}
          >
            Visualizar →
          </Link>
        </div>

      </div>
    </div>
  );
}
