import { COLS } from './ProcessoRow';
import styles from './ProcessoRowSkeleton.module.css';

/** Placeholder de carregamento com o mesmo layout do ProcessoRow (linha no desktop, card no mobile). */
export function ProcessoRowSkeleton() {
  return (
    <div className={styles.row} aria-hidden="true">
      {/* Desktop */}
      <div className={styles.rowGrid} style={{ gridTemplateColumns: COLS }}>
        <span />
        <span className={`${styles.bar} ${styles.trib}`} />
        <span className={`${styles.bar} ${styles.cnj}`} />
        <span className={`${styles.bar} ${styles.md}`} />
        <span className={`${styles.bar} ${styles.md}`} />
        <span className={`${styles.bar} ${styles.lg}`} />
      </div>

      {/* Mobile */}
      <div className={styles.card}>
        <span className={`${styles.bar} ${styles.cnj}`} />
        <span className={`${styles.bar} ${styles.trib}`} />
        <span className={`${styles.bar} ${styles.parte}`} />
        <span className={`${styles.bar} ${styles.mov}`} />
      </div>
    </div>
  );
}

export function ProcessoListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className={styles.list} role="status" aria-label="Carregando processos">
      {Array.from({ length: rows }).map((_, i) => (
        <ProcessoRowSkeleton key={i} />
      ))}
    </div>
  );
}
