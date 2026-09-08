import styles from './DateGroupHeader.module.css';

/**
 * O cabeçalho de um dia numa lista de movimentações — o mesmo no feed de
 * `/movimentacoes` e na linha do tempo do processo.
 *
 * `className` existe para o chamador ajustar só a CALHA: dentro do painel do
 * processo o gutter já vem de `.panel`, e a faixa precisa sangrar para as
 * bordas em vez de somar mais 28px de recuo aos que já existem.
 */
export function DateGroupHeader({ date, day, count, dateTime, className }: {
  date: string;
  day?: string;
  count: string;
  dateTime?: string;
  className?: string;
}) {
  return (
    <header className={className ? `${styles.header} ${className}` : styles.header}>
      {dateTime ? <time dateTime={dateTime} className={styles.date}>{date}</time> : <span className={styles.date}>{date}</span>}
      {day && <span className={styles.day}>{day}</span>}
      <span className={styles.divider} aria-hidden="true" />
      <span className={styles.count}>{count}</span>
    </header>
  );
}
