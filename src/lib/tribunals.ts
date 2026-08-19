export type TribunalSystem = 'PJe' | 'Projudi' | 'e-Proc' | 'CPE' | 'DJEN';

export type TribunalOption = {
  code: string;
  system: TribunalSystem;
};

export const FALLBACK_TRIBUNALS: readonly TribunalOption[] = [
  { code: 'STJ', system: 'CPE' },
  { code: 'TJAM', system: 'Projudi' },
  { code: 'TJBA', system: 'PJe' },
  { code: 'TJDFT', system: 'PJe' },
  { code: 'TJPI', system: 'PJe' },
  { code: 'TJRN', system: 'PJe' },
  { code: 'TRF1', system: 'PJe' },
  { code: 'TRF2', system: 'e-Proc' },
  { code: 'TRF3', system: 'PJe' },
  { code: 'DJEN', system: 'DJEN' },
];

const SYSTEMS = new Set<TribunalSystem>(['PJe', 'Projudi', 'e-Proc', 'CPE', 'DJEN']);
const CODE_RE = /^[A-Z0-9]+$/;


/**
 * Rótulo da tag de tribunal: `"TJDFT-1º"` quando há grau — confirmado (origem
 * scraper) ou palpite (origem djen, ver `grauProvavelDoOrgao` no backend); só
 * `"TJDFT"` quando o grau ainda é desconhecido (`grau` vazio ou `'DJEN'` —
 * mostrar "TJDFT-DJEN" sugeriria um grau que não existe).
 */
export function tribunalTagLabel(tribunal: string, grau: string): string {
  return grau && grau !== 'DJEN' ? `${tribunal}-${grau}` : tribunal;
}

/** Rótulo legível de `origem`: `scraper` → "Robô (scraper)"; `djen` → "DJEN"; vazio → "—". */
export function origemLabel(origem: 'scraper' | 'djen' | ''): string {
  if (origem === 'scraper') return 'Sincronização Integrada';
  if (origem === 'djen') return 'Diário Oficial';
  return '—';
}

export function normalizeTribunalOptions(value: unknown): TribunalOption[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tribunals: TribunalOption[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const { code, system } = item as Record<string, unknown>;
    if (typeof code !== 'string' || !CODE_RE.test(code)) continue;
    // Rejeita códigos que terminam com G1 ou G2 (o backend entrega sem grau)
    // Aceita os que terminam com DJEN
    if (/G[12]$/.test(code)) continue;
    if (typeof system !== 'string' || !SYSTEMS.has(system as TribunalSystem)) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    tribunals.push({ code, system: system as TribunalSystem });
  }
  return tribunals;
}
