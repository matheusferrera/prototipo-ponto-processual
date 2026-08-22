'use client';

import { Loader2 } from 'lucide-react';
import type { ConflitoOab } from '@/lib/monitorar-oab';
import styles from './ConfirmarTrocaOab.module.css';

/**
 * A pergunta que faltava no fluxo inteiro: **esta conta já monitora outra OAB.**
 *
 * Aparece sempre que o servidor recusa ligar uma OAB nova por cima de outra
 * (`409 OAB_JA_MONITORADA`). Antes desta tela, o caminho "cadastrar uma OAB
 * nova sobre um e-mail que já existe" trocava a OAB da conta em silêncio e
 * empilhava os dois acervos no mesmo painel, sem nada na tela dizendo o que
 * tinha acontecido.
 *
 * Ela nomeia as duas OABs e diz o destino do acervo — arquivado, não apagado —
 * porque é isso que separa uma escolha de um susto. E oferece as duas saídas:
 * quem só queria consultar mantém o que tem; quem realmente trocou de
 * inscrição troca.
 */
export function ConfirmarTrocaOab({
  conflito,
  trocando,
  erro,
  onTrocar,
  onManter,
  rotuloManter = 'Manter e ir ao painel',
}: {
  conflito: ConflitoOab;
  trocando: boolean;
  erro?: string;
  onTrocar: () => void;
  onManter: () => void;
  /** O que "não trocar" significa nesta tela — nem sempre é ir ao painel. */
  rotuloManter?: string;
}) {
  const atual = `${conflito.atual.numero}/${conflito.atual.uf}`;
  const pedida = `${conflito.pedida.numero}/${conflito.pedida.uf}`;

  return (
    <div className={styles.painel} role="alert">
      <div className={styles.titulo}>Esta conta já monitora a OAB {atual}</div>
      <p className={styles.texto}>
        Uma conta acompanha uma OAB por vez. Se você trocar para a{' '}
        <span className={styles.oab}>{pedida}</span>, os processos da{' '}
        <span className={styles.oab}>{atual}</span> saem do painel e ficam guardados — nada é
        apagado, e eles voltam inteiros se você religar essa OAB.
      </p>
      <div className={styles.acoes}>
        <button type="button" className={styles.btnTrocar} onClick={onTrocar} disabled={trocando}>
          {trocando && <Loader2 size={14} className={styles.girando} aria-hidden="true" />}
          {trocando ? 'Trocando…' : `Trocar para ${pedida}`}
        </button>
        <button type="button" className={styles.btnManter} onClick={onManter} disabled={trocando}>
          {rotuloManter}
        </button>
      </div>
      {erro && <p className={styles.erro}>{erro}</p>}
    </div>
  );
}
