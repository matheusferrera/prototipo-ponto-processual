/**
 * As datas do banco são **wall-clock de Brasília gravado nos campos UTC**.
 *
 * O backend monta toda data de movimentação e de detecção com `Date.UTC(...)`
 * a partir dos componentes que o tribunal escreveu (`brazilWallClock` /
 * `nowInBrazil`, em `shared/processos/datas.ts`), justamente para o valor
 * gravado não depender do fuso do servidor.
 *
 * A consequência aqui é obrigatória: ler com `getHours()` ou `getDate()`
 * aplica o fuso local por cima de uma data que **já é local**, e volta 3 h.
 * Isso empurra tudo para o dia anterior sempre que a hora é menor que 03:00 —
 * e a publicação do DJEN é sempre `00:00`, porque o diário publica numa DATA,
 * não num horário. Medido em 03/09/2026: `2026-09-02T00:00:00.000Z` aparecia
 * na tela como "1 SET, 21:00" — dia errado e um horário que nunca existiu.
 */
export interface WallClock {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  diaDaSemana: number;
  /** `true` quando não há horário: o ato tem data, não hora. */
  semHorario: boolean;
}

export function wallClock(d: Date): WallClock {
  return {
    ano: d.getUTCFullYear(),
    mes: d.getUTCMonth(),
    dia: d.getUTCDate(),
    hora: d.getUTCHours(),
    minuto: d.getUTCMinutes(),
    diaDaSemana: d.getUTCDay(),
    semHorario: d.getUTCHours() === 0 && d.getUTCMinutes() === 0,
  };
}

/** `HH:MM`, ou `undefined` quando o ato só tem data. */
export function horaWallClock(d: Date): string | undefined {
  const w = wallClock(d);
  if (w.semHorario) return undefined;
  return `${String(w.hora).padStart(2, '0')}:${String(w.minuto).padStart(2, '0')}`;
}

/** `DD/MM/AAAA`. */
export function dataWallClock(d: Date): string {
  const w = wallClock(d);
  return `${String(w.dia).padStart(2, '0')}/${String(w.mes + 1).padStart(2, '0')}/${w.ano}`;
}
