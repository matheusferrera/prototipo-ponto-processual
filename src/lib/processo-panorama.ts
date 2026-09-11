import type { Prazo, TimelineEvent } from '@/types';

/** Recebe atos recentes sem os filtros da timeline, em ordem decrescente. */
export function panoramaProcesso(eventos: TimelineEvent[], prazos: Prazo[]) {
  const pendentes = prazos.filter(p => !p.fechado);
  const comData = pendentes.filter(p => p.vencimentoISO && p.diasRestantes !== null);
  const proximos = comData.filter(p => p.diasRestantes! >= 0)
    .sort((a, b) => a.vencimentoISO!.localeCompare(b.vencimentoISO!));
  const vencidos = comData.filter(p => p.diasRestantes! < 0)
    .sort((a, b) => b.vencimentoISO!.localeCompare(a.vencimentoISO!));
  const semData = pendentes.filter(p => !p.vencimentoISO || p.diasRestantes === null);
  const encerrados = new Set(prazos.filter(p => p.fechado && p.movementId).map(p => p.movementId));
  return {
    ultimo: eventos[0] ?? null,
    prazo: proximos[0] ?? vencidos[0] ?? semData[0] ?? null,
    vencidos: vencidos.length,
    semData: semData.length,
    // Ação associada a um prazo já encerrado não é uma pendência atual.
    // `peca` é o sinal de que há algo concreto a produzir — `oQueFazer`
    // sozinho está sempre presente desde a fusão ato+prazo, até em ciência.
    acao: eventos.find(e => e.ia?.peca && !e.prazo?.fechado && !encerrados.has(e.id)) ?? null,
  };
}

export function origemDataPrazo(prazo: Prazo): string {
  if (!prazo.vencimentoISO) return 'Data a confirmar';
  if (prazo.origemPrazo === 'painel' || prazo.origemPrazo === 'grid') return 'Informada pelo tribunal';
  if (prazo.metodoPrazo === 'textoExplicito') return 'Data identificada no ato · a conferir';
  if (prazo.origemPrazo === 'djen' || prazo.origemPrazo === 'tribunalPublico' || prazo.metodoPrazo) return 'Data estimada · a conferir';
  return 'Origem da data a confirmar';
}
