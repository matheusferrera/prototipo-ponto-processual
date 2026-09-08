'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LoaderCircle } from 'lucide-react';
import type { Movimentacao, TimelineEvent } from '@/types';
import type { MovimentacaoDetail } from '@/lib/api.server';
import { DateGroupHeader } from '@/components/ui/DateGroupHeader/DateGroupHeader';
import { AtoDetalhe } from '../AtoDetalhe/AtoDetalhe';
import { MovimentacaoRow } from '../MovimentacaoRow/MovimentacaoRow';
import { carregarAto } from './carregarAto';
import styles from './TimelineProcesso.module.css';

/**
 * Quantos atos de um mesmo dia aparecem antes do "mostrar mais".
 *
 * Três porque é o que cabe sem o dia empurrar o seguinte para fora da tela, e
 * porque o caso que motivou o corte é o dia de cartório: seis "Decorrido prazo
 * de FULANO" seguidos, um por parte, que são o mesmo fato repetido.
 */
const ATOS_VISIVEIS_POR_DIA = 3;

/**
 * Os atos de um DIA, sob um cabeçalho só.
 *
 * A timeline era uma linha por ato, cada uma repetindo a data na coluna da
 * esquerda — e num processo movimentado isso quer dizer "12 de dezembro de
 * 2024" escrito cinco vezes seguidas, uma por linha, enquanto o que a pessoa
 * procura é o que aconteceu naquele dia. Agrupar troca a repetição por
 * hierarquia: a data aparece uma vez, e sob ela os atos daquele dia.
 *
 * O agrupamento é por dia CONSECUTIVO na lista, não por um `Map` global: a
 * ordem já vem do backend (asc ou desc, conforme o filtro) e refazer o
 * agrupamento por chave descartaria essa ordem. Como a lista é ordenada por
 * data, atos do mesmo dia são sempre vizinhos.
 */
function agruparPorDia(eventos: TimelineEvent[]): { dia: string; dataCurta: string; diaSemana: string; atos: TimelineEvent[] }[] {
  const grupos: { dia: string; dataCurta: string; diaSemana: string; atos: TimelineEvent[] }[] = [];
  for (const e of eventos) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.dia === e.dia) ultimo.atos.push(e);
    else grupos.push({ dia: e.dia, dataCurta: e.dataCurta, diaSemana: e.diaSemana, atos: [e] });
  }
  return grupos;
}

function DiaDeAtos({ grupo, abertos, onAbrir }: {
  grupo: ReturnType<typeof agruparPorDia>[number];
  abertos: ReadonlySet<string>;
  onAbrir: (id: string) => void;
}) {
  // Um dia de cartório rende seis, oito "Decorrido prazo de FULANO" seguidos —
  // uma linha por parte, o mesmo fato repetido. Mostrar os três primeiros diz o
  // que aconteteceu naquele dia; o resto fica a um clique, sem empurrar o dia
  // seguinte para fora da tela.
  const visiveis = grupo.atos.slice(0, ATOS_VISIVEIS_POR_DIA);
  const escondidos = grupo.atos.slice(ATOS_VISIVEIS_POR_DIA);

  return (
    <li className={styles.dia}>
      {/* O MESMO cabeçalho do feed de `/movimentacoes` — `DateGroupHeader`,
          gruda no topo enquanto se percorre o dia. Aqui ele existia como uma
          segunda implementação (`.diaCabecalho`, 13px em `--ink`, sem grude e
          sem dia da semana), e duas listas de movimentação com dois jeitos de
          nomear o dia obrigam quem lê a aprender a mesma coisa duas vezes.
          `dateTime` em ISO é o que um leitor de tela leva embora. */}
      <DateGroupHeader
        className={styles.diaCabecalho}
        date={grupo.dataCurta}
        day={grupo.diaSemana}
        dateTime={grupo.dia}
        count={grupo.atos.length === 1 ? '1 movimentação' : `${grupo.atos.length} movimentações`}
      />

      <ul className={styles.diaAtos}>
        {visiveis.map(e => <AtoLinha key={e.id} e={e} aberto={abertos.has(e.id)} onAbrir={onAbrir} />)}
      </ul>

      {escondidos.length > 0 && (
        // O agrupamento adicional usa a expansão nativa do navegador.
        <details className={styles.mais}>
          <summary className={styles.maisBotao}>
            <ChevronDown aria-hidden="true" size={14} strokeWidth={2} className={styles.maisSeta} />
            {/* Os dois rótulos vivem no HTML e o CSS troca qual aparece
                (`details[open]`). É o que mantém o toggle sem JS. */}
            <span className={styles.maisFechado}>
              Mostrar mais {escondidos.length} {escondidos.length === 1 ? 'movimentação' : 'movimentações'}
            </span>
            <span className={styles.maisAberto}>Mostrar menos</span>
          </summary>
          <ul className={styles.diaAtos}>
            {escondidos.map(e => <AtoLinha key={e.id} e={e} aberto={abertos.has(e.id)} onAbrir={onAbrir} />)}
          </ul>
        </details>
      )}
    </li>
  );
}

