import Link from 'next/link';
import type { Processo } from '@/types';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import styles from './ProcessoRow.module.css';

const COLS = '12px 70px 240px 1fr 1fr 1.4fr';

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
      style={{ gridTemplateColumns: COLS }}
    >
      <div className={`${styles.leftBar} ${barClass}`} />

      <span className={`${styles.statusDot} ${dotClass}`} />

      <TribTag label={p.tribunal} />

      <span className={styles.cnj}>{p.cnj}</span>
      <span className={`${styles.parte} ${styles.ellipsis}`}>{p.classeJudicial ?? '—'}</span>
      <span className={`${styles.parte} ${styles.ellipsis}`} title={p.parte}>{p.parte}</span>
      <span className={`${styles.meta} ${styles.ellipsis}`} title={p.ultimaMov}>{p.ultimaMov}</span>
    </Link>
  );
}

export { COLS };
