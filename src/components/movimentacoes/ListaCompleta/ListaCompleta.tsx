import Link from 'next/link';
import { Search } from 'lucide-react';
import type { MovimentacaoGroup } from '@/types';
import type { TribunalOption } from '@/lib/tribunals';
import { desdeQuando } from '@/lib/movimentacao';
import { posicaoDoDivisor } from '@/lib/novidades';
import {
  countActiveMovimentacaoFilters,
  resumoDosFiltros,
  serializeMovimentacaoFilters,
  type MovimentacaoFilterState,
} from '@/lib/movimentacao-filters';
import { BarraDeFiltros } from '../BarraDeFiltros/BarraDeFiltros';
import { FolhaDeFiltros } from '../FolhaDeFiltros/FolhaDeFiltros';
import { GruposDoDia } from './GruposDoDia';
import { MaisDias } from './MaisDias';
import styles from './ListaCompleta.module.css';

/**
 * A ABA TODAS — o histórico inteiro, com busca e recorte.
 *
 * No celular: a busca no topo e o recorte numa frase ("Decisões, petições… ·
 * cartório recolhido · Mudar"). No desktop: a barra de filtros à vista e as
 * linhas em colunas. Nos dois, os dias com cabeçalho que gruda, o cartório
 * recolhido, o "Você viu até aqui" e o "Carregar dias anteriores" no lugar da
 * paginação.
 */
export function ListaCompleta({
  grupos,
  filtros,
  tribunais,
  pagina,
  totalPaginas,
  vistasAte,
  focarBusca,
}: {
  grupos: readonly MovimentacaoGroup[];
  filtros: MovimentacaoFilterState;
  tribunais: readonly TribunalOption[];
  pagina: number;
  totalPaginas: number;
  vistasAte: string | null;
  /** Veio da lupa do topo — o campo já abre com o cursor. */
  focarBusca: boolean;
}) {
  const itens = grupos.flatMap(g => g.items);
  const { antesDe, houveNova } = posicaoDoDivisor(itens);
  const rotuloDivisor = vistasAte
    ? `Você viu até aqui · ${desdeQuando(vistasAte)}`
    : 'Acima, o que chegou nos últimos 7 dias';
  const consulta = serializeMovimentacaoFilters(filtros).toString();
  const filtrado = countActiveMovimentacaoFilters(filtros) > 0 || Boolean(filtros.q);
  const ocultos = serializeMovimentacaoFilters({ ...filtros, q: '' });

  return (
    <div className={styles.todas}>
      <BarraDeFiltros filtros={filtros} tribunais={tribunais} />

      <div className={styles.topoCelular}>
        <form action="/movimentacoes" method="get" role="search">
          <input type="hidden" name="vista" value="todas" />
          {[...ocultos.entries()].map(([nome, valor]) => (
            <input key={nome} type="hidden" name={nome} value={valor} />
          ))}
          <label className={styles.busca}>
            <Search size={20} aria-hidden="true" />
            <span className="sr-only">Buscar nas movimentações</span>
            <input
              type="search"
              name="q"
              defaultValue={filtros.q}
              placeholder="Parte, número ou assunto"
              autoFocus={focarBusca}
            />
          </label>
          <button type="submit" className="sr-only">Buscar</button>
        </form>
        <p className={styles.recorte}>
          <span className={styles.recorteTexto}>{resumoDosFiltros(filtros)}</span>
          <FolhaDeFiltros filtros={filtros} tribunais={tribunais} variante="texto" />
        </p>
      </div>

      {itens.length === 0 ? (
        <div className={styles.vazio}>
          <p className={styles.vazioTitulo}>
            {filtrado ? 'Nenhuma movimentação neste recorte' : 'Nenhuma movimentação ainda'}
          </p>
          <p className={styles.vazioTexto}>
            {filtrado
              ? 'Nada corresponde à busca ou aos filtros de agora.'
              : 'Assim que a plataforma identificar uma movimentação nova em algum dos seus processos, ela aparece aqui.'}
          </p>
          {filtrado && <Link href="/movimentacoes?vista=todas" className={styles.vazioLink}>Limpar filtros</Link>}
        </div>
      ) : (
        <div className={styles.lista}>
          <div className={styles.colunas} aria-hidden="true">
            <span>Hora</span>
            <span>Tipo</span>
            <span>Trib.</span>
            <span>Parte</span>
            <span>O que aconteceu</span>
            <span />
          </div>

          <GruposDoDia grupos={grupos} divisorAntesDe={antesDe} rotuloDivisor={rotuloDivisor} />

          <MaisDias
            consulta={consulta}
            paginaInicial={pagina}
            totalPaginas={totalPaginas}
            ultimaChave={grupos.at(-1)?.chave ?? null}
            jaHouveNova={houveNova}
            divisorMostrado={Boolean(antesDe)}
            rotuloDivisor={rotuloDivisor}
          />
        </div>
      )}
    </div>
  );
}
