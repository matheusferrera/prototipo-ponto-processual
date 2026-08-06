import {
  DEFAULT_PROCESS_FILTERS,
  parseProcessFilters,
  serializeProcessFilters,
  type ProcessFilterState,
} from '@/lib/process-filters';
import {
  normalizeProcessTablePreferences,
  type ProcessTablePreferences,
} from '@/lib/process-table-preferences';

export const PROCESS_SAVED_VIEWS_KEY = 'ponto-processual:process-views:v1';

export interface SavedProcessView {
  id: string;
  name: string;
  filters: ProcessFilterState;
  table: ProcessTablePreferences;
  createdAt: string;
  updatedAt: string;
}

export function loadSavedProcessViews(allowedTribunals?: readonly string[]): SavedProcessView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PROCESS_SAVED_VIEWS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap(value => normalizeSavedView(value, allowedTribunals)).slice(0, 30);
  } catch {
    return [];
  }
}

export function saveProcessViews(views: SavedProcessView[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROCESS_SAVED_VIEWS_KEY, JSON.stringify(views.slice(0, 30)));
  } catch {
    // A listagem continua utilizável quando o storage está indisponível.
  }
}

export function createSavedProcessView(
  name: string,
  filters: ProcessFilterState,
  table: ProcessTablePreferences,
  allowedTribunals?: readonly string[],
): SavedProcessView {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `view-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: cleanName(name),
    filters: normalizeFilters(filters, allowedTribunals),
    table: normalizeProcessTablePreferences(table),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateSavedProcessView(
  view: SavedProcessView,
  updates: Partial<Pick<SavedProcessView, 'name' | 'filters' | 'table'>>,
  allowedTribunals?: readonly string[],
): SavedProcessView {
  return {
    ...view,
    name: updates.name === undefined ? view.name : cleanName(updates.name),
    filters: updates.filters === undefined ? view.filters : normalizeFilters(updates.filters, allowedTribunals),
    table: updates.table === undefined ? view.table : normalizeProcessTablePreferences(updates.table),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeSavedView(value: unknown, allowedTribunals?: readonly string[]): SavedProcessView[] {
  if (!value || typeof value !== 'object') return [];
  const source = value as Record<string, unknown>;
  if (typeof source.id !== 'string' || typeof source.name !== 'string') return [];
  const createdAt = validIso(source.createdAt) ?? new Date().toISOString();
  const updatedAt = validIso(source.updatedAt) ?? createdAt;
  return [{
    id: source.id,
    name: cleanName(source.name),
    filters: normalizeFilters(source.filters, allowedTribunals),
    table: normalizeProcessTablePreferences(source.table),
    createdAt,
    updatedAt,
  }];
}

function normalizeFilters(value: unknown, allowedTribunals?: readonly string[]): ProcessFilterState {
  if (!value || typeof value !== 'object') return { ...DEFAULT_PROCESS_FILTERS };
  const source = value as Partial<ProcessFilterState>;
  const candidate = {
    ...DEFAULT_PROCESS_FILTERS,
    ...source,
    tribunal: Array.isArray(source.tribunal) ? source.tribunal : [],
    status: Array.isArray(source.status) ? source.status : [],
  } as ProcessFilterState;
  const params = serializeProcessFilters(candidate);
  return parseProcessFilters(Object.fromEntries(params.entries()), allowedTribunals);
}

function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 60) || 'Visualização sem nome';
}

function validIso(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
