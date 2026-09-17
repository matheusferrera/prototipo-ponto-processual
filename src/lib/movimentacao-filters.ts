import type { MovimentacaoFilters } from '@/lib/api.server';
import { CATEGORIA_VALUES } from '@/lib/categoria-movimentacao';
import { FALLBACK_TRIBUNALS } from '@/lib/tribunals';
import type { CategoriaMovimentacao, OrigemMovimentacao } from '@/types';

/**
 * Filtros da página de Movimentações — mesmo contrato do `process-filters`/`prazo-filters`:
 * a URL é a fonte da verdade, o parse sanitiza e a serialização omite os defaults.
 *
 * `/movements` filtra no banco o que sabe filtrar (`q`, `tribunal`, `categoria`,
 * `origem`, direção por `ocorridoEm`); `tipo` não existe como campo — é inferido do texto da descrição
 * no frontend (ver `extractTipo` em `api.server.ts`) — e ordenar por tribunal
 * também não é suportado pelo backend, então os dois exigem buscar um conjunto
 * amplo e aplicar aqui, como o "contém" de Prazos.
 */
/**
 * Linhas por página da lista de todas.
 *
 * Eram 20, o que num acervo real dá 324 páginas; com a linha em ~60px, 50 cabem
 * em menos rolagem do que as 20 de antes ocupavam a 140px. Mora aqui porque a
 * página e a rota do "carregar dias anteriores" precisam do MESMO número — com
 * dois, a página 2 repetiria ou pularia linhas.
 */
export const MOVIMENTACOES_POR_PAGINA = 50;

export const MOVIMENTACAO_FILTER_KEYS = ['q', 'tribunal', 'tipo', 'categoria', 'origem', 'quem', 'sort'] as const;

export type MovimentacaoFilterKey = (typeof MOVIMENTACAO_FILTER_KEYS)[number];
export type MovimentacaoSort = '' | 'antigas' | 'tribunal';

/**
 * Tipos de movimentação reconhecidos a partir da descrição (ver `extractTipo`
 * em `api.server.ts`) — mesma lista usada para classificar e para popular o
 * filtro, então todo tipo que aparece no feed é sempre filtrável.
 */
export const TIPOS_MOVIMENTACAO = [
  'Acórdão', 'Audiência', 'Certidão', 'Conclusão', 'Despacho',
  'Embargo', 'Intimação', 'Juntada', 'Publicação', 'Recurso', 'Sentença',
] as const;

/**
 * As origens que o filtro oferece — e por que são DUAS das cinco.
 *
 * No fluxo PDPJ+DJEN o mesmo ato vira DUAS linhas, uma por fonte: o pareamento
 * carimba `fontes` nas duas e não apaga nenhuma, porque cada uma carrega o que
 * a outra não tem (o diário traz o inteiro teor e o ato endereçado; o portal
 * traz todo movimento, inclusive o que nunca foi publicado). Escolher a origem
 * é o que colapsa o feed na leitura de UMA fonte — é o único filtro daqui que
 * desdobra a repetição em vez de estreitar o assunto.
 *
 * `scraper`, `tribunalPublico` e `datajud` existem no enum e não entram aqui:
 * nenhum tem par para desempatar, e oferecê-los daria três opções que devolvem
 * lista vazia na carteira de hoje. Voltar a listá-los é acrescentar a linha.
 */
export const ORIGENS_MOVIMENTACAO = [
  { value: 'pdpj', label: 'Portal (PDPJ)', descricao: 'Portal de Serviços do PDPJ (CNJ)' },
  { value: 'djen', label: 'Diário (DJEN)', descricao: 'Diário de Justiça Eletrônico Nacional (CNJ)' },
] as const satisfies readonly { value: OrigemMovimentacao; label: string; descricao: string }[];

/** `''` = todas as origens, que é o padrão do feed. */
export type MovimentacaoOrigem = '' | (typeof ORIGENS_MOVIMENTACAO)[number]['value'];

const ORIGEM_POR_VALOR = new Map<string, (typeof ORIGENS_MOVIMENTACAO)[number]>(
  ORIGENS_MOVIMENTACAO.map(origem => [origem.value as string, origem]),
);

/** O rótulo do filtro de origem, para o chip. `''` volta vazio. */
export function origemMovimentacaoLabel(origem: MovimentacaoOrigem): string {
  return origem ? ORIGEM_POR_VALOR.get(origem)?.label ?? '' : '';
}

