import Link from 'next/link';
import type { Processo } from '@/types';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { ToggleSw } from '@/components/ui/ToggleSw/ToggleSw';
import styles from './ProcessoRow.module.css';

const COLS = '12px 70px 280px 1fr 110px 60px 90px 90px 60px';

interface ProcessoRowProps {
  p: Processo;
}

export function ProcessoRow({ p }: ProcessoRowProps) {
  const rowClass    = p.state === 'signal' ? styles.rowSignal : styles.rowNormal;
  const barClass    = p.state === 'signal' ? styles.leftBarSignal : p.state === 'alert' ? styles.leftBarAlert : styles.leftBarHidden;
  const dotClass    = p.state === 'signal' ? styles.statusDotSignal : p.state === 'alert' ? styles.statusDotAlert : styles.statusDotQuiet;

  return (
    <Link
      href={`/processos/${p.id}`}
      className={`${styles.row} ${rowClass}`}
      style={{ gridTemplateColumns: COLS }}
    >
      <div className={`${styles.leftBar} ${barClass}`} />

      <span className={`${styles.statusDot} ${dotClass}`} />

      <TribTag label={p.tribunal} />

      <span className={styles.cnj}>{p.cnj}</span>
      <span className={styles.parte}>{p.parte}</span>
      <span className={styles.meta}>{p.materia}</span>
      <span className={styles.meta}>{p.grau}</span>
      <span className={styles.meta}>{p.ultimaMov}</span>

      <div>
        {p.state === 'signal' && <Seal variant="nova" />}
        {p.state === 'alert'  && <Seal variant="erro" />}
        {p.state === 'quiet'  && <span className={styles.statusEmpty}>—</span>}
      </div>

      <ToggleSw defaultOn={p.whatsEnabled} />
    </Link>
  );
}

export { COLS };
