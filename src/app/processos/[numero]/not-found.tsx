import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <AppLayout active="Processos">
      <div className={styles.page}>
        <div className={styles.inner}>
          <span className={styles.stamp}>§ NREG · 404</span>

          <div className={styles.code}>404</div>

          <div className={styles.rule} />

          <h1 className={styles.title}>Autos não localizados</h1>
          <p className={styles.body}>
            O número CNJ informado não consta na carteira de processos
            monitorados. Verifique se o número está correto ou retorne
            à listagem de processos.
          </p>

          <div className={styles.actions}>
            <Link href="/processos" className={styles.cta}>
              ← Voltar à carteira
            </Link>
          </div>

          <p className={styles.footer}>
            Ponto Processual · Sistema de Monitoramento Judicial
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
