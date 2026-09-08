/** O banco grava a data civil do ato nos campos UTC, como os cabeçalhos. */
export function diaMovimentacao(ocorridoEm: string | null | undefined): string | null {
  if (!ocorridoEm) return null;
  const data = new Date(ocorridoEm);
  return Number.isNaN(data.getTime()) ? null : data.toISOString().slice(0, 10);
}

/** Nova significa pertencer à última data da carteira, independentemente da detecção. */
export function movimentacaoDaUltimaData(ocorridoEm: string, ultimaData: string | null): boolean {
  const dia = diaMovimentacao(ocorridoEm);
  return dia !== null && ultimaData !== null && dia === ultimaData;
}
