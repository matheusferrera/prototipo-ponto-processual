import type { ReactNode } from 'react';
import Link from 'next/link';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Movimentacao } from '@/types';
import styles from './PageContent.module.css';

interface PageContentProps {
  movimentacoes: {
    date: string;
    day: string;
    items: Movimentacao[];
  }[];
  pageInfo?: ReactNode;
}

export function PageContent({ movimentacoes, pageInfo }: PageContentProps) {
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
          <div className={styles.parte}>{m.parte}</div>
          <div className={styles.detail}>{m.detail}</div>
          <div className={styles.cnj}>{m.cnj}</div>
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
