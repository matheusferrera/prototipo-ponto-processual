'use client';

import { useCallback, useState } from 'react';
import { ChevronDown, LoaderCircle } from 'lucide-react';
import type { Movimentacao, TimelineEvent } from '@/types';
import { agruparTramite } from '@/lib/fio-do-prazo';
import { DateGroupHeader } from '@/components/ui/DateGroupHeader/DateGroupHeader';
import { AtosDeTramite } from '../AtosDeTramite/AtosDeTramite';
import { MovimentacaoRow } from '../MovimentacaoRow/MovimentacaoRow';
import styles from './TimelineProcesso.module.css';

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

function DiaDeAtos({ grupo }: { grupo: ReturnType<typeof agruparPorDia>[number] }) {
  /**
   * ── O CARTÓRIO COLAPSA, e é aqui que ele mais precisava ──────────────────
   *
   * `AtosDeTramite` já rodava no feed e no fio do prazo, e **não nesta lista**
   * — que é justamente a que mais precisa dele: um processo tem mediana de 40
   * movimentações, p90 de 288 e máximo de 4.900, e medido em 673 movimentações
   * de 90 dias, trâmite é 47% e publicação 16%. São **63% da lista**, cada
   * linha ocupando a altura de uma sentença.
   *
   * Isto substituiu o corte anterior por quantidade ("mostrar mais 4
   * movimentações", depois das três primeiras do dia). Os dois escondem
   * linhas; a diferença é que aquele não dizia o que escondia — cortava pela
   * posição, então o quarto ato do dia podia ser a sentença — e este declara:
   * "25 atos de trâmite · Decorrido prazo, Juntada, Certidão". Colapso que não
   * declara o conteúdo é filtro secreto, e esta base já teve um.
   *
   * **O que está dentro de um prazo aberto nunca entra** (`colapsavelNaLista`):
   * "Decorrido prazo do réu" é trâmite pela categoria e é, com o relógio
   * correndo, a linha mais importante do dia.
   */
  const blocos = agruparTramite(grupo.atos);

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
        {blocos.map((bloco, i) => (
          bloco.tipo === 'linha'
            ? <AtoLinha key={bloco.item.id} e={bloco.item} />
            : (
              <li key={`tramite-${grupo.dia}-${i}`}>
                <AtosDeTramite itens={bloco.itens.map(e => ({ categoria: e.categoria ?? null, tipo: e.title }))}>
                  {bloco.itens.map(e => <AtoLinha key={e.id} e={e} />)}
                </AtosDeTramite>
              </li>
            )
        ))}
      </ul>
    </li>
  );
}

/**
 * A MESMA LINHA DO FEED — e, como lá, um LINK.
 *
 * Até 17/09/2026 esta era a única lista do produto em que a movimentação
 * ABRIA NO LUGAR: a linha era um `<button>` que expandia `AtoDetalhe` abaixo
 * dela, com uma requisição por linha aberta. Era o painel que o feed já tinha
 * abandonado em 15/09 — e pelos mesmos dois motivos, que aqui pesam mais:
 *
 * 1. **a lista se mexia.** Um ato do diário tem 8 KB de média e 151 KB no
 *    maior deste acervo; abrir a terceira linha de um dia empurrava o resto do
 *    processo centenas de pixels para baixo;
 * 2. **o painel não cabia a conta do prazo** nem os documentos — o card cabe, e
 *    é o mesmo card que o feed, a pauta e o fio já abrem.
 *
 * O `href` é o endereço do ato; quem o abre POR CIMA da página do processo é a
 * fenda `app/@card/(.)movimentacoes/[id]`, que intercepta a navegação venha ela
 * de onde vier. Sem JavaScript, no clique do meio e em nova aba, o mesmo link
 * leva à página do ato — que renderiza o mesmo card.
 */
function AtoLinha({ e }: { e: TimelineEvent }) {
  const movimentacao: Movimentacao = {
    id: e.id, tribunal: '', cnj: '', orgaoJulgador: '', assunto: '',
    parte: '', tipo: e.title, detail: e.title,
    // `quiet` fixo: a linha do tempo não marca novidade — ver `MovimentacaoRow`.
    time: e.time, state: 'quiet', origem: e.origem ?? 'scraper', fontes: e.fontes ?? [],
    categoria: e.categoria ?? null,
    ia: e.ia ?? {
      resumo: null, fundamento: null, confianca: null, deQuem: null, analisadoEm: null,
      oQueFazer: null, peca: null, checklist: [], documentosNecessarios: [],
      risco: null, complexidade: null, precisaDosAutos: false, observacao: null,
    },
    prazo: e.prazo ?? null,
    /* O PRAZO EM CURSO — aqui a faixa é ainda mais direta do que no feed:
       todas as linhas são do MESMO caso, então ela marca exatamente o trecho
       da linha do tempo que corre dentro de um prazo, e onde ele começou. */
    prazoEmCurso: e.prazoEmCurso ?? null,
    // Texto extraído OU documento anexado — mesma regra de `temAlgoParaLer`
    // (`api.server.ts`), com a conta já feita na listagem.
    temInteiroTeor: e.temInteiroTeor,
    documentoEstado: e.documentoEstado,
    // Os dois SINAIS DE PEÇA que a linha usa para decidir entre o ícone de
    // documento e o cadeado. Sem eles a timeline do processo era a única lista
    // que nunca oferecia a certidão de publicação — e, pior, mostrava cadeado
    // em ato cuja certidão o CNJ serve para 100% do diário, porque `sigiloso`
    // depende justamente de `!temCertidao`.
    temCertidao: e.temCertidao,
    temDocumentoDoAto: e.temDocumentoDoAto,
  };

  return (
    <li>
      <MovimentacaoRow
        m={movimentacao}
        noProcesso
        comHora
        href={`/movimentacoes/${encodeURIComponent(e.id)}`}
      />
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
          <DiaDeAtos key={grupo.dia} grupo={grupo} />
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
