import Link from 'next/link';
import { CATEGORIAS_MOVIMENTACAO } from '@/lib/categoria-movimentacao';
import type { CategoriaMovimentacao } from '@/types';
import styles from './CategoriaFilter.module.css';

interface CategoriaFilterProps {
  /** As categorias marcadas hoje. Vazio = o padrão do backend. */
  ativas: readonly CategoriaMovimentacao[];
  /** Monta o href com a seleção nova — a página decide como serializar. */
  href: (proximas: CategoriaMovimentacao[]) => string;
}

/**
 * Filtro por categoria da movimentação.
 *
 * **Server component de propósito**: cada opção é um `<Link>` que alterna a
 * categoria na URL, então o filtro funciona sem JavaScript, sobrevive ao
 * recarregar e pode ser compartilhado por link — a mesma disciplina do resto
 * das telas, onde a URL é a fonte da verdade.
 *
 * A primeira opção, "Tudo que importa", não é uma categoria: é a ausência de
 * filtro, e é o estado em que a API esconde o trâmite de cartório. Medido em
 * 05/09/2026: 43% da movimentação pública é "Juntada de certidão", "Recebidos
 * os autos" e "Conclusos" — treze de cada vinte linhas da página.
 */
export function CategoriaFilter({ ativas, href }: CategoriaFilterProps) {
  const nenhuma = ativas.length === 0;

  return (
    <div className={styles.filtro} role="group" aria-label="Filtrar por categoria">
      <Link
        href={href([])}
        className={styles.pill}
        data-ativo={nenhuma || undefined}
        aria-current={nenhuma ? 'true' : undefined}
        scroll={false}
      >
        Tudo que importa
      </Link>

      {CATEGORIAS_MOVIMENTACAO.map(categoria => {
        const ativa = ativas.includes(categoria.value);
        // Clicar numa categoria ativa a remove — é o que faz cada pill ser um
        // interruptor em vez de um rádio, e o que permite "decisões E prazos".
        const proximas = ativa
          ? ativas.filter(item => item !== categoria.value)
          : [...ativas, categoria.value];

        return (
          <Link
            key={categoria.value}
            href={href(proximas)}
            className={styles.pill}
            data-ativo={ativa || undefined}
            aria-pressed={ativa}
            scroll={false}
          >
            {categoria.label}
          </Link>
        );
      })}
    </div>
  );
}
