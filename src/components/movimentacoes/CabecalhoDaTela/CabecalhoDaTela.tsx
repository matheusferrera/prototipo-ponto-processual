import Link from 'next/link';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { TribunalOption } from '@/lib/tribunals';
import type { MovimentacaoFilterState } from '@/lib/movimentacao-filters';
import { AbasDaTela, type VistaDasMovimentacoes } from '../AbasDaTela/AbasDaTela';
import { FolhaDeFiltros } from '../FolhaDeFiltros/FolhaDeFiltros';
import { MarcarVistas } from '../MarcarVistas/MarcarVistas';
import { FraseDasNovas } from '../Novidades/Novidades';
import styles from './CabecalhoDaTela.module.css';

interface Comum {
  vista: VistaDasMovimentacoes;
  href: (proxima: VistaDasMovimentacoes) => string;
  novas: number;
  emCurso: number;
}

/**
 * O TOPO DA TELA NO DESKTOP — o título, a busca e as três abas.
 *
 * Substitui o `PageHeader` genérico nesta rota: o desenho de 17/09/2026 tira a
 * trilha "Início / Movimentações" (a barra lateral já diz onde se está) e põe
 * na linha das abas a frase das novas com o "Marcar vistas", que no celular
 * mora no topo da lista.
 *
 * A busca daqui leva à aba Todas: é lá que o histórico se pesquisa. Na própria
 * aba Todas ela não aparece — a barra de filtros logo abaixo tem a sua.
 */
export function CabecalhoDaTela({
  vista,
  href,
  novas,
  emCurso,
  vistasAte,
  processos,
}: Comum & {
  vistasAte: string | null;
  /** Em quantos processos caíram as novas — "8 novas em 6 processos". */
  processos?: number;
}) {
  return (
    <div className={styles.topo}>
      <div className={styles.titulo}>
        <h1 className={styles.h1}>Movimentações</h1>
        {vista !== 'todas' && (
          <>
            <form action="/movimentacoes" method="get" role="search" className={styles.busca}>
              <input type="hidden" name="vista" value="todas" />
              <label className={styles.campo}>
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">Buscar nas movimentações</span>
                <input type="search" name="q" placeholder="Buscar por parte, número ou assunto" />
              </label>
              <button type="submit" className="sr-only">Buscar</button>
            </form>
            <Link href="/movimentacoes?vista=todas" className={styles.filtros}>
              <SlidersHorizontal size={18} aria-hidden="true" />
              Filtros
            </Link>
          </>
        )}
      </div>

      <div className={styles.abas}>
        <AbasDaTela vista={vista} href={href} novas={novas} emCurso={emCurso} variante="desktop" />
        {vista === 'novas' && novas > 0 && (
          <div className={styles.novas}>
            <p className={styles.novasTexto}>
              <FraseDasNovas total={novas} processos={processos} vistasAte={vistasAte} />
            </p>
            <MarcarVistas vistasAte={vistasAte} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * O TOPO NO CELULAR — vai para dentro da barra do `AppLayout`
 * (`mobileActions`): a lupa, o filtro e, na linha de baixo, as três abas.
 *
 * A lupa leva à aba Todas com o campo já focado; o filtro abre a folha, que
 * sempre aplica na aba Todas (a aba Novas não se filtra — ver `FolhaDeFiltros`).
 */
export function AcoesDoTopoNoCelular({
  vista,
  href,
  novas,
  emCurso,
  filtros,
  tribunais,
}: Comum & { filtros: MovimentacaoFilterState; tribunais: readonly TribunalOption[] }) {
  return (
    <>
      <div className={styles.icones}>
        {vista !== 'todas' && (
          <Link href="/movimentacoes?vista=todas&buscar=1" className={styles.icone} aria-label="Buscar movimentações">
            <Search size={20} aria-hidden="true" />
          </Link>
        )}
        <FolhaDeFiltros filtros={filtros} tribunais={tribunais} variante="icone" />
      </div>
      <AbasDaTela vista={vista} href={href} novas={novas} emCurso={emCurso} variante="celular" />
    </>
  );
}
