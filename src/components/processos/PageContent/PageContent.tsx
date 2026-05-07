import type { ReactNode } from 'react';
import type { Processo } from '@/types';
import { COLS, ProcessoRow } from '../ProcessoRow/ProcessoRow';
import { Button } from '@/components/ui/button';
import styles from './PageContent.module.css';

interface PageContentProps {
  processos: Processo[];
  pageInfo?: ReactNode;
}

export function PageContent({ processos, pageInfo }: PageContentProps) {
  const totalPages = Math.ceil(142 / processos.length);

  return (
    <>
      <div className={styles.scrollArea}>
        {pageInfo}

        <div className={styles.tableMinWidth}>
          <div
            className={styles.tableHeader}
            style={{ gridTemplateColumns: COLS }}
          >
            <div /><div>Tribunal</div><div>Nº CNJ</div><div>Parte</div>
            <div>Matéria</div><div>Grau</div><div>Última</div>
            <div>Status</div><div>WhatsApp</div>
          </div>

          {processos.map(processo => (
            <ProcessoRow key={processo.id} p={processo} />
          ))}
        </div>
      </div>

      <div className={`px-page ${styles.pagination}`}>
        <span className={styles.paginationInfo}>1–{processos.length} de 142</span>
        <div className={styles.spacer} />
        <Button variant="outline" size="icon-sm" className="border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--paper-2)]">←</Button>
        <span className={styles.paginationPage}>1 / {totalPages}</span>
        <Button variant="outline" size="icon-sm" className="border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--paper-2)]">→</Button>
      </div>
    </>
  );
}
