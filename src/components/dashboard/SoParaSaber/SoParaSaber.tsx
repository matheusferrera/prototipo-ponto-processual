import Link from 'next/link';
import type { Movimentacao } from '@/types';
import type { GrupoDoProcesso } from '@/lib/novidades';
import styles from './SoParaSaber.module.css';

export function SoParaSaber({ processos, cartorio }: { processos: GrupoDoProcesso<Movimentacao>[]; cartorio: Movimentacao[] }) {
  const total = processos.reduce((soma, grupo) => soma + grupo.atos.length, 0) + cartorio.length;
  const tipos = [...cartorio.reduce((mapa, item) => mapa.set(item.tipo, (mapa.get(item.tipo) ?? 0) + 1), new Map<string, number>())];
  return (
    <section className={styles.raiz}>
      <header><h2>Só para saber</h2><b>{total}</b></header>
      {processos.slice(0, 5).map(grupo => {
        const ato = grupo.atos[0]!;
        return (
          <Link key={grupo.cnj} href={`/movimentacoes/${ato.id}`} className={styles.linha}>
            <strong>{ato.ia.resumo || ato.detail}</strong>
            <span>{ato.tribunal} · {grupo.cnj}</span>
          </Link>
        );
      })}
      {cartorio.length > 0 && (
        <details>
          <summary><span>Só cartório</span><b>{cartorio.length}</b></summary>
          <ul>{tipos.map(([tipo, n]) => <li key={tipo}><span>{tipo}</span><b>{n}</b></li>)}</ul>
        </details>
      )}
      {total === 0 && <p>Nenhuma novidade apenas informativa.</p>}
    </section>
  );
}
