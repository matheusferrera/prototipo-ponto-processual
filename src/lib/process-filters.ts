import type { ProcessoFilters } from '@/lib/api.server';

export const PROCESS_FILTER_KEYS = [
  'q',
  'tribunal',
  'grau',
  'state',
  'status',
  'monitored',
  'assunto',
  'classe',
  'orgao',
  'valorMin',
  'valorMax',
  'autuadoFrom',
  'autuadoTo',
  'movFrom',
  'movTo',
  'sort',
  'order',
] as const;

export type ProcessFilterKey = (typeof PROCESS_FILTER_KEYS)[number];
export type ProcessSort = 'recent' | 'cnj' | 'tribunal' | 'valor' | 'autuado';
export type ProcessOrder = 'asc' | 'desc';

export type ProcessFilterState = {
  q: string;
  tribunal: string[];
  grau: '' | '1' | '2';
  state: '' | 'signal' | 'alert' | 'quiet';
  status: string[];
  monitored: '' | 'true' | 'false';
  assunto: string;
  classe: string;
  orgao: string;
  valorMin: string;
  valorMax: string;
  autuadoFrom: string;
  autuadoTo: string;
  movFrom: string;
  movTo: string;
  sort: ProcessSort;
  order: ProcessOrder;
};

export type ProcessSearchParams = Record<string, string | string[] | undefined>;

export const DEFAULT_PROCESS_FILTERS: ProcessFilterState = {
  q: '',
  tribunal: [],
  grau: '',
  state: '',
  status: [],
  monitored: '',
  assunto: '',
  classe: '',
  orgao: '',
  valorMin: '',
  valorMax: '',
  autuadoFrom: '',
  autuadoTo: '',
  movFrom: '',
  movTo: '',
  sort: 'recent',
  order: 'desc',
};

const ALLOWED_TRIBUNAIS = new Set(['TJBA', 'TJDFT', 'TJPI', 'TJRN', 'TRF1', 'TRF2', 'TRF3']);
const ALLOWED_STATUS = new Set(['active', 'archived']);
const ALLOWED_STATE = new Set(['signal', 'alert', 'quiet']);
const ALLOWED_SORT = new Set<ProcessSort>(['recent', 'cnj', 'tribunal', 'valor', 'autuado']);
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

function cleanNumber(value: string | string[] | undefined): string {
  const raw = cleanText(value).replace(',', '.');
  if (!raw) return '';
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? String(number) : '';
}

export function parseProcessFilters(searchParams: ProcessSearchParams): ProcessFilterState {
  const stateValue = cleanText(searchParams.state);
  const sortValue = cleanText(searchParams.sort) as ProcessSort;
  const orderValue = cleanText(searchParams.order);
  const sort = ALLOWED_SORT.has(sortValue) ? sortValue : 'recent';
  const grauValue = cleanText(searchParams.grau);
  const monitoredValue = cleanText(searchParams.monitored);

  return {
    q: cleanText(searchParams.q),
    tribunal: cleanCsv(searchParams.tribunal, ALLOWED_TRIBUNAIS),
    grau: grauValue === '1' || grauValue === '2' ? grauValue : '',
    state: ALLOWED_STATE.has(stateValue) ? stateValue as ProcessFilterState['state'] : '',
    status: cleanCsv(searchParams.status, ALLOWED_STATUS),
    monitored: monitoredValue === 'true' || monitoredValue === 'false' ? monitoredValue : '',
    assunto: cleanText(searchParams.assunto),
    classe: cleanText(searchParams.classe),
    orgao: cleanText(searchParams.orgao),
    valorMin: cleanNumber(searchParams.valorMin),
    valorMax: cleanNumber(searchParams.valorMax),
    autuadoFrom: cleanDate(searchParams.autuadoFrom),
    autuadoTo: cleanDate(searchParams.autuadoTo),
    movFrom: cleanDate(searchParams.movFrom),
    movTo: cleanDate(searchParams.movTo),
    sort,
    order: orderValue === 'asc' || orderValue === 'desc' ? orderValue : defaultOrderFor(sort),
  };
}

export function serializeProcessFilters(filters: ProcessFilterState, page?: number): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string) => {
    if (value.trim()) params.set(key, value.trim());
  };

  set('q', filters.q);
  set('tribunal', filters.tribunal.join(','));
  set('grau', filters.grau);
  set('state', filters.state);
  set('status', filters.status.join(','));
  set('monitored', filters.monitored);
  set('assunto', filters.assunto);
  set('classe', filters.classe);
  set('orgao', filters.orgao);
  set('valorMin', filters.valorMin);
  set('valorMax', filters.valorMax);
  set('autuadoFrom', filters.autuadoFrom);
  set('autuadoTo', filters.autuadoTo);
  set('movFrom', filters.movFrom);
  set('movTo', filters.movTo);

  if (filters.sort !== DEFAULT_PROCESS_FILTERS.sort) params.set('sort', filters.sort);
  if (filters.order !== defaultOrderFor(filters.sort)) params.set('order', filters.order);
  if (page && page > 1) params.set('page', String(Math.trunc(page)));
  return params;
}

export function processFiltersToRecord(filters: ProcessFilterState, page?: number): Record<string, string | undefined> {
  const params = serializeProcessFilters(filters, page);
  return Object.fromEntries(params.entries());
}

export function processFiltersToApi(filters: ProcessFilterState): ProcessoFilters {
  return {
    q: filters.q || undefined,
    tribunal: filters.tribunal.length ? filters.tribunal : undefined,
    grau: filters.grau || undefined,
    state: filters.state || undefined,
    status: filters.status.length ? filters.status : undefined,
    monitored: filters.monitored || undefined,
    assunto: filters.assunto || undefined,
    classe: filters.classe || undefined,
    orgao: filters.orgao || undefined,
    valorMin: filters.valorMin || undefined,
    valorMax: filters.valorMax || undefined,
    autuadoFrom: startOfDay(filters.autuadoFrom),
    autuadoTo: endOfDay(filters.autuadoTo),
    movFrom: startOfDay(filters.movFrom),
    movTo: endOfDay(filters.movTo),
    sort: filters.sort,
    order: filters.order,
  };
}

export function defaultOrderFor(sort: ProcessSort): ProcessOrder {
  return sort === 'cnj' || sort === 'tribunal' ? 'asc' : 'desc';
}

export function countActiveProcessFilters(filters: ProcessFilterState): number {
  return filters.tribunal.length +
    filters.status.length +
    Number(Boolean(filters.grau)) +
    Number(Boolean(filters.state)) +
    Number(Boolean(filters.monitored)) +
    Number(Boolean(filters.assunto)) +
    Number(Boolean(filters.classe)) +
    Number(Boolean(filters.orgao)) +
    Number(Boolean(filters.valorMin || filters.valorMax)) +
    Number(Boolean(filters.autuadoFrom || filters.autuadoTo)) +
    Number(Boolean(filters.movFrom || filters.movTo));
}

function startOfDay(value: string): string | undefined {
  return value ? `${value}T00:00:00.000-03:00` : undefined;
}

function endOfDay(value: string): string | undefined {
  return value ? `${value}T23:59:59.999-03:00` : undefined;
}
