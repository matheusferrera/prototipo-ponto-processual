import Link from 'next/link';
import styles from './SeletorDeVista.module.css';

/**
 * As duas leituras do mesmo acervo.
 *
 * **Não é um filtro, e por isso não mora com os filtros.** Um filtro estreita a
 * mesma lista; isto troca a PERGUNTA:
 *
 * | vista | pergunta | tamanho |
 * |---|---|---|
 * | `''` (feed) | o que chegou | 18.485 movimentações, 370 páginas |
 * | `fios` | o que mudou nos casos em que tenho prazo correndo | 11 cartões |
 *
 * Os números são da mesma conta, medidos em 15/09/2026. É a diferença de
 * escala que justifica as duas existirem.
 *
 * **Server Component**: cada opção é um `<Link>` que troca `?vista=` — o botão
 * voltar alterna, o endereço é compartilhável e nada disso custa JavaScript. A
 * mesma disciplina de todo estado desta tela.
 */
export function SeletorDeVista({
  vista,
  href,
  emCurso,
  naoVistas,
}: {
  vista: '' | 'fios';
  /** Monta o href da vista, preservando o resto da URL. */
  href: (proxima: '' | 'fios') => string;
  /** Prazos em curso. Omitido quando ainda não se sabe. */
  emCurso?: number;
  /** Movimentações não vistas. */
  naoVistas?: number;
}) {
  return (
    <div className={styles.seletor} role="group" aria-label="Como ler as movimentações">
      <Link
        href={href('fios')}
        className={styles.aba}
        data-ativa={vista === 'fios' || undefined}
        aria-current={vista === 'fios' ? 'page' : undefined}
        scroll={false}
      >
        Nos meus prazos
        {/* O contador só aparece quando há o que contar: "Nos meus prazos 0"
            ocuparia a mesma largura para dizer que não há nada, e a própria
            tela já diz isso melhor quando alguém entra nela. */}
        {emCurso ? <span className={styles.conta}>{emCurso > 99 ? '99+' : emCurso}</span> : null}
      </Link>

      <Link
        href={href('')}
        className={styles.aba}
        data-ativa={vista === '' || undefined}
        aria-current={vista === '' ? 'page' : undefined}
        scroll={false}
      >
        Tudo
        {/* `99+` acima de 99 — o mesmo teto da `BarraInferior`, e aqui ele não
            é cosmético: conta que nunca marcou nada como vista tem TUDO como
            não visto, e a de dev mostrava "18485" numa aba de 44px, estourando
            a linha no celular. O número exato dessa grandeza também não é
            informação — o divisor logo abaixo escreve a frase inteira. */}
        {naoVistas ? <span className={styles.conta} data-novo="">{naoVistas > 99 ? '99+' : naoVistas}</span> : null}
      </Link>
    </div>
  );
}
