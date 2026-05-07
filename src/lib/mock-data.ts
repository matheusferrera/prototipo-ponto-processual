import type { MovimentacaoGroup, Processo, TimelineEvent, Prazo } from '@/types';

export const movimentacoes: MovimentacaoGroup[] = [
  {
    date: 'HOJE', day: '06.05',
    items: [
      { id: 'm1', tribunal: 'TRF1', cnj: '0021345-67.2024.4.01.3400', parte: 'Carlos Ribeiro', tipo: 'Intimação', detail: 'enviada à parte autora · prazo 15d', time: '09:12', whats: { sent: true, time: '09:13' }, state: 'signal' },
      { id: 'm2', tribunal: 'TJDFT', cnj: '0007781-12.2025.8.07.0001', parte: 'Maria Souza vs. INSS', tipo: 'Sentença', detail: 'lavrada · procedente em parte', time: '08:45', whats: { sent: true, time: '08:46' }, state: 'signal' },
    ],
  },
  {
    date: 'ONTEM', day: '05.05',
    items: [
      { id: 'm3', tribunal: 'TJDFT', cnj: '0003329-45.2025.8.07.0015', parte: 'Pedro Henrique Vasconcelos', tipo: 'Audiência', detail: 'designada para 12/06 às 14h00', time: '17:02', whats: { sent: true, time: '17:02' }, state: 'signal' },
      { id: 'm4', tribunal: 'TRF1', cnj: '0011223-44.2024.4.01.3400', parte: 'João Pedro Albuquerque', tipo: 'Despacho', detail: 'remessa para análise do MP', time: '11:20', whats: { sent: true, time: '11:21' }, state: 'quiet' },
      { id: 'm5', tribunal: 'TRF3', cnj: '0044556-78.2025.4.03.6100', parte: 'Tech Brasil S.A.', tipo: 'Juntada', detail: 'manifestação da parte ré', time: '09:08', whats: { sent: false, reason: 'desativado para este processo' }, state: 'quiet' },
    ],
  },
  {
    date: '04 MAI', day: 'segunda',
    items: [
      { id: 'm6', tribunal: 'TJDFT', cnj: '0099887-65.2024.8.07.0010', parte: 'Lúcia Almeida', tipo: 'Conclusão', detail: 'autos conclusos para sentença', time: '15:44', whats: { sent: true, time: '15:45' }, state: 'quiet' },
      { id: 'm7', tribunal: 'TRF3', cnj: '0003329-45.2025.8.07.0015', parte: 'Auto Posto Sol Ltda', tipo: 'Erro', detail: 'falha ao acessar autos · credencial expirou', time: '02:14', whats: { sent: false, reason: 'erro de sincronização' }, state: 'alert' },
    ],
  },
];

export const processos: Processo[] = [
  { id: 'p1', tribunal: 'TRF1', cnj: '0021345-67.2024.4.01.3400', parte: 'Carlos Ribeiro', materia: 'Trabalhista', grau: '1º', ultimaMov: '02/05', state: 'signal', whatsEnabled: true },
  { id: 'p2', tribunal: 'TJDFT', cnj: '0007781-12.2025.8.07.0001', parte: 'Maria Souza vs. INSS', materia: 'Cível', grau: '2º', ultimaMov: '01/05', state: 'signal', whatsEnabled: true },
  { id: 'p3', tribunal: 'TRF3', cnj: '0003329-45.2025.8.07.0015', parte: 'Auto Posto Sol Ltda', materia: 'Tributário', grau: '1º', ultimaMov: '29/04', state: 'alert', whatsEnabled: false },
  { id: 'p4', tribunal: 'TJDFT', cnj: '0008871-22.2024.8.07.0001', parte: 'Construtora Lima S.A.', materia: 'Cível', grau: '1º', ultimaMov: '28/04', state: 'quiet', whatsEnabled: true },
  { id: 'p5', tribunal: 'TRF1', cnj: '0011223-44.2024.4.01.3400', parte: 'João Pedro Albuquerque', materia: 'Previdenciário', grau: '1º', ultimaMov: '27/04', state: 'quiet', whatsEnabled: true },
  { id: 'p6', tribunal: 'TJDFT', cnj: '0099887-65.2024.8.07.0010', parte: 'Lúcia Almeida', materia: 'Família', grau: '1º', ultimaMov: '25/04', state: 'quiet', whatsEnabled: false },
  { id: 'p7', tribunal: 'TRF3', cnj: '0044556-78.2025.4.03.6100', parte: 'Tech Brasil S.A.', materia: 'Tributário', grau: '2º', ultimaMov: '24/04', state: 'quiet', whatsEnabled: true },
];

export const timelineCarlosRibeiro: TimelineEvent[] = [
  { id: 't1', date: '05 mai', time: '09:12', label: 'NOVA', title: 'Intimação enviada à parte autora', body: 'Intimação para apresentação de contestação no prazo de 15 dias.', state: 'signal', n: '05' },
  { id: 't2', date: '02 mai', time: '14:30', title: 'Sentença lavrada', state: 'quiet', n: '04' },
  { id: 't3', date: '25 abr', time: '10:30', title: 'Audiência realizada', state: 'quiet', n: '03' },
  { id: 't4', date: '18 abr', title: 'Réplica protocolada', state: 'quiet', n: '02' },
  { id: 't5', date: '10 abr', title: 'Petição inicial', state: 'quiet', n: '01' },
];

export const prazos: Prazo[] = [
  { id: 'pz1', tribunal: 'TRF1', cnj: '0021345-67.2024.4.01.3400', parte: 'Carlos Ribeiro', tipo: 'Contestação', vencimento: '12/05', diasRestantes: 6, state: 'signal' },
  { id: 'pz2', tribunal: 'TJDFT', cnj: '0007781-12.2025.8.07.0001', parte: 'Maria Souza vs. INSS', tipo: 'Recursos', vencimento: '18/05', diasRestantes: 12, state: 'quiet' },
  { id: 'pz3', tribunal: 'TRF3', cnj: '0044556-78.2025.4.03.6100', parte: 'Tech Brasil S.A.', tipo: 'Manifestação', vencimento: '08/05', diasRestantes: 2, state: 'alert' },
  { id: 'pz4', tribunal: 'TJDFT', cnj: '0008871-22.2024.8.07.0001', parte: 'Construtora Lima S.A.', tipo: 'Impugnação', vencimento: '25/05', diasRestantes: 19, state: 'quiet' },
];

