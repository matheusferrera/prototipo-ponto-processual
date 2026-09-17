import { Fragment } from 'react';
import type { MovimentacaoGroup } from '@/types';
import { agruparTramite } from '@/lib/fio-do-prazo';
import { BlocoDeCartorio } from '../BlocoDeCartorio/BlocoDeCartorio';
import { LinhaDaLista } from './LinhaDaLista';
import styles from './ListaCompleta.module.css';

/**
 * Os dias da lista de todas — cabeçalho que gruda, as linhas, o cartório
 * recolhido e o "Você viu até aqui".
 *
 * Sem hooks: a página o renderiza no servidor e o "carregar dias anteriores"
 * no cliente, e os dois precisam desenhar o MESMO dia do mesmo jeito.
 */
export function GruposDoDia({
  grupos,
  divisorAntesDe,
  rotuloDivisor,
  continuaChave,
}: {
  grupos: readonly MovimentacaoGroup[];
  /** A linha antes da qual cai "Você viu até aqui" — ver `posicaoDoDivisor`. */
  divisorAntesDe: string | null;
  rotuloDivisor: string;
  /**
   * A chave do último dia já na tela. A página 2 costuma começar no meio do
   * dia em que a 1 terminou; repetir o cabeçalho ali partiria um dia em dois.
   */
  continuaChave?: string | null;
}) {
  return grupos.map((grupo, indice) => {
    const continua = indice === 0 && Boolean(continuaChave) && grupo.chave === continuaChave;
    const n = grupo.items.length;

    return (
      <section key={grupo.chave ?? `${grupo.date}-${grupo.day}`} className={styles.dia} aria-label={`${grupo.date} ${grupo.day}`}>
        {!continua && (
          <h2 className={styles.cabecalhoDia}>
            <span className={styles.diaRotulo}>{grupo.date}</span>
            <span className={styles.diaData}>{grupo.day}</span>
            <span className={styles.diaConta}>{n} {n === 1 ? 'movimentação' : 'movimentações'}</span>
          </h2>
        )}
        <ul className={styles.linhas}>
          {agruparTramite(grupo.items).map(bloco => {
            const ids = bloco.tipo === 'linha' ? [bloco.item.id] : bloco.itens.map(m => m.id);
            const chave = ids[0]!;
            return (
              <Fragment key={chave}>
                {divisorAntesDe && ids.includes(divisorAntesDe) && (
                  <li role="separator" className={styles.divisor}>
                    <span aria-hidden="true" className={styles.divisorFio} />
                    <span>{rotuloDivisor}</span>
                    <span aria-hidden="true" className={styles.divisorFio} />
                  </li>
                )}
                {bloco.tipo === 'linha'
                  ? <LinhaDaLista m={bloco.item} />
                  : <li className={styles.cartorio}><BlocoDeCartorio itens={bloco.itens} comProcesso /></li>}
              </Fragment>
            );
          })}
        </ul>
      </section>
    );
  });
}
