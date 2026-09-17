import Link from 'next/link';
import { ChevronRight, RotateCcw, Search } from 'lucide-react';
import type { CategoriaMovimentacao } from '@/types';
import { CATEGORIAS_MOVIMENTACAO } from '@/lib/categoria-movimentacao';
import styles from './ProcessoMovementFilters.module.css';

export interface FiltrosDaLista {
  q?: string;
  from?: string;
  to?: string;
  sort: 'asc' | 'desc';
  categorias: CategoriaMovimentacao[];
  /** O ano do mapa, preservado ao trocar de categoria. */
  ano?: string;
}

/**
 * O filtro da lista de movimentações — **uma faixa de pílulas**, e nada mais
 * no caminho.
 *
 * ## Por que ele encolheu
 *
 * A versão anterior era um painel com dez raios diferentes de zero num arquivo
 * só (3, 4, 4, 5, 5, 5, 5, 5, 6 e 8px, contra o `--radius: 0` que o sistema
 * declara), sete usos de `var(--ink-3, #68665f)` pintando texto — um token que
 * mede 4,32:1 e um fallback que não é cor desta paleta —, um `#a32323` fora do
 * `--alert` do sistema e uma `box-shadow` num sistema que não tem elevação.
 * Ele também exigia dois cliques para a única coisa que se faz aqui noventa
 * por cento das vezes: **cortar o cartório**.
 *
 * Agora a categoria é um clique numa pílula, e busca, período e ordenação —
 * que continuam existindo na URL — ficam atrás de uma abertura.
 *
 * ## Server Component, `<form method="get">`, zero JavaScript
 *
 * As pílulas são `<Link>` e o formulário é nativo: ele navega para o `action`
 * com os campos na query string, que é exatamente a URL que esta tela usa como
 * fonte da verdade. Os `<input type="hidden">` carregam o que não está no
 * formulário (`cat`, `ano`) para que abrir a busca não apague o filtro de
 * categoria nem o ano do mapa.
 *
 * ## As pílulas ALTERNAM, uma a uma
 *
 * `?cat=` aceita várias categorias e continua aceitando: clicar numa pílula
 * acesa a apaga, clicar numa apagada a acende. "Tudo que importa" é a ausência
 * de `cat` — e ela traz o acervo INTEIRO, cartório incluído; quem cuida do
 * volume é o colapso de trâmite da lista, que declara o que engaveta em vez de
 * esconder.
 */
export function ProcessoMovementFilters({ basePath, filtros, total }: {
  basePath: string;
  filtros: FiltrosDaLista;
  /** Quantas movimentações o recorte atual encontrou. */
  total: number;
}) {
  const { categorias, q, from, to, sort, ano } = filtros;

  /** A URL de um recorte, preservando o que não está sendo mexido. */
  const href = (mudanca: Partial<FiltrosDaLista>) => {
    const proximo = { ...filtros, ...mudanca };
    const params = new URLSearchParams();
    if (proximo.categorias.length) params.set('cat', proximo.categorias.join(','));
    if (proximo.q?.trim()) params.set('q', proximo.q.trim());
    if (proximo.from) params.set('from', proximo.from);
    if (proximo.to) params.set('to', proximo.to);
    if (proximo.sort === 'asc') params.set('sort', 'asc');
    if (proximo.ano) params.set('ano', proximo.ano);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const temRecorte = categorias.length > 0 || Boolean(q) || Boolean(from) || Boolean(to) || sort === 'asc';

  return (
    <div className={styles.raiz}>
      <div className={styles.pilulas} role="group" aria-label="Filtrar por categoria">
        <Link
          href={href({ categorias: [] })}
          className={categorias.length === 0 ? `${styles.pilula} ${styles.ligada}` : styles.pilula}
          aria-current={categorias.length === 0 ? true : undefined}
        >
          Tudo que importa
        </Link>
        {CATEGORIAS_MOVIMENTACAO.map(categoria => {
          const ligada = categorias.includes(categoria.value);
          return (
            <Link
              key={categoria.value}
              href={href({
                categorias: ligada
                  ? categorias.filter(c => c !== categoria.value)
                  : [...categorias, categoria.value],
              })}
              className={ligada ? `${styles.pilula} ${styles.ligada}` : styles.pilula}
              aria-current={ligada ? true : undefined}
            >
              {categoria.label}
            </Link>
          );
        })}
      </div>

      <details className={styles.busca}>
        <summary className={styles.buscaResumo}>
          <ChevronRight aria-hidden="true" size={13} strokeWidth={2} className={styles.seta} />
          <Search aria-hidden="true" size={13} strokeWidth={2} />
          Buscar, período e ordem
          {(q || from || to || sort === 'asc') && <span className={styles.ativo} aria-hidden="true" />}
        </summary>

        {/* GET nativo: a submissão vira a query string desta mesma tela. */}
        <form className={styles.formulario} action={basePath} method="get">
          {categorias.length > 0 && <input type="hidden" name="cat" value={categorias.join(',')} />}
          {ano && <input type="hidden" name="ano" value={ano} />}

          <label className={styles.campo}>
            <span className={styles.campoRotulo}>Buscar na descrição</span>
            <input className={styles.entrada} type="search" name="q" defaultValue={q ?? ''} placeholder="sentença, juntada, penhora…" />
          </label>
          <label className={styles.campo}>
            <span className={styles.campoRotulo}>De</span>
            <input className={styles.entrada} type="date" name="from" defaultValue={from ?? ''} />
          </label>
          <label className={styles.campo}>
            <span className={styles.campoRotulo}>Até</span>
            <input className={styles.entrada} type="date" name="to" defaultValue={to ?? ''} />
          </label>
          <label className={styles.campo}>
            <span className={styles.campoRotulo}>Ordem</span>
            <select className={styles.entrada} name="sort" defaultValue={sort}>
              <option value="desc">Mais recentes primeiro</option>
              <option value="asc">Mais antigas primeiro</option>
            </select>
          </label>

          <div className={styles.acoes}>
            <button type="submit" className={`${styles.botao} ${styles.botaoForte}`}>Aplicar</button>
            {temRecorte && (
              <Link href={basePath} className={styles.botao}>
                <RotateCcw aria-hidden="true" size={14} strokeWidth={2} />
                Limpar tudo
              </Link>
            )}
          </div>
        </form>
      </details>

      <p className={styles.contagem} role="status">
        {total} {total === 1 ? 'movimentação' : 'movimentações'}
        {temRecorte ? ' neste recorte' : ' neste processo'}
        {sort === 'asc' ? ' · do mais antigo ao mais recente' : ''}
      </p>
    </div>
  );
}
