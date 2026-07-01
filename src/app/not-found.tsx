import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <span className={styles.stamp}>§ HTTP · 404</span>

        <div className={styles.code}>404</div>

        <div className={styles.rule} />

        <p className={styles.brand}>PONTO PROCESSUAL</p>

        <h1 className={styles.title}>Página não encontrada</h1>
        <p className={styles.body}>
          O endereço solicitado não existe ou foi movido.
          Retorne ao início ou acesse sua carteira de processos.
        </p>

        <div className={styles.actions}>
          <Link href="/" className={styles.ctaPrimary}>
            ← Início
          </Link>
          <Link href="/processos" className={styles.ctaSecondary}>
            Ver processos
          </Link>
        </div>

        <p className={styles.footer}>
          Ponto Processual · Sistema de Monitoramento Judicial
        </p>
      </div>
    </div>
  );
}