/**
 * De quem é a providência — o filtro que a tela de 17/09/2026 acrescentou.
 *
 * `comigo` INCLUI o que ainda não se sabe de quem é: a leitura por IA cobre uma
 * fração pequena dos atos, e um filtro "comigo" que escondesse os não lidos
 * esconderia justamente o que pode ser seu — o erro na direção cara. `outra`
 * só traz o que foi AFIRMADO como da parte contrária ou de terceiro.
 */
export const QUEM_MOVIMENTACAO = [
  { value: 'comigo', label: 'Comigo' },
  { value: 'outra', label: 'Outra parte' },
  { value: '', label: 'Qualquer' },
] as const;

export type MovimentacaoQuem = (typeof QUEM_MOVIMENTACAO)[number]['value'];

export type MovimentacaoFilterState = {
  q: string;
  tribunal: string[];
  tipo: string[];
  /**
   * Categorias do ato, filtradas NO BANCO (diferente de `tipo`, que é inferido
   * do texto aqui). Vazio deixa valer o padrão da API, que esconde o trâmite de
   * cartório — 43% da movimentação pública, medido em 05/09/2026.
   */
  categoria: CategoriaMovimentacao[];
  /**
   * A fonte que escreveu a linha, filtrada NO BANCO (`?origem=` de
   * `/movements`). É uma só de cada vez: o backend aceita um valor, e a
   * pergunta que ela responde ("quero ler pelo diário") não é acumulativa —
   * marcar as duas é o mesmo que não filtrar, que é o padrão.
   */
  origem: MovimentacaoOrigem;
  quem: MovimentacaoQuem;
  sort: MovimentacaoSort;
};

export type MovimentacaoSearchParams = Record<string, string | string[] | undefined>;

export const DEFAULT_MOVIMENTACAO_FILTERS: MovimentacaoFilterState = {
  q: '',
  tribunal: [],
  tipo: [],
  categoria: [],
  origem: '',
  quem: '',
  sort: '',
};

const FALLBACK_TRIBUNAL_CODES = FALLBACK_TRIBUNALS.map(tribunal => tribunal.code);
const ALLOWED_SORT = new Set<MovimentacaoSort>(['', 'antigas', 'tribunal']);
const ALLOWED_TIPO = new Set<string>(TIPOS_MOVIMENTACAO);
const ALLOWED_CATEGORIA = new Set<string>(CATEGORIA_VALUES);
const ALLOWED_ORIGEM = new Set<string>(ORIGENS_MOVIMENTACAO.map(origem => origem.value));
const ALLOWED_QUEM = new Set<string>(['comigo', 'outra']);

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function cleanText(value: string | string[] | undefined): string {
  return first(value).trim();
}

function cleanCsv(value: string | string[] | undefined, allowed: Set<string>): string[] {
  return [...new Set(first(value).split(',').map(item => item.trim()).filter(item => allowed.has(item)))];
}

export function parseMovimentacaoFilters(
  searchParams: MovimentacaoSearchParams,
  allowedTribunals: readonly string[] = FALLBACK_TRIBUNAL_CODES,
): MovimentacaoFilterState {
  const sortValue = cleanText(searchParams.sort) as MovimentacaoSort;
  const origemValue = cleanText(searchParams.origem) as MovimentacaoOrigem;
  const quemValue = cleanText(searchParams.quem) as MovimentacaoQuem;

  return {
    q: cleanText(searchParams.q),
    tribunal: cleanCsv(searchParams.tribunal, new Set(allowedTribunals)),
    tipo: cleanCsv(searchParams.tipo, ALLOWED_TIPO),
    categoria: cleanCsv(searchParams.categoria, ALLOWED_CATEGORIA) as CategoriaMovimentacao[],
    origem: ALLOWED_ORIGEM.has(origemValue) ? origemValue : '',
    quem: ALLOWED_QUEM.has(quemValue) ? quemValue : '',
    sort: ALLOWED_SORT.has(sortValue) ? sortValue : '',
  };
}

export function serializeMovimentacaoFilters(filters: MovimentacaoFilterState, page?: number): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string) => {
    if (value.trim()) params.set(key, value.trim());
  };

  set('q', filters.q);
  set('tribunal', filters.tribunal.join(','));
  set('tipo', filters.tipo.join(','));
  set('categoria', filters.categoria.join(','));
  set('origem', filters.origem);
  set('quem', filters.quem);
  if (filters.sort) params.set('sort', filters.sort);
  if (page && page > 1) params.set('page', String(Math.trunc(page)));
  return params;
}

