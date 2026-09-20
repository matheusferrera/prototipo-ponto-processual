import Link from 'next/link';
import type { Prazo } from '@/types';
import { quandoPrazo } from '@/lib/prazo-apresentacao';
import styles from './MaisAdiante.module.css';

export function MaisAdiante({ prazos }: { prazos: Prazo[] }) {
  return (
    <section id="maisAdiante" className={styles.raiz}>
      <header><h2>Mais adiante</h2><b>{prazos.length}</b></header>
      {prazos.length === 0 ? <p className={styles.vazio}>Nenhum prazo ficou para depois.</p> : (
        <ul>
          {prazos.slice(0, 8).map(p => (
            <li key={p.id}>
              <Link href={p.movementId ? `/movimentacoes/${p.movementId}` : '/prazos'}>
                <strong>{p.ato?.ia.peca || p.tipo}</strong>
                <span>{p.deQuem === 'parteContraria' ? 'Prazo da outra parte' : quandoPrazo(p.diasRestantes)}</span>
                <small>{p.tribunal} · {p.cnj}</small>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {prazos.length > 8 && <Link href="/prazos" className={styles.todos}>Mais {prazos.length - 8} na pauta ›</Link>}
    </section>
  );
}
