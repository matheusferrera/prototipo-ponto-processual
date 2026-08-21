import type { PrazoFilters } from '@/lib/api.server';
import { FALLBACK_TRIBUNALS } from '@/lib/tribunals';

/**
 * Filtros da página de Prazos — mesmo contrato do `process-filters`: a URL é a
 * fonte da verdade, o parse sanitiza e a serialização omite os defaults.
 *
 * Parte é resolvida no backend (`/deadlines` filtra q, tipoDocumento, fechado e
 * faixa de dataLimite); o resto — tribunal, grau, urgência, assunto,
 * órgão e cliente — é aplicado sobre a página carregada, como já
 * acontece nas agregações da carteira.
 */
export const PRAZO_FILTER_KEYS = [
  'q',
  'tribunal',
  'grau',
  'origem',
  'urgencia',
  'situacao',
  'natureza',
  'tipo',
  'assunto',
  'orgao',
  'cliente',
  'fatalFrom',
  'fatalTo',
  'sort',
  'order',
  'view',
] as const;

export type PrazoFilterKey = (typeof PRAZO_FILTER_KEYS)[number];
export type PrazoSort = 'fatal' | 'tribunal' | 'cliente' | 'expediente';
export type PrazoOrder = 'asc' | 'desc';
export type PrazoUrgencia = '' | 'critico' | 'urgente' | 'atencao' | 'normal';
export type PrazoSituacao = '' | 'pendente' | 'fechado';
/**
 * O que o prazo cobra: tomar ciência do ato ou manifestar-se sobre ele.
 * Resolvido no backend (`/deadlines?natureza=`) — prazo sem natureza
 * reconhecida não entra em nenhuma das duas opções.
 */
export type PrazoNatureza = '' | 'ciencia' | 'manifestacao';
export type PrazoView = 'lista' | 'kanban' | 'calendario';

export type PrazoFilterState = {
  q: string;
  tribunal: string[];
  grau: '' | '1' | '2' | 'djen';
  /** Origem do dado: `scraper` (robô autenticado) ou `djen` (descoberta pública). */
  origem: '' | 'scraper' | 'djen';
  urgencia: PrazoUrgencia;
  situacao: PrazoSituacao;
  natureza: PrazoNatureza;
  tipo: string;
  assunto: string;
  orgao: string;
  cliente: string;
  fatalFrom: string;
  fatalTo: string;
  sort: PrazoSort;
  order: PrazoOrder;
  view: PrazoView;
};

export type PrazoSearchParams = Record<string, string | string[] | undefined>;

export const DEFAULT_PRAZO_FILTERS: PrazoFilterState = {
  q: '',
  tribunal: [],
  grau: '',
  origem: '',
  urgencia: '',
  situacao: '',
  natureza: '',
  tipo: '',
  assunto: '',
  orgao: '',
  cliente: '',
  fatalFrom: '',
  fatalTo: '',
  sort: 'fatal',
  order: 'asc',
  view: 'lista',
};

