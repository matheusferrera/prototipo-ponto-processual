export type TribunalSystem = 'PJe' | 'Projudi' | 'e-Proc' | 'CPE';

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
];

const SYSTEMS = new Set<TribunalSystem>(['PJe', 'Projudi', 'e-Proc', 'CPE']);
const CODE_RE = /^[A-Z0-9]+$/;

export function normalizeTribunalOptions(value: unknown): TribunalOption[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tribunals: TribunalOption[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const { code, system } = item as Record<string, unknown>;
    if (typeof code !== 'string' || !CODE_RE.test(code) || /G[12]$/.test(code)) continue;
    if (typeof system !== 'string' || !SYSTEMS.has(system as TribunalSystem)) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    tribunals.push({ code, system: system as TribunalSystem });
  }
  return tribunals;
}
