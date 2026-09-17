import type { TomDaSituacao } from '@/lib/situacao-do-ato';
import styles from './Etiqueta.module.css';

/**
 * A etiqueta de situação — "Com você · 22 dias", "Prazo da outra parte".
 *
 * Uma só para a tela inteira (aba Novas, lista de Todas), e a cor sai do TOM,
 * nunca de quem a usa: é o que garante que o mesmo prazo tenha a mesma cor em
 * todo lugar. A régua dos tons mora em `situacao-do-ato.ts`.
 */
export function Etiqueta({ rotulo, curto, tom }: { rotulo: string; curto?: string; tom: TomDaSituacao }) {
  if (!curto || curto === rotulo) return <span className={styles.etiqueta} data-tom={tom}>{rotulo}</span>;
  /* Com `curto`, a tabela do desktop mostra a forma curta e o celular a longa;
     o leitor de tela ouve sempre a longa (o `title` a repete no hover). */
  return (
    <span className={styles.etiqueta} data-tom={tom} data-compacta="" title={rotulo}>
      <span className={styles.longo}>{rotulo}</span>
      <span className={styles.curto} aria-hidden="true">{curto}</span>
    </span>
  );
}
