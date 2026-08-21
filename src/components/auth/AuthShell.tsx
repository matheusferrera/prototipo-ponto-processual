import type { ReactNode } from 'react';
import Link from 'next/link';
import { FrameGrid } from '@/components/ui/FrameGrid/FrameGrid';
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
  /** Lista padrão de benefícios do painel de marca. Ignorada quando vem `painel`. */
  features?: AuthFeature[];
  /**
   * Substitui o bloco de benefícios por conteúdo próprio. É o que permite ao
   * /cadastro continuar a conversa da busca por OAB (nome, contagem de
   * processos, tribunais) em vez de repetir o discurso genérico para quem
   * acabou de ver os próprios dados.
   */
  painel?: ReactNode;
  children: ReactNode;
}

/**
 * Casca visual compartilhada por /login e /cadastro: painel de marca (verde,
 * some no celular) + painel de conteúdo (o formulário de cada página).
 * Mobile-first — base é a coluna única do celular, o split de 45/55 só liga
 * a partir de `md`.
 */
export function AuthShell({ eyebrow, headline, description, features, painel, children }: AuthShellProps) {
  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <Link href="/" className={styles.brandRow}>
          <span className={styles.brandMark} />
          <span className={styles.brandName}>Ponto Processual</span>
        </Link>

        <div className={styles.pitch}>
          <div className={styles.eyebrow}>{eyebrow}</div>
          <div className={styles.headline}>{headline}</div>
          <div className={styles.description}>{description}</div>
        </div>

        {painel ?? (
          <div className={styles.features}>
            {(features ?? []).map((f, i) => (
              <div key={i} className={styles.feature}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <div>
                  <div className={styles.featureTitle}>{f.title}</div>
                  <div className={styles.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mesma malha de quadros do hero da landing, na variante sem scroll:
            aqui não há percurso para empurrar o desenho, então o padrão de
            acesas respira sozinho e só o mouse desloca. Substitui os dois
            ornamentos estáticos (um quadrado de borda grossa e um de fio)
            que eram justamente o vocabulário de onde a malha saiu. */}
        <FrameGrid variant="idle" cols={4} rows={4} />
      </div>

      <div className={styles.right}>
        <Link href="/" className={styles.mobileBrand}>
          <span className={styles.mobileBrandMark} />
          <span>Ponto Processual</span>
        </Link>

        <div className={styles.formPanel}>{children}</div>
      </div>
    </div>
  );
}
