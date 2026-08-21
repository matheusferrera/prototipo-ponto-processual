import styles from './TribunalTicker.module.css';

interface TribunalTickerProps {
  /** Sistemas e tribunais a exibir, na ordem em que devem passar. */
  itens: readonly string[];
}

/**
 * Fita contínua na posição do eyebrow do hero, no lugar da linha estática
 * "PJe · e-SAJ · Projudi · CPE · DJEN".
 *
 * A lista é renderizada duas vezes e a trilha desliza até -50%: quando a
 * primeira cópia termina de sair, a segunda está exatamente onde a primeira
 * começou, e a animação reinicia sem que se veja a emenda. É a mesma mecânica
 * do marquee da seção "Cobrimos o país inteiro" (`.marquee*` em
 * page.module.css) — ver a nota em `.item` no CSS para o ajuste do respiro,
 * que aqui fecha a emenda que lá dá um pulinho a cada volta.
 *
 * A segunda cópia é `aria-hidden`: ela existe só para o olho, e sem isso o
 * leitor de tela anunciaria a lista inteira duas vezes seguidas.
 */
export function TribunalTicker({ itens }: TribunalTickerProps) {
  const copia = (aria: boolean) => (
    <ul className={styles.copia} aria-hidden={aria || undefined}>
      {itens.map((t, i) => (
        <li key={`${t}-${i}`} className={styles.item}>
          {t}
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.ticker}>
      <span className={styles.mark} aria-hidden="true" />
      <div className={styles.viewport}>
        <div className={styles.track}>
          {copia(false)}
          {copia(true)}
        </div>
      </div>
    </div>
  );
}
