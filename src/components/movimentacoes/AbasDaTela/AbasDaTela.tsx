import Link from 'next/link';
import styles from './AbasDaTela.module.css';

export type VistaDasMovimentacoes = 'novas' | 'fios' | 'todas';

/**
 * AS TRÊS PERGUNTAS da tela — Todas · Novas · Com prazo.
 *
 * | aba | pergunta |
 * |---|---|
 * | Todas (padrão) | o histórico inteiro, com busca e filtro |
 * | Novas | o que chegou desde a última vez, e o que disso é comigo |
 * | Com prazo | o que aconteceu nos casos em que tenho prazo correndo |
 *
 * **Não é filtro**, e por isso não mora com os filtros: cada aba troca a
 * pergunta. Server Component — cada opção é um `<Link>`, então o voltar
 * alterna, o endereço é compartilhável e nada disso custa JavaScript.
 *
 * `variante` muda só o desenho: no celular as três dividem a largura, logo
 * abaixo do título; no desktop ficam à esquerda, com a frase das novas ao lado.
 */
export function AbasDaTela({
  vista,
  href,
  novas,
  emCurso,
  variante,
}: {
  vista: VistaDasMovimentacoes;
  href: (proxima: VistaDasMovimentacoes) => string;
  /** Movimentações não vistas. */
  novas: number;
  /** Prazos em curso. */
  emCurso: number;
  variante: 'celular' | 'desktop';
}) {
  /* Todas primeiro — é a aba que abre a tela (pedido do dono do produto em
     17/09/2026). */
  const abas: { chave: VistaDasMovimentacoes; rotulo: string; conta: number; tom?: 'novo' }[] = [
    { chave: 'todas', rotulo: 'Todas', conta: 0 },
    { chave: 'novas', rotulo: 'Novas', conta: novas, tom: 'novo' },
    { chave: 'fios', rotulo: 'Com prazo', conta: emCurso },
  ];

  return (
    <nav className={styles.abas} data-variante={variante} aria-label="O que ver">
      {abas.map(aba => {
        const atual = aba.chave === vista;
        return (
          <Link
            key={aba.chave}
            href={href(aba.chave)}
            scroll={false}
            className={styles.aba}
            aria-current={atual ? 'page' : undefined}
          >
            {aba.rotulo}
            {/* O número só aparece quando há o que contar: "Todas 0" ocuparia
                a largura para não dizer nada. `99+` pelo mesmo teto da barra
                de baixo — o número exato dessa grandeza não é informação. */}
            {aba.conta > 0 && (
              <span className={styles.conta} data-tom={aba.tom}>
                {aba.conta > 99 ? '99+' : aba.conta}
                <span className="sr-only">{aba.chave === 'novas' ? ' novas' : ' em curso'}</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
