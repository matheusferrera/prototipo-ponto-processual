import Link from 'next/link';
import { Check, Search } from 'lucide-react';
import type { TribunalOption } from '@/lib/tribunals';
import {
  QUEM_MOVIMENTACAO,
  alternarCategoria,
  categoriaLigada,
  countActiveMovimentacaoFilters,
  serializeMovimentacaoFilters,
  type MovimentacaoFilterState,
} from '@/lib/movimentacao-filters';
import { CATEGORIAS_MOVIMENTACAO } from '@/lib/categoria-movimentacao';
import { SelectQueNavega } from './SelectQueNavega';
import styles from './BarraDeFiltros.module.css';

/** O rótulo da pílula no desktop — o cartório diz, ao lado, que aparece recolhido. */
const ROTULO_DA_PILULA: Record<string, string> = {
  tramite: 'Cartório (recolhido)',
};

/** O endereço da lista de todas com um recorte novo — sempre com `vista=todas`. */
export function hrefDaLista(filtros: MovimentacaoFilterState): string {
  const params = serializeMovimentacaoFilters(filtros);
  params.set('vista', 'todas');
  return `/movimentacoes?${params.toString()}`;
}

/**
 * OS FILTROS NA BARRA — a lista de todas no desktop.
 *
 * No celular eles moram numa folha que sobe de baixo (`FolhaDeFiltros`); aqui
 * há largura para deixá-los à vista, e a tela não precisa esconder o recorte
 * atrás de um botão. Server Component: busca é um `<form method="get">`, as
 * pílulas e o segmento são `<Link>`, e só os dois `<select>` pedem JavaScript
 * para navegar.
 */
export function BarraDeFiltros({
  filtros,
  tribunais,
}: {
  filtros: MovimentacaoFilterState;
  tribunais: readonly TribunalOption[];
}) {
  const com = (mudanca: Partial<MovimentacaoFilterState>) => hrefDaLista({ ...filtros, ...mudanca });
  const ativos = countActiveMovimentacaoFilters(filtros) > 0 || Boolean(filtros.q) || Boolean(filtros.sort);

  /* O select mostra UM tribunal; quem chegou com vários (pela folha do
     celular) vê "N tribunais", desabilitado, em vez de um valor que mentiria. */
  const variosTribunais = filtros.tribunal.length > 1;
  const opcoesDeTribunal = [
    { valor: '', rotulo: 'Todos', href: com({ tribunal: [] }) },
    ...(variosTribunais
      ? [{ valor: '__varios', rotulo: `${filtros.tribunal.length} tribunais`, href: '', desabilitada: true }]
      : []),
    ...tribunais.map(t => ({ valor: t.code, rotulo: t.code, href: com({ tribunal: [t.code] }) })),
  ];

  const ocultos = serializeMovimentacaoFilters({ ...filtros, q: '' });

  return (
    <div role="search" className={styles.barra}>
      <div className={styles.linha}>
        <form action="/movimentacoes" method="get" className={styles.busca}>
          <input type="hidden" name="vista" value="todas" />
          {[...ocultos.entries()].map(([nome, valor]) => (
            <input key={nome} type="hidden" name={nome} value={valor} />
          ))}
          <label className={styles.campo}>
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Buscar nas movimentações</span>
            <input
              type="search"
              name="q"
              defaultValue={filtros.q}
              placeholder="Buscar por parte, número ou assunto"
            />
          </label>
          <button type="submit" className="sr-only">Buscar</button>
        </form>

        <div role="group" aria-label="De quem é a providência" className={styles.segmento}>
          {QUEM_MOVIMENTACAO.map(opcao => {
            const atual = filtros.quem === opcao.value;
            return (
              <Link
                key={opcao.value || 'qualquer'}
                href={com({ quem: opcao.value })}
                scroll={false}
                className={styles.segmentoOpcao}
                aria-current={atual ? 'true' : undefined}
              >
                {opcao.label}
              </Link>
            );
          })}
        </div>

        {tribunais.length > 0 && (
          <SelectQueNavega
            rotulo="Tribunal"
            valor={variosTribunais ? '__varios' : filtros.tribunal[0] ?? ''}
            opcoes={opcoesDeTribunal}
          />
        )}

        <SelectQueNavega
          rotulo="Ordem"
          valor={filtros.sort}
          opcoes={[
            { valor: '', rotulo: 'Mais recentes', href: com({ sort: '' }) },
            { valor: 'antigas', rotulo: 'Mais antigas', href: com({ sort: 'antigas' }) },
            { valor: 'tribunal', rotulo: 'Tribunal (A–Z)', href: com({ sort: 'tribunal' }) },
          ]}
        />
      </div>

      <div role="group" aria-label="Mostrar" className={styles.linha}>
        <span className={styles.rotulo}>Mostrar</span>
        {CATEGORIAS_MOVIMENTACAO.map(categoria => {
          const ligada = categoriaLigada(filtros.categoria, categoria.value);
          return (
            <Link
              key={categoria.value}
              href={com({ categoria: alternarCategoria(filtros.categoria, categoria.value) })}
              scroll={false}
              className={styles.pilula}
              aria-current={ligada ? 'true' : undefined}
            >
              {ligada && <Check size={15} aria-hidden="true" />}
              {ROTULO_DA_PILULA[categoria.value] ?? categoria.label}
              <span className="sr-only">{ligada ? ' (aparecendo)' : ' (escondido)'}</span>
            </Link>
          );
        })}
        {ativos && (
          <Link href="/movimentacoes?vista=todas" scroll={false} className={styles.limpar}>
            Limpar filtros
          </Link>
        )}
      </div>
    </div>
  );
}
