'use client';

import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { MovimentacaoGroup } from '@/types';
import { posicaoDoDivisor } from '@/lib/novidades';
import { GruposDoDia } from './GruposDoDia';
import styles from './ListaCompleta.module.css';

type Pagina = { grupos: MovimentacaoGroup[]; divisorAntesDe: string | null; continuaChave: string | null };

/**
 * "CARREGAR DIAS ANTERIORES" — no lugar de "1 / 372" com duas setas.
 *
 * A paginação devolvia a pessoa ao topo a cada página, e o número de páginas
 * não era informação para ninguém. Aqui a página seguinte entra embaixo da
 * que está na tela, com os mesmos filtros (`consulta`) — sem eles, a página 2
 * viria do acervo inteiro e a lista misturaria o que o filtro excluiu, em
 * silêncio. Mesma razão do "carregar mais" da timeline do processo.
 */
export function MaisDias({
  consulta,
  paginaInicial,
  totalPaginas,
  ultimaChave,
  jaHouveNova,
  divisorMostrado,
  rotuloDivisor,
}: {
  /** Os filtros da tela, já serializados. */
  consulta: string;
  paginaInicial: number;
  totalPaginas: number;
  ultimaChave: string | null;
  jaHouveNova: boolean;
  divisorMostrado: boolean;
  rotuloDivisor: string;
}) {
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [proxima, setProxima] = useState(paginaInicial + 1);
  const [total, setTotal] = useState(totalPaginas);
  const [estado, setEstado] = useState({ ultimaChave, houveNova: jaHouveNova, divisorMostrado });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch(`/api/movimentacoes?${consulta}${consulta ? '&' : ''}pagina=${proxima}`, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const dados = await res.json() as { grupos: MovimentacaoGroup[]; totalPaginas: number };

      const itens = dados.grupos.flatMap(g => g.items);
      const divisor = estado.divisorMostrado
        ? { antesDe: null, houveNova: estado.houveNova }
        : posicaoDoDivisor(itens, estado.houveNova);

      setPaginas(atual => [...atual, {
        grupos: dados.grupos,
        divisorAntesDe: divisor.antesDe,
        continuaChave: estado.ultimaChave,
      }]);
      setEstado({
        ultimaChave: dados.grupos.at(-1)?.chave ?? estado.ultimaChave,
        houveNova: divisor.houveNova,
        divisorMostrado: estado.divisorMostrado || Boolean(divisor.antesDe),
      });
      setTotal(dados.totalPaginas);
      setProxima(p => p + 1);
    } catch {
      setErro('Não foi possível carregar. Tente de novo.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      {paginas.map((pagina, i) => (
        <GruposDoDia
          key={i}
          grupos={pagina.grupos}
          divisorAntesDe={pagina.divisorAntesDe}
          rotuloDivisor={rotuloDivisor}
          continuaChave={pagina.continuaChave}
        />
      ))}

      {proxima <= total && (
        <div className={styles.mais}>
          <button type="button" className={styles.maisBotao} onClick={() => void carregar()} disabled={carregando}>
            {carregando && <LoaderCircle size={18} aria-hidden="true" className={styles.girando} />}
            {carregando ? 'Carregando…' : 'Carregar dias anteriores'}
          </button>
          {erro && <p className={styles.maisErro} role="alert">{erro}</p>}
        </div>
      )}
    </>
  );
}
