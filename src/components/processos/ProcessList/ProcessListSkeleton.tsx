import styles from './ProcessListSkeleton.module.css';

/** Placeholder com as duas alturas da linha da lista, para a página não pular ao carregar. */
export function ProcessListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className={styles.list} role="status" aria-label="Carregando processos">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={styles.row} aria-hidden="true">
          <div className={styles.main}>
            <span className={`${styles.bar} ${styles.title}`} style={{ width: `${52 + (index % 3) * 14}%` }} />
            <span className={`${styles.bar} ${styles.line}`} style={{ width: `${34 + (index % 4) * 9}%` }} />
          </div>
          <div className={styles.aside}>
            <span className={`${styles.bar} ${styles.ident}`} />
            <span className={`${styles.bar} ${styles.orgao}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
