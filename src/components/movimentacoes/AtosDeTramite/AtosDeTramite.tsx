import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Movimentacao } from '@/types';
import styles from './AtosDeTramite.module.css';

/**
 * A CORRIDA DE TRÂMITE, colapsada numa linha.
 *
 * ## Por que
 *
 * Medido nos últimos 90 dias de uma conta real (673 movimentações): trâmite
 * **47%** e publicação **16%** — 63% do feed é "conclusos para despacho",
 * "recebidos os autos", "juntada de certidão", "Publicado Despacho em 06/08".
 * Cada um desses ocupava a mesma altura de uma sentença. Um dia de cartório
 * rende seis seguidos e sozinho empurra o dia anterior para fora da tela.
 *
 * Colapsados, o cartório inteiro cabe em ~34px.
 *
 * ## O que este componente recusa fazer
 *
 * **Esconder.** O resumo diz quantos são e de que tipo — "5 atos de trâmite ·
 * Juntada, Conclusão, Certidão" —, e o `<details>` abre com um clique. Um
 * colapso que não declara o conteúdo é um filtro secreto, e o feed já teve um:
 * até 09/09/2026 a API escondia `tramite` por padrão, sem nada na página
 * dizendo que havia linhas ocultas, e a tela parecia parada quatro dias atrás
 * enquanto o portal entregava movimentação de hora em hora.
 *
 * **Colapsar o que está dentro de um prazo.** Quem decide é
 * `colapsavelNaLista`: "Decorrido prazo do réu" é `tramite` pela categoria e é,
 * com o relógio correndo, a linha mais importante do dia.
 *
 * ## `<details>` nativo, sem JavaScript
 *
 * A tela é Server Component e o elemento faz exatamente isto sozinho — mesma
 * escolha do "mostrar mais" da timeline do processo e do inteiro teor do ato.
 */
export function AtosDeTramite({ itens, children, aberto = false }: {
  /**
   * Só a CATEGORIA e o TIPO são lidos — o resumo conta quantos são e nomeia o
   * que há lá dentro. O tipo frouxo é o que deixa a linha do tempo do processo
   * usar o mesmo bloco: ali os itens são `TimelineEvent`, não `Movimentacao`,
   * e converter cada um só para atravessar a fronteira de tipo seria montar
   * cinquenta objetos por página para ler dois campos.
   */
  itens: readonly Pick<Movimentacao, 'categoria' | 'tipo'>[];
  children: ReactNode;
  /**
   * Abre o bloco já expandido. É o que impede `?aberta=<id>` de apontar para
   * uma linha que está dentro do colapso: o painel renderizaria escondido, e a
   * URL compartilhável — a disciplina desta tela inteira — passaria a abrir
   * uma tela onde não se vê o que o link prometeu.
   */
  aberto?: boolean;
}) {
  return (
    <details className={styles.bloco} open={aberto || undefined}>
      <summary className={styles.resumo}>
        <ChevronRight size={14} aria-hidden="true" className={styles.seta} />
        <span className={styles.contagem}>{rotulo(itens)}</span>
        {/* Os tipos que estão lá dentro. Sem eles o colapso pede um clique de
            fé — e o que se esconde atrás de um clique de fé não se abre. */}
        {tiposDe(itens) && <span className={styles.tipos}>{tiposDe(itens)}</span>}
        <span className={styles.acao} aria-hidden="true">mostrar</span>
      </summary>
      <ol className={styles.lista}>{children}</ol>
    </details>
  );
}

/**
 * "5 atos de trâmite" · "3 publicações" · "8 atos de andamento".
 *
 * Os dois nomes existem porque as duas categorias são coisas diferentes:
 * `tramite` é o cartório movendo os autos, `publicacao` é o carimbo de que um
 * ato saiu no diário. Chamar as duas de "trâmite" seria mentir num rótulo cuja
 * única função é dizer o que há lá dentro.
 */
function rotulo(itens: readonly Pick<Movimentacao, 'categoria' | 'tipo'>[]): string {
  const n = itens.length;
  const publicacoes = itens.filter(m => m.categoria === 'publicacao').length;

  if (publicacoes === 0) return `${n} ${n === 1 ? 'ato' : 'atos'} de trâmite`;
  if (publicacoes === n) return `${n} ${n === 1 ? 'publicação' : 'publicações'}`;
  return `${n} atos de andamento`;
}

/**
 * Até três tipos distintos, na ordem em que aparecem.
 *
 * Três porque é o que cabe na linha a 390px sem quebrar — e porque a quarta
 * variedade de carimbo de cartório não muda a decisão de ninguém sobre abrir
 * ou não.
 */
function tiposDe(itens: readonly Pick<Movimentacao, 'categoria' | 'tipo'>[]): string {
  const vistos: string[] = [];
  for (const m of itens) {
    const tipo = m.tipo?.trim();
    if (tipo && !vistos.includes(tipo)) vistos.push(tipo);
    if (vistos.length === 3) break;
  }
  return vistos.join(', ');
}
