import type { ReactNode } from 'react';
import styles from './SecaoProcesso.module.css';

/**
 * O cabeçalho de uma seção do processo — `§ O QUE CORRE AGORA ──── 1 prazo aberto`.
 *
 * A tela do processo virou **uma rolagem só**, na ordem em que o advogado
 * pergunta, e o que separa um assunto do seguinte é este filete. Sem abas não
 * há mais um lugar onde a estrutura da página esteja escrita; ela passa a ser
 * a sequência dos títulos, e por isso eles têm de ser legíveis de relance —
 * mono, caixa alta, na cor da marca, com a régua levando o olho até a nota.
 *
 * **A nota aparece a 390px.** A versão anterior deste cabeçalho escondia o
 * caption abaixo de `min-width: 391px` — ou seja, num iPhone de 390px, que é o
 * alvo declarado do projeto, a legenda nunca era exibida. Aqui ela cabe na
 * calha da direita com `max-width` e volta a ser uma linha só no desktop.
 */
export function SecaoProcesso({ id, titulo, nota, children, className }: {
  /** Id do `<h2>`, para o `aria-labelledby` da seção. */
  id: string;
  /** Com o `§` — ele é parte do rótulo, não decoração do CSS. */
  titulo: string;
  /** O número que qualifica a seção: "147 movimentações", "consultado há 3 h". */
  nota?: string | null;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ? `${styles.secao} ${className}` : styles.secao} aria-labelledby={id}>
      <div className={styles.cabecalho}>
        <h2 id={id} className={styles.titulo}>{titulo}</h2>
        <div className={styles.regua} aria-hidden="true" />
        {nota && <span className={styles.nota}>{nota}</span>}
      </div>
      {children}
    </section>
  );
}
