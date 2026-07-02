import Link from 'next/link';
import type { Processo } from '@/types';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import styles from './ProcessoRow.module.css';

const COLS = '12px 70px 240px 1fr 1fr 1.4fr';

const STATE_LABEL: Record<Processo['state'], string> = {
  signal: 'Com novidade',
  alert: 'Com erro',
  quiet: 'Monitorado',
};

interface ProcessoRowProps {
  p: Processo;
}

export function ProcessoRow({ p }: ProcessoRowProps) {
  const rowClass    = p.state === 'signal' ? styles.rowSignal : styles.rowNormal;
  const barClass    = p.state === 'signal' ? styles.leftBarSignal : p.state === 'alert' ? styles.leftBarAlert : styles.leftBarHidden;
  const dotClass    = p.state === 'signal' ? styles.statusDotSignal : p.state === 'alert' ? styles.statusDotAlert : styles.statusDotQuiet;

  return (
    <Link
      href={`/processos/${encodeURIComponent(p.cnj)}`}
      className={`${styles.row} ${rowClass}`}
      aria-label={`Processo ${p.cnj} — ${STATE_LABEL[p.state]}`}
    >
      <div className={`${styles.leftBar} ${barClass}`} aria-hidden="true" />

      {/* Desktop: linha de tabela */}
      <div className={styles.rowGrid} style={{ gridTemplateColumns: COLS }}>
        <span className={`${styles.statusDot} ${dotClass}`} />
        <TribTag label={p.tribunal} />
        <span className={styles.cnj}>{p.cnj}</span>
        <span className={`${styles.parte} ${styles.ellipsis}`}>{p.classeJudicial ?? '—'}</span>
        <span className={`${styles.parte} ${styles.ellipsis}`} title={p.parte}>{p.parte}</span>
        <span className={`${styles.meta} ${styles.ellipsis}`} title={p.ultimaMov}>{p.ultimaMov}</span>
      </div>

      {/* Mobile: card empilhado */}
      <div className={styles.card}>
        <span className={styles.cardCnj}>{p.cnj}</span>
        <div className={styles.cardTribLine}>
          <TribTag label={p.tribunal} />
          {p.classeJudicial && <span className={styles.cardClasse}>· {p.classeJudicial}</span>}
        </div>
        <span className={styles.cardParte}>{p.parte}</span>
      </div>
    </Link>
  );
}

export { COLS };
