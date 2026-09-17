/**
 * A ABA NOVAS — o que chegou desde a última visita, organizado pelo que o
 * advogado tem de fazer com isso.
 *
 * ## Por que não é o feed cronológico
 *
 * O feed põe cada ato numa linha, na ordem em que o tribunal os praticou. Medido
 * na conta de dev em 17/09/2026: o mesmo processo aparecia em três linhas
 * seguidas, cada uma repetindo "manifestação · faltam 15 dias", e a pergunta
 * que importa — "algum disso é comigo?" — ficava para a pessoa deduzir.
 *
 * A aba responde em três blocos, nesta ordem:
 *
 * 1. **pede sua ação** — o ato que abriu um prazo seu, aberto e por vencer, o
 *    mais urgente primeiro;
 * 2. **outras novidades** — o resto, agrupado por PROCESSO: o prazo que corre
 *    aparece uma vez, no cabeçalho do caso, e cada ato diz se é com você;
 * 3. **só cartório** — processos em que só o cartório se mexeu.
 *
 * **Sem import em tempo de execução** (os critérios chegam como funções): este
 * módulo é testado em `node --test`, onde o alias `@/` não resolve.
 */

export interface ItemDeNovidade {
  id: string;
  /** O processo — a chave do agrupamento. `—` quando a linha não tem processo. */
  cnj: string;
}

export interface GrupoDoProcesso<T> {
  cnj: string;
  /** O primeiro item do processo na ordem da lista — de onde saem nome e tribunal. */
  primeiro: T;
  /** Os atos que não são carimbo de cartório, na ordem da lista. */
  atos: T[];
  /** Os carimbos de cartório, recolhidos numa linha. */
  cartorio: T[];
}

export interface Novidades<T> {
  pedemAcao: T[];
  processos: GrupoDoProcesso<T>[];
  /** Processos em que só o cartório se mexeu — uma linha por ato. */
  soCartorio: T[];
  /** Processos distintos em toda a aba, "8 novas em 6 processos". */
  totalProcessos: number;
}

export function montarNovidades<T extends ItemDeNovidade>(
  itens: readonly T[],
  {
    pedeAcao,
    ehCartorio,
    diasAte,
  }: {
    /** O ato abriu um prazo seu, aberto e por vencer. */
    pedeAcao: (item: T) => boolean;
    /** Carimbo de cartório fora de qualquer prazo — ver `colapsavelNaLista`. */
    ehCartorio: (item: T) => boolean;
    /** Dias até o vencimento do prazo do ato — ordena "pede sua ação". */
    diasAte: (item: T) => number | null;
  },
): Novidades<T> {
  const pedemAcao: T[] = [];
  const porProcesso = new Map<string, T[]>();
  const todos = new Set<string>();

  for (const item of itens) {
    const chave = chaveDoProcesso(item);
    todos.add(chave);
    if (pedeAcao(item)) { pedemAcao.push(item); continue; }
    const lista = porProcesso.get(chave);
    if (lista) lista.push(item); else porProcesso.set(chave, [item]);
  }

  /* O mais urgente primeiro; empate fica na ordem da lista (a sort é estável),
     que é a do ato mais recente. */
  pedemAcao.sort((a, b) => (diasAte(a) ?? Infinity) - (diasAte(b) ?? Infinity));

  const processos: GrupoDoProcesso<T>[] = [];
  const soCartorio: T[] = [];
  for (const [cnj, lista] of porProcesso) {
    const atos = lista.filter(item => !ehCartorio(item));
    if (atos.length === 0) { soCartorio.push(...lista); continue; }
    processos.push({ cnj, primeiro: lista[0]!, atos, cartorio: lista.filter(ehCartorio) });
  }

  return { pedemAcao, processos, soCartorio, totalProcessos: todos.size };
}

/**
 * Sem número de processo, cada linha é o próprio grupo: juntar tudo que veio
 * com `—` num processo só inventaria um caso que não existe.
 */
function chaveDoProcesso(item: ItemDeNovidade): string {
  return item.cnj && item.cnj !== '—' ? item.cnj : `sem-processo:${item.id}`;
}

/**
 * ONDE CAI "VOCÊ VIU ATÉ AQUI" numa lista cronológica.
 *
 * Antes da primeira linha JÁ VISTA que vem depois de alguma não vista. A lista
 * é ordenada pelo ato (`ocorridoEm`) e a novidade é medida pela detecção, então
 * as duas podem se intercalar — um ato de 2024 que o backfill trouxe hoje é
 * novo e fica lá embaixo. O divisor marca a primeira fronteira e só ela: dois
 * divisores na mesma tela diriam duas coisas diferentes sobre onde se parou.
 *
 * `jaHouveNova` carrega o estado entre páginas do "carregar dias anteriores".
 */
export function posicaoDoDivisor(
  itens: readonly { id: string; naoVista?: boolean }[],
  jaHouveNova = false,
): { antesDe: string | null; houveNova: boolean } {
  let houveNova = jaHouveNova;
  for (const item of itens) {
    if (item.naoVista) { houveNova = true; continue; }
    if (houveNova) return { antesDe: item.id, houveNova };
  }
  return { antesDe: null, houveNova };
}