/** A mesma linha e o mesmo detalhe do feed, com carregamento ao expandir. */
function AtoLinha({ e, aberto, onAbrir }: {
  e: TimelineEvent;
  aberto: boolean;
  onAbrir: (id: string) => void;
}) {
  const [detalhe, setDetalhe] = useState<MovimentacaoDetail | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    if (carregando) return;
    setCarregando(true);
    setErro(null);
    try {
      const ato = await carregarAto(e.id);
      if (!ato) throw new Error('Ato não encontrado');
      setDetalhe(ato);
    } catch {
      setErro('Não foi possível carregar o ato. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  function alternar() {
    onAbrir(e.id);
    if (!aberto && !detalhe) void carregar();
  }

  /**
   * A linha que JÁ NASCE ABERTA (lida pela IA — ver `comLeituraIa`) busca o
   * detalhe uma vez, sozinha.
   *
   * Só o `fetch` mora no efeito, e nenhum `setState` síncrono: quem decide
   * quais abrem é o render do pai. O detalhe (teor, peças, prazo por extenso)
   * continua custando uma requisição por linha — e é por isso que só as lidas
   * abrem: numa timeline de 150 atos, abrir todas seriam 150 requisições para
   * mostrar, na maioria, "sem inteiro teor".
   */
  useEffect(() => {
    if (!aberto || detalhe || carregando || erro) return;
    // `react-hooks/set-state-in-effect` marca o `setCarregando(true)` que
    // `carregar` faz na primeira linha. É falso positivo aqui, e a própria
    // regra diz por quê: ela sanciona o efeito que "subscribe for updates from
    // some external system" — que é literalmente o que este faz, buscar o ato
    // na API. O que ela quer evitar é state derivado de state, e a alternativa
    // (adiar por microtask) só existiria para enganar o linter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
    // `aberto` sozinho é a dependência CERTA: os outros três são guardas de
    // "já está em andamento", não gatilhos. Incluí-los faria o efeito rodar de
    // novo a cada passo do próprio carregamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const movimentacao: Movimentacao = {
    id: e.id, tribunal: '', cnj: '', orgaoJulgador: '', assunto: '',
    parte: '', tipo: e.title, detail: e.title,
    // `quiet` fixo: a linha do tempo não marca novidade — ver `MovimentacaoRow`.
    time: e.time, state: 'quiet', origem: e.origem ?? 'scraper', fontes: e.fontes ?? [],
    categoria: e.categoria ?? null,
    ia: e.ia ?? { resumo: null, acao: null, fundamento: null, confianca: null, deQuem: null, analisadoEm: null },
    prazo: detalhe?.prazo ?? e.prazo ?? null,
    // Texto extraído OU documento anexado — mesma regra de `temAlgoParaLer`
    // (`api.server.ts`). Antes de carregar o detalhe, `e.temInteiroTeor` já
    // vem com essa conta feita; depois de carregar, `detalhe.documentos` é o
    // que faltava considerar — sem isto, abrir um ato do PDPJ com peça
    // trocava o selo de "Com" para "Sem" no instante em que o detalhe chegava.
    // Os dois sinais da linha. Quando o detalhe já foi carregado ele manda —
    // ele tem o texto de verdade, não só o booleano da listagem.
    temInteiroTeor: detalhe
      ? Boolean(detalhe.textoOriginal?.trim())
      : e.temInteiroTeor,
    documentoEstado: detalhe?.documentoEstado ?? e.documentoEstado,
  };

  const painel = !aberto ? undefined : detalhe ? <AtoDetalhe mov={detalhe} /> : (
    <div className={styles.estadoDetalhe} aria-busy={carregando}>
      {erro ? (
        <>
          <p role="alert">{erro}</p>
          <button type="button" className={styles.carregar} onClick={() => void carregar()}>Tentar novamente</button>
          <Link href={`/movimentacoes/${encodeURIComponent(e.id)}`} className={styles.linkDetalhe}>Abrir a página do ato →</Link>
        </>
      ) : <p role="status">Carregando detalhes do ato…</p>}
    </div>
  );

  return (
    <li>
      <MovimentacaoRow m={movimentacao} noProcesso comHora onToggle={alternar} painel={painel} />
    </li>
  );
}

export interface TimelineProcessoProps {
  processId: string;
  /** A primeira página, renderizada no SERVIDOR — a lista não nasce vazia. */
  inicial: TimelineEvent[];
  /** Quantas movimentações o filtro atual encontrou, no processo inteiro. */
  total: number;
  /** O tamanho da página, para pedir a próxima com o mesmo recorte. */
  porPagina: number;
  /** Os filtros da tela, repassados a cada "Carregar mais". */
  filtros: {
    /**
     * As categorias como a PÁGINA as pediu — inclui o `['todas']` que ela manda
     * quando não há filtro, e que não é uma `CategoriaMovimentacao`. Daí o tipo
     * ser `string[]`: o valor precisa atravessar igual, não "equivalente".
     */
    categorias: readonly string[];
    q?: string;
    from?: string;
    to?: string;
    sort: 'asc' | 'desc';
  };
}

/**
 * Os atos que a IA já leu — os que nascem abertos.
 *
 * `ia.resumo` vem da coluna quente na própria listagem, sem custo, então dá
 * para decidir isto no render e sem I/O. É por isso que a semente mora aqui e
 * não num efeito: `setState` síncrono dentro de `useEffect` é justamente o que
 * o React 19 reprova, e o valor já é conhecido antes da primeira pintura.
 */
function comLeituraIa(eventos: TimelineEvent[]): Set<string> {
  return new Set(eventos.filter(e => e.ia?.resumo?.trim()).map(e => e.id));
}

/**
 * A linha do tempo do processo, com "Carregar mais" que ANEXA.
 *
 * Era paginação com Anterior/Próxima, e o gesto é que estava errado: cada clique
 * recarregava a página inteira e devolvia a pessoa ao topo, então percorrer um
 * processo de 288 movimentações — o p90 da base — custava 15 recarregamentos,
 * cada um exigindo reconstruir mentalmente onde se estava. Aqui a lista cresce e
 * o scroll fica onde está.
 *
 * **Client component, e é o mínimo que precisa ser.** A primeira página vem
 * renderizada do servidor (`inicial`), então quem chega pela URL já lê o
 * conteúdo antes de qualquer JavaScript; o estado só existe para acumular o que
 * vier depois. Foi também a extração que o CLAUDE.md pedia — o `TimelineItem`
 * morava dentro do `page.tsx`.
 *
 * **Não carrega sozinho ao rolar.** Um scroll infinito num processo de 4.900
 * movimentações (o maior da base) desceria sem fim e levaria a página a ~54 mil
 * nós de DOM sem ninguém ter pedido. O clique é o teto: nada entra sem alguém
 * mandar entrar.
 */
export function TimelineProcesso({ processId, inicial, total, porPagina, filtros }: TimelineProcessoProps) {
  const [eventos, setEventos] = useState(inicial);
  /**
   * As linhas ABERTAS — conjunto, não uma só.
   *
   * Era `string | null` (uma por vez). Virou conjunto para que o ato **já lido
   * pela IA nasça aberto**: se alguém pagou a leitura, esconder o resultado
   * atrás de um clique é esconder justamente o que se comprou. O ato sem
   * leitura continua fechado — ali o clique ainda vale, porque abrir custa uma
   * requisição e não há resumo esperando.
   */
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => comLeituraIa(inicial));
  const alternar = useCallback((id: string) => {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (!proximo.delete(id)) proximo.add(id);
      return proximo;
    });
  }, []);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

  const faltam = Math.max(0, total - eventos.length);

  const carregarMais = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const proxima = pagina + 1;

    try {
      const query = new URLSearchParams({
        page: String(proxima),
        limit: String(porPagina),
        sort: filtros.sort,
      });
      // Os MESMOS filtros da tela. Sem eles, a página 2 viria do acervo inteiro
      // e a lista passaria a misturar o que o filtro tinha excluído.
      if (filtros.categorias.length) query.set('cat', filtros.categorias.join(','));
      if (filtros.q) query.set('q', filtros.q);
      if (filtros.from) query.set('from', filtros.from);
      if (filtros.to) query.set('to', filtros.to);

      const resposta = await fetch(
        `/api/processos/${encodeURIComponent(processId)}/movimentacoes?${query}`,
        { cache: 'no-store' },
      );
      if (!resposta.ok) throw new Error(`Falha ao carregar (${resposta.status})`);
      const { events } = (await resposta.json()) as { events: TimelineEvent[] };

      // Dedupe por id: o acervo pode ganhar movimentação entre uma página e a
      // seguinte (a ronda roda 3x ao dia), e aí o mesmo ato escorrega para a
      // página de baixo e voltaria repetido. Chave do React duplicada é erro de
      // render, não detalhe.
      setEventos(atuais => {
        const vistos = new Set(atuais.map(e => e.id));
        return [...atuais, ...events.filter(e => !vistos.has(e.id))];
      });
      // As páginas seguintes também abrem o que a IA leu — senão a regra valeria
      // só para a primeira, e a mesma linha se comportaria de dois jeitos
      // conforme o momento em que entrou na lista.
      setAbertos(atual => new Set([...atual, ...comLeituraIa(events)]));
      setPagina(proxima);
    } catch (falha) {
      console.error('Não foi possível carregar mais movimentações.', falha);
      setErro('Não foi possível carregar mais movimentações. Tente de novo.');
    } finally {
      setCarregando(false);
    }
  }, [processId, pagina, porPagina, filtros]);

  if (eventos.length === 0) {
    return (
      <div className={styles.vazio}>
        § Nenhuma movimentação encontrada. Ajuste os filtros ou selecione “Ver todas as movimentações”.
      </div>
    );
  }

  return (
    <>
      <ol className={styles.dias}>
        {agruparPorDia(eventos).map(grupo => (
          <DiaDeAtos key={grupo.dia} grupo={grupo} abertos={abertos} onAbrir={alternar} />
        ))}
      </ol>

      <div className={styles.rodape}>
        <span className={styles.contagem}>
          {eventos.length} de {total} {total === 1 ? 'movimentação' : 'movimentações'}
        </span>

        {faltam > 0 && (
          <button type="button" className={styles.carregar} onClick={carregarMais} disabled={carregando}>
            {carregando
              ? <LoaderCircle aria-hidden="true" size={15} strokeWidth={2} className={styles.girando} />
              : <ChevronDown aria-hidden="true" size={15} strokeWidth={2} />}
            {carregando ? 'Carregando…' : `Carregar mais ${Math.min(faltam, porPagina)}`}
          </button>
        )}

        {erro && <span className={styles.erro} role="alert">{erro}</span>}
      </div>
    </>
  );
}
