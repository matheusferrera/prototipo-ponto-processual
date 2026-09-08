import type { Prazo } from '../types';

/**
 * Dias corridos até o vencimento. **Negativo quando já venceu** — e é aí que
 * mora a correção.
 *
 * Havia um `Math.max(0, …)` grampeando o resultado em zero, então **todo prazo
 * vencido era exibido como "vence hoje"**, em vermelho. Um prazo de 24/05
 * aparecia como vencendo em 04/09. É o pior erro possível num campo de prazo:
 * não é só impreciso, é o oposto do que aconteceu, e ensina o advogado a não
 * confiar no selo.
 *
 * O grampo também apagava três decisões que dependem do sinal:
 *  - `prazosAbertos` filtra `diasRestantes >= 0`, então nenhum vencido saía;
 *  - a contagem de `criticos` (`<= 3`) engolia o acervo vencido inteiro;
 *  - `prazoLabel` tem um ramo `dias < 0 → 'vencido'` que nunca era alcançado.
 *
 * A conta é por DIA DE CALENDÁRIO, não por diferença de horas: `dataLimite`
 * chega como meia-noite UTC do dia certo, e subtrair `Date.now()` cru faria um
 * prazo de amanhã às 00:00 valer "0 dias" durante toda a tarde de hoje. O
 * offset de Brasília entra pelo mesmo motivo que em `vencimentoDoAto`.
 */
export function diasAteVencimento(dataLimite: string): number {
  const limite = new Date(dataLimite);
  const diaLimite = Date.UTC(limite.getUTCFullYear(), limite.getUTCMonth(), limite.getUTCDate());
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const hoje = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate());
  return Math.round((diaLimite - hoje) / 86_400_000);
}

export type FaixaPrazo = 'vencidos' | 'critico' | 'proximos' | 'atencao' | 'posteriores' | 'encerrados' | 'semData';

export function faixaPrazo(p: Pick<Prazo, 'fechado' | 'diasRestantes' | 'vencimentoISO'>): FaixaPrazo {
  if (p.fechado) return 'encerrados';
  if (p.diasRestantes === null || !p.vencimentoISO) return 'semData';
  if (p.diasRestantes < 0) return 'vencidos';
  if (p.diasRestantes <= 3) return 'critico';
  if (p.diasRestantes <= 7) return 'proximos';
  if (p.diasRestantes <= 14) return 'atencao';
  return 'posteriores';
}

export function quandoPrazo(dias: number | null): string {
  if (dias === null) return 'Sem data definida';
  if (dias === -1) return 'Venceu ontem';
  if (dias < 0) return `Venceu há ${Math.abs(dias)} dias`;
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  return `Vence em ${dias} dias`;
}

export function dataPrazo(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
