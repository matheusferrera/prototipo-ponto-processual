import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Movimentacao } from '@/types';
import { clienteMovimentacao, descricaoMovimentacao, horaDoAto, quandoComHora } from '@/lib/movimentacao';
import { nomeLegivel } from '@/lib/processo-apresentacao';
import styles from './BlocoDeCartorio.module.css';

/**
 * O CARTÓRIO RECOLHIDO — "2 atos de cartório · Expedição, comunicação · mostrar".
 *
 * A mesma decisão de `AtosDeTramite` (63% do feed é carimbo de cartório, e ele
 * recolhe sem sumir: o resumo diz quantos são e de que tipo), com o desenho da
 * tela de 17/09/2026 e o vocabulário dela — "cartório", que é o nome curto da
 * categoria em toda a tela.
 *
 * `<details>` nativo: funciona sem JavaScript e serve tanto à página
 * (Server Component) quanto ao "carregar dias anteriores" (cliente).
 *
 * `comProcesso` acrescenta de quem é cada linha — na lista de todas, onde o
 * bloco junta atos de processos diferentes; dentro do cartão de um processo,
 * isso seria repetir o cabeçalho.
 */
export function BlocoDeCartorio({
  itens,
  comProcesso = false,
  variante = 'lista',
}: {
  itens: readonly Movimentacao[];
  comProcesso?: boolean;
  /** `grupo` dentro do cartão de um processo; `lista` na lista de todas. */
  variante?: 'lista' | 'grupo';
}) {
  return (
    <details className={styles.bloco} data-variante={variante}>
      <summary className={styles.resumo}>
        <ChevronRight size={16} aria-hidden="true" className={styles.seta} />
        {variante === 'lista' && <span className={styles.marca}>Cartório</span>}
        <span className={styles.contagem}>{rotulo(itens)}</span>
        <span className={styles.tipos}>{tiposDe(itens)}</span>
        <span className={styles.acao} aria-hidden="true">
          <span className={styles.mostrar}>mostrar</span>
          <span className={styles.recolher}>recolher</span>
        </span>
      </summary>
      <ul className={styles.lista}>
        {itens.map(m => (
          <li key={m.id}>
            <Link href={`/movimentacoes/${encodeURIComponent(m.id)}`} className={styles.item}>
              <span className={styles.itemTexto}>{descricaoMovimentacao(m)}</span>
              {comProcesso
                ? <span className={styles.itemMeta}>{nomeLegivel(clienteMovimentacao(m))} · {m.tribunal} · {horaDoAto(m)}</span>
                : m.quandoCurto && <span className={styles.itemQuando}>{quandoComHora(m)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * "4 atos" na lista (a etiqueta "Cartório" já está ao lado) · "2 atos de
 * cartório" dentro do processo · "3 publicações" quando é só isso — publicação
 * é o carimbo de que um ato saiu no diário, e chamá-la de cartório seria mentir
 * no rótulo cuja única função é dizer o que há lá dentro.
 */
function rotulo(itens: readonly Movimentacao[]): string {
  const n = itens.length;
  if (itens.every(m => m.categoria === 'publicacao')) return `${n} ${n === 1 ? 'publicação' : 'publicações'}`;
  return `${n} ${n === 1 ? 'ato' : 'atos'} de cartório`;
}

/** Até três tipos distintos, na ordem em que aparecem — o que cabe a 390px. */
function tiposDe(itens: readonly Movimentacao[]): string {
  const vistos: string[] = [];
  for (const m of itens) {
    const tipo = m.tipo?.trim();
    if (tipo && !vistos.includes(tipo)) vistos.push(tipo);
    if (vistos.length === 3) break;
  }
  return vistos.join(', ');
}
