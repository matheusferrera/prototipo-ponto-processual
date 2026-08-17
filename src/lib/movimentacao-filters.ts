import type { MovimentacaoFilters } from '@/lib/api.server';
import { FALLBACK_TRIBUNALS } from '@/lib/tribunals';

/**
 * Filtros da página de Movimentações — mesmo contrato do `process-filters`/`prazo-filters`:
 * a URL é a fonte da verdade, o parse sanitiza e a serialização omite os defaults.
 *
 * `/movements` filtra no banco o que sabe filtrar (`q`, `tribunal`, direção por
 * `ocorridoEm`); `tipo` não existe como campo — é inferido do texto da descrição
 * no frontend (ver `extractTipo` em `api.server.ts`) — e ordenar por tribunal
 * também não é suportado pelo backend, então os dois exigem buscar um conjunto
 * amplo e aplicar aqui, como o "contém" de Prazos.
 */
export const MOVIMENTACAO_FILTER_KEYS = ['q', 'tribunal', 'tipo', 'sort'] as const;

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

export type MovimentacaoFilterState = {
  q: string;
  tribunal: string[];
  tipo: string[];
  sort: MovimentacaoSort;
};

export type MovimentacaoSearchParams = Record<string, string | string[] | undefined>;

export const DEFAULT_MOVIMENTACAO_FILTERS: MovimentacaoFilterState = {
  q: '',
  tribunal: [],
  tipo: [],
  sort: '',
};

const FALLBACK_TRIBUNAL_CODES = FALLBACK_TRIBUNALS.map(tribunal => tribunal.code);
const ALLOWED_SORT = new Set<MovimentacaoSort>(['', 'antigas', 'tribunal']);
const ALLOWED_TIPO = new Set<string>(TIPOS_MOVIMENTACAO);

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

  return {
    q: cleanText(searchParams.q),
    tribunal: cleanCsv(searchParams.tribunal, new Set(allowedTribunals)),
    tipo: cleanCsv(searchParams.tipo, ALLOWED_TIPO),
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
    sort: filters.sort || undefined,
  };
}

export function countActiveMovimentacaoFilters(filters: MovimentacaoFilterState): number {
  return filters.tribunal.length + filters.tipo.length;
}
