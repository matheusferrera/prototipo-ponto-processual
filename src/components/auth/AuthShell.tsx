import type { ReactNode } from 'react';
import styles from './AuthShell.module.css';

export interface AuthFeature {
  icon: string;
  title: string;
  desc: string;
}

interface AuthShellProps {
  eyebrow: string;
  headline: ReactNode;
  description: string;
  features: AuthFeature[];
  children: ReactNode;
}

/**
 * Casca visual compartilhada por /login e /cadastro: painel de marca (verde,
 * some no celular) + painel de conteúdo (o formulário de cada página).
 * Mobile-first — base é a coluna única do celular, o split de 45/55 só liga
 * a partir de `md`.
 */
export function AuthShell({ eyebrow, headline, description, features, children }: AuthShellProps) {
  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.brandRow}>
          <span className={styles.brandMark} />
          <span className={styles.brandName}>Ponto Processual</span>
        </div>

        <div className={styles.pitch}>
          <div className={styles.eyebrow}>{eyebrow}</div>
          <div className={styles.headline}>{headline}</div>
          <div className={styles.description}>{description}</div>
        </div>

        <div className={styles.features}>
          {features.map((f, i) => (
            <div key={i} className={styles.feature}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <div>
                <div className={styles.featureTitle}>{f.title}</div>
                <div className={styles.featureDesc}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.ornamentA} aria-hidden="true" />
        <div className={styles.ornamentB} aria-hidden="true" />
      </div>

      <div className={styles.right}>
        <div className={styles.mobileBrand} aria-hidden="true">
          <span className={styles.mobileBrandMark} />
          <span>Ponto Processual</span>
        </div>

        <div className={styles.formPanel}>{children}</div>
      </div>
    </div>
  );
}