const FALLBACK_TRIBUNAL_CODES = FALLBACK_TRIBUNALS.map(tribunal => tribunal.code);
const ALLOWED_SORT = new Set<PrazoSort>(['fatal', 'tribunal', 'cliente', 'expediente']);
const ALLOWED_URGENCIA = new Set(['critico', 'urgente', 'atencao', 'normal']);
const ALLOWED_SITUACAO = new Set(['pendente', 'fechado']);
const ALLOWED_NATUREZA = new Set(['ciencia', 'manifestacao']);
const ALLOWED_VIEW = new Set<PrazoView>(['lista', 'kanban', 'calendario']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function cleanText(value: string | string[] | undefined): string {
  return first(value).trim();
}

function cleanCsv(value: string | string[] | undefined, allowed: Set<string>): string[] {
  return [...new Set(first(value).split(',').map(item => item.trim()).filter(item => allowed.has(item)))];
}

function cleanDate(value: string | string[] | undefined): string {
  const date = cleanText(value);
  return DATE_RE.test(date) ? date : '';
}

export function parsePrazoFilters(
  searchParams: PrazoSearchParams,
  allowedTribunals: readonly string[] = FALLBACK_TRIBUNAL_CODES,
): PrazoFilterState {
  const sortValue = cleanText(searchParams.sort) as PrazoSort;
  const sort = ALLOWED_SORT.has(sortValue) ? sortValue : DEFAULT_PRAZO_FILTERS.sort;
  const orderValue = cleanText(searchParams.order);
  const grauValue = cleanText(searchParams.grau);
  const origemValue = cleanText(searchParams.origem);
  const urgenciaValue = cleanText(searchParams.urgencia);
  const situacaoValue = cleanText(searchParams.situacao);
  const naturezaValue = cleanText(searchParams.natureza);
  const viewValue = cleanText(searchParams.view) as PrazoView;

  return {
    q: cleanText(searchParams.q),
    tribunal: cleanCsv(searchParams.tribunal, new Set(allowedTribunals)),
    grau: grauValue === '1' || grauValue === '2' || grauValue === 'djen' ? grauValue : '',
    origem: origemValue === 'scraper' || origemValue === 'djen' ? origemValue : '',
    urgencia: ALLOWED_URGENCIA.has(urgenciaValue) ? urgenciaValue as PrazoUrgencia : '',
    situacao: ALLOWED_SITUACAO.has(situacaoValue) ? situacaoValue as PrazoSituacao : '',
    natureza: ALLOWED_NATUREZA.has(naturezaValue) ? naturezaValue as PrazoNatureza : '',
    tipo: cleanText(searchParams.tipo),
    assunto: cleanText(searchParams.assunto),
    orgao: cleanText(searchParams.orgao),
    cliente: cleanText(searchParams.cliente),
    fatalFrom: cleanDate(searchParams.fatalFrom),
    fatalTo: cleanDate(searchParams.fatalTo),
    sort,
    order: orderValue === 'asc' || orderValue === 'desc' ? orderValue : defaultOrderFor(),
    view: ALLOWED_VIEW.has(viewValue) ? viewValue : 'lista',
  };
}

export function serializePrazoFilters(filters: PrazoFilterState): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string) => {
    if (value.trim()) params.set(key, value.trim());
  };

  set('q', filters.q);
  set('tribunal', filters.tribunal.join(','));
  set('grau', filters.grau);
  set('origem', filters.origem);
  set('urgencia', filters.urgencia);
  set('situacao', filters.situacao);
  set('natureza', filters.natureza);
  set('tipo', filters.tipo);
  set('assunto', filters.assunto);
  set('orgao', filters.orgao);
  set('cliente', filters.cliente);
  set('fatalFrom', filters.fatalFrom);
  set('fatalTo', filters.fatalTo);

  if (filters.sort !== DEFAULT_PRAZO_FILTERS.sort) params.set('sort', filters.sort);
  if (filters.order !== defaultOrderFor()) params.set('order', filters.order);
  if (filters.view !== DEFAULT_PRAZO_FILTERS.view) params.set('view', filters.view);
  return params;
}

export function prazoFiltersToRecord(filters: PrazoFilterState): Record<string, string | undefined> {
  return Object.fromEntries(serializePrazoFilters(filters).entries());
}

export function prazoFiltersToApi(filters: PrazoFilterState): PrazoFilters {
  return {
    q: filters.q || undefined,
    tribunal: filters.tribunal.length ? filters.tribunal : undefined,
    grau: filters.grau || undefined,
    origem: filters.origem || undefined,
    urgencia: filters.urgencia || undefined,
    situacao: filters.situacao || undefined,
    natureza: filters.natureza || undefined,
    tipo: filters.tipo || undefined,
    assunto: filters.assunto || undefined,
    orgao: filters.orgao || undefined,
    cliente: filters.cliente || undefined,
    fatalFrom: filters.fatalFrom || undefined,
    fatalTo: filters.fatalTo || undefined,
    sort: filters.sort,
    order: filters.order,
  };
}

/** Prazo é uma fila: por padrão o mais próximo primeiro, e texto em A–Z — tudo asc. */
export function defaultOrderFor(): PrazoOrder {
  return 'asc';
}

export function countActivePrazoFilters(filters: PrazoFilterState): number {
  return filters.tribunal.length +
    Number(Boolean(filters.grau)) +
    Number(Boolean(filters.origem)) +
    Number(Boolean(filters.urgencia)) +
    Number(Boolean(filters.situacao)) +
    Number(Boolean(filters.natureza)) +
    Number(Boolean(filters.tipo)) +
    Number(Boolean(filters.assunto)) +
    Number(Boolean(filters.orgao)) +
    Number(Boolean(filters.cliente)) +
    Number(Boolean(filters.fatalFrom || filters.fatalTo));
}
