import type {
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  VisibilityState,
} from '@tanstack/react-table';

export const PROCESS_TABLE_PREFERENCES_KEY = 'ponto-processual:process-table:v1';

export const PROCESS_COLUMN_IDS = [
  'state',
  'tribunal',
  'cnj',
  'prazo',
  'orgaoJulgador',
  'classeJudicial',
  'assunto',
  'poloAtivo',
  'poloPassivo',
  'valorCausa',
  'autuadoEm',
  'ultimaMov',
  'lastMovAt',
  'movimentacoes',
  'lastScrapedAt',
  'syncStatus',
  'grau',
  'statusProcesso',
  'whatsEnabled',
] as const;

export type ProcessColumnId = (typeof PROCESS_COLUMN_IDS)[number];
export type ProcessTableDensity = 'compact' | 'comfortable' | 'spacious';

export interface ProcessTablePreferences {
  version: 1;
  columnOrder: ColumnOrderState;
  columnVisibility: VisibilityState;
  columnSizing: ColumnSizingState;
  columnPinning: ColumnPinningState;
  density: ProcessTableDensity;
  fontSize: number;
}

export const PROCESS_COLUMN_LABELS: Record<ProcessColumnId, string> = {
  state: 'Estado',
  tribunal: 'Tribunal',
  cnj: 'Número CNJ',
  prazo: 'Próximo prazo',
  orgaoJulgador: 'Órgão julgador',
  classeJudicial: 'Classe judicial',
  assunto: 'Assunto',
  poloAtivo: 'Polo ativo',
  poloPassivo: 'Polo passivo',
  valorCausa: 'Valor da causa',
  autuadoEm: 'Data de autuação',
  ultimaMov: 'Última movimentação',
  lastMovAt: 'Data da última movimentação',
  movimentacoes: 'Movimentações',
  lastScrapedAt: 'Última verificação',
  syncStatus: 'Sincronização',
  grau: 'Grau',
  statusProcesso: 'Situação',
  whatsEnabled: 'Monitoramento',
};

const DEFAULT_VISIBILITY: VisibilityState = {
  state: true,
  tribunal: true,
  cnj: true,
  prazo: true,
  orgaoJulgador: true,
  classeJudicial: false,
  assunto: true,
  poloAtivo: true,
  poloPassivo: false,
  valorCausa: false,
  autuadoEm: false,
  ultimaMov: true,
  lastMovAt: false,
  movimentacoes: false,
  lastScrapedAt: false,
  syncStatus: false,
  grau: false,
  statusProcesso: false,
  whatsEnabled: false,
};

const DEFAULT_SIZING: ColumnSizingState = {
  state: 72,
  tribunal: 96,
  cnj: 230,
  prazo: 150,
  orgaoJulgador: 220,
  classeJudicial: 190,
  assunto: 240,
  poloAtivo: 210,
  poloPassivo: 210,
  valorCausa: 150,
  autuadoEm: 150,
  ultimaMov: 260,
  lastMovAt: 180,
  movimentacoes: 130,
  lastScrapedAt: 160,
  syncStatus: 150,
  grau: 80,
  statusProcesso: 130,
  whatsEnabled: 150,
};

export function createDefaultProcessTablePreferences(): ProcessTablePreferences {
  return {
    version: 1,
    columnOrder: [...PROCESS_COLUMN_IDS],
    columnVisibility: { ...DEFAULT_VISIBILITY },
    columnSizing: { ...DEFAULT_SIZING },
    columnPinning: { left: ['state', 'cnj'], right: [] },
    density: 'comfortable',
    fontSize: 14,
  };
}

const isColumnId = (value: unknown): value is ProcessColumnId =>
  typeof value === 'string' && (PROCESS_COLUMN_IDS as readonly string[]).includes(value);

function normalizedOrder(value: unknown): ColumnOrderState {
  const supplied = Array.isArray(value) ? value.filter(isColumnId) : [];
  return [...new Set([...supplied, ...PROCESS_COLUMN_IDS])];
}

function normalizedVisibility(value: unknown): VisibilityState {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const defaults = createDefaultProcessTablePreferences().columnVisibility;
  const result: VisibilityState = {};
  for (const id of PROCESS_COLUMN_IDS) {
    result[id] = typeof source[id] === 'boolean' ? source[id] as boolean : defaults[id];
  }
  return result;
}

function normalizedSizing(value: unknown): ColumnSizingState {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const defaults = createDefaultProcessTablePreferences().columnSizing;
  const result: ColumnSizingState = {};
  for (const id of PROCESS_COLUMN_IDS) {
    const size = source[id];
    result[id] = typeof size === 'number' && Number.isFinite(size)
      ? Math.min(520, Math.max(48, Math.round(size)))
      : defaults[id];
  }
  return result;
}

function normalizedPinning(value: unknown): ColumnPinningState {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const left = Array.isArray(source.left)
    ? source.left.filter(isColumnId)
    : createDefaultProcessTablePreferences().columnPinning.left ?? [];
  return { left: [...new Set(left)], right: [] };
}

export function normalizeProcessTablePreferences(value: unknown): ProcessTablePreferences {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const density: ProcessTableDensity = source.density === 'compact' || source.density === 'spacious'
    ? source.density
    : 'comfortable';
  const fontSize = typeof source.fontSize === 'number' && Number.isFinite(source.fontSize)
    ? Math.min(18, Math.max(12, Math.round(source.fontSize)))
    : 14;

  return {
    version: 1,
    columnOrder: normalizedOrder(source.columnOrder),
    columnVisibility: normalizedVisibility(source.columnVisibility),
    columnSizing: normalizedSizing(source.columnSizing),
    columnPinning: normalizedPinning(source.columnPinning),
    density,
    fontSize,
  };
}

export function loadProcessTablePreferences(): ProcessTablePreferences {
  const defaults = createDefaultProcessTablePreferences();
  if (typeof window === 'undefined') return defaults;

  try {
    const stored = window.localStorage.getItem(PROCESS_TABLE_PREFERENCES_KEY);
    if (!stored) return defaults;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || (parsed as { version?: unknown }).version !== 1) return defaults;
    return normalizeProcessTablePreferences(parsed);
  } catch {
    return defaults;
  }
}

export function saveProcessTablePreferences(preferences: ProcessTablePreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      PROCESS_TABLE_PREFERENCES_KEY,
      JSON.stringify(normalizeProcessTablePreferences(preferences)),
    );
  } catch {
    // Storage pode estar indisponível (modo privado, quota ou política do navegador).
  }
}
