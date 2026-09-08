import Link from 'next/link';
import { BellRing, CircleAlert, ChevronRight } from 'lucide-react';
import type { Processo } from '@/types';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { tribunalTagLabel } from '@/lib/tribunals';
import { nomeDoCaso, rotuloDoPrazo, tempoAtras, tomDoPrazo } from '@/lib/processo-apresentacao';
import styles from './ProcessList.module.css';

interface ProcessListProps {
  processos: Processo[];
}

/**
 * A carteira como lista de casos: cada linha tem um nome (as partes), o que
 * aconteceu por último e, quando existe, o próximo prazo. A linha inteira é
 * um único link — nada de expandir, nada de rolagem horizontal.
 */
export function ProcessList({ processos }: ProcessListProps) {
  return (
    <ol className={styles.list} aria-label="Processos da carteira">
      {processos.map(processo => (
        <li key={processo.id}>
          <ProcessListRow processo={processo} />
        </li>
      ))}
    </ol>
  );
}

function ProcessListRow({ processo }: { processo: Processo }) {
  const nome = nomeDoCaso(processo);
  const prazo = processo.proximoPrazo;
  const quando = tempoAtras(processo.lastMovAt);
  const rowClass = [
    styles.row,
    processo.state === 'signal' ? styles.rowSignal : '',
    processo.state === 'alert' ? styles.rowAlert : '',
  ].join(' ');

  return (
    <Link href={`/processos/${encodeURIComponent(processo.cnj)}`} className={rowClass}>
      <div className={styles.main}>
        <p className={styles.title}>
          <span>{nome.ativo}</span>
          {nome.passivo && (
            <>
              <span className={styles.versus} aria-hidden="true"> × </span>
              <span className="sr-only"> contra </span>
              <span>{nome.passivo}</span>
            </>
          )}
          {nome.outras > 0 && <span className={styles.outras}> +{nome.outras}</span>}
        </p>

        <p className={styles.line2}>
          {processo.state === 'signal' && (
            <span className={`${styles.badge} ${styles.badgeSignal}`}>
              <BellRing aria-hidden="true" />
              Nova
            </span>
          )}
          {processo.state === 'alert' && (
            <span className={`${styles.badge} ${styles.badgeAlert}`} title={processo.syncError ?? undefined}>
              <CircleAlert aria-hidden="true" />
              Erro na sincronização
            </span>
          )}
          <span className={styles.mov} title={processo.ultimaMov}>{processo.ultimaMov}</span>
          {quando && <span className={styles.quando}>{quando}</span>}
        </p>
      </div>

      <div className={styles.aside}>
        <span className={styles.ident}>
          <TribTag label={tribunalTagLabel(processo.tribunal, processo.grau)} />
          <span className={styles.cnj}>{processo.cnj}</span>
          <ChevronRight className={styles.chevron} aria-hidden="true" />
        </span>
        {processo.orgaoJulgador && processo.orgaoJulgador !== '—' && (
          <span className={styles.orgao} title={processo.orgaoJulgador}>{processo.orgaoJulgador}</span>
        )}
        {prazo && (
          <span
            className={`${styles.prazo} ${styles[`prazo_${tomDoPrazo(prazo)}`]}`}
            title={`${prazo.tipo}${prazo.parte ? ` — ${prazo.parte}` : ''}`}
          >
            {rotuloDoPrazo(prazo)}
            {processo.prazosAbertos > 1 && <span className={styles.prazoExtra}> +{processo.prazosAbertos - 1}</span>}
          </span>
        )}
      </div>
    </Link>
  );
}