export function movimentacaoFiltersToRecord(filters: MovimentacaoFilterState, page?: number): Record<string, string | undefined> {
  return Object.fromEntries(serializeMovimentacaoFilters(filters, page).entries());
}

export function movimentacaoFiltersToApi(filters: MovimentacaoFilterState): MovimentacaoFilters {
  return {
    q: filters.q || undefined,
    tribunal: filters.tribunal.length ? filters.tribunal : undefined,
    tipo: filters.tipo.length ? filters.tipo : undefined,
    categoria: filters.categoria.length ? filters.categoria : undefined,
    origem: filters.origem || undefined,
    quem: filters.quem || undefined,
    sort: filters.sort || undefined,
  };
}

export function countActiveMovimentacaoFilters(filters: MovimentacaoFilterState): number {
  return filters.tribunal.length + filters.tipo.length + filters.categoria.length
    + Number(Boolean(filters.origem)) + Number(Boolean(filters.quem));
}

/**
 * As categorias como INTERRUPTORES LIGADOS — a leitura da tela nova.
 *
 * Na URL, lista vazia quer dizer "todas" (e é o padrão). Na tela, as cinco
 * aparecem ligadas e a pessoa desliga o que não quer ver; por isso a lista
 * vazia é lida como "todas ligadas", e ligar a última que faltava volta a
 * lista para vazia — senão "todas marcadas" e "nenhum filtro" seriam duas URLs
 * para a mesma tela.
 */
export function categoriaLigada(ativas: readonly CategoriaMovimentacao[], categoria: CategoriaMovimentacao): boolean {
  return ativas.length === 0 || ativas.includes(categoria);
}

export function alternarCategoria(
  ativas: readonly CategoriaMovimentacao[],
  categoria: CategoriaMovimentacao,
): CategoriaMovimentacao[] {
  const ligadas = ativas.length === 0 ? [...CATEGORIA_VALUES] as CategoriaMovimentacao[] : [...ativas];
  const proximas = ligadas.includes(categoria)
    ? ligadas.filter(item => item !== categoria)
    : [...ligadas, categoria];
  // Todas ligadas é o padrão — e desligar a última não pode virar "todas".
  if (proximas.length === CATEGORIA_VALUES.length) return [];
  return CATEGORIA_VALUES.filter(item => proximas.includes(item)) as CategoriaMovimentacao[];
}

const CATEGORIA_NA_FRASE: Record<string, string> = {
  decisorio: 'decisões',
  atoDeParte: 'petições',
  publicacao: 'publicações',
  prazo: 'prazos',
};

/**
 * O recorte da lista numa frase — "Decisões, petições, publicações e prazos ·
 * cartório recolhido".
 *
 * É o que a lista de todas mostra no celular no lugar da faixa de pílulas: a
 * faixa gastava 88px antes da primeira movimentação, e a frase diz o mesmo
 * numa linha, com "Mudar" ao lado abrindo a folha de filtros.
 */
export function resumoDosFiltros(filtros: MovimentacaoFilterState): string {
  const ligadas = Object.keys(CATEGORIA_NA_FRASE)
    .filter(chave => categoriaLigada(filtros.categoria, chave as CategoriaMovimentacao))
    .map(chave => CATEGORIA_NA_FRASE[chave]!);
  const cartorio = categoriaLigada(filtros.categoria, 'tramite');

  const partes = [
    ligadas.length ? juntar(ligadas) : 'Só cartório',
    ligadas.length ? (cartorio ? 'cartório recolhido' : 'sem cartório') : null,
    filtros.quem === 'comigo' ? 'só o que é com você' : filtros.quem === 'outra' ? 'só da outra parte' : null,
    filtros.tribunal.length ? filtros.tribunal.join(', ') : null,
    filtros.origem ? origemMovimentacaoLabel(filtros.origem) : null,
    filtros.q ? `busca: “${filtros.q}”` : null,
    filtros.sort === 'antigas' ? 'mais antigas primeiro' : filtros.sort === 'tribunal' ? 'por tribunal' : null,
  ].filter(Boolean) as string[];

  const frase = partes.join(' · ');
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

function juntar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`;
}
