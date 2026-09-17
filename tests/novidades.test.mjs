import test from 'node:test';
import assert from 'node:assert/strict';
import { montarNovidades, posicaoDoDivisor } from '../src/lib/novidades.ts';
import {
  deQuemDoAto,
  diasAte,
  pedeAcao,
  situacaoDaLinha,
  tomDosDias,
} from '../src/lib/situacao-do-ato.ts';

/* 17/09/2026, 12:00 em Brasília (15:00 UTC). */
const AGORA = Date.UTC(2026, 8, 17, 15, 0, 0);
const dia = (d) => `2026-${d}T00:00:00.000Z`;

const ato = (extra = {}) => ({
  id: extra.id ?? 'm1',
  cnj: extra.cnj ?? '0000001-00.2026.8.07.0001',
  categoria: null,
  ia: { deQuem: null },
  prazo: null,
  prazoEmCurso: null,
  ...extra,
});

const prazo = (extra = {}) => ({
  dataLimite: dia('09-21'),
  fechado: false,
  natureza: 'manifestacao',
  metodoPrazo: 'textoExplicito',
  deQuem: 'destinatario',
  ...extra,
});

test('diasAte conta em wall-clock de Brasília e não grampeia o vencido', () => {
  assert.equal(diasAte(dia('09-21'), AGORA), 4);
  assert.equal(diasAte(dia('09-17'), AGORA), 0);
  assert.equal(diasAte(dia('09-14'), AGORA), -3);
  /* 01:00 UTC do dia 18 ainda é dia 17 em Brasília. */
  assert.equal(diasAte(dia('09-18'), Date.UTC(2026, 8, 18, 1, 0, 0)), 1);
});

test('a régua de tons é uma só: até 3 tinto, até 7 âmbar, depois verde', () => {
  assert.deepEqual([0, 3, 4, 7, 8, 22].map(tomDosDias), ['tinto', 'tinto', 'ambar', 'ambar', 'voce', 'voce']);
});

test('a leitura da IA vence o deQuem padrão do prazo — o caso do TJBA', () => {
  /* O DJEN grava `destinatario` em toda comunicação; a IA leu o ato e afirmou
     que o prazo é das requeridas. */
  assert.equal(deQuemDoAto(ato({ prazo: prazo({ deQuem: 'destinatario' }), ia: { deQuem: 'parteContraria' } })), 'outra');
  assert.equal(deQuemDoAto(ato({ prazo: prazo({ deQuem: 'parteContraria' }), ia: { deQuem: 'destinatario' } })), 'minha');
  assert.equal(deQuemDoAto(ato({ ia: { deQuem: 'terceiro' } })), 'outra');
});

test('sem afirmação da IA vale o prazo; sem nenhum, a confirmar', () => {
  assert.equal(deQuemDoAto(ato({ prazo: prazo({ deQuem: 'parteContraria' }), ia: { deQuem: 'indefinido' } })), 'outra');
  assert.equal(deQuemDoAto(ato({ prazo: prazo({ deQuem: 'destinatario' }), ia: { deQuem: null } })), 'minha');
  assert.equal(deQuemDoAto(ato({ prazo: prazo({ deQuem: 'indefinido' }), ia: { deQuem: null } })), 'aConfirmar');
});

test('prazo legal de recurso é de toda parte: a leitura não o tira de você', () => {
  assert.equal(
    deQuemDoAto(ato({ prazo: prazo({ metodoPrazo: 'prazoLegal', deQuem: 'destinatario' }), ia: { deQuem: 'parteContraria' } })),
    'minha',
  );
});

test('pede ação: prazo aberto, datado, não vencido, não de ciência, não da outra parte', () => {
  assert.equal(pedeAcao(ato({ prazo: prazo() }), AGORA), true);
  assert.equal(pedeAcao(ato({ prazo: prazo({ deQuem: 'indefinido' }) }), AGORA), true, 'a dúvida erra para cedo');
  assert.equal(pedeAcao(ato({ prazo: prazo({ fechado: true }) }), AGORA), false);
  assert.equal(pedeAcao(ato({ prazo: prazo({ dataLimite: null }) }), AGORA), false);
  assert.equal(pedeAcao(ato({ prazo: prazo({ dataLimite: dia('09-10') }) }), AGORA), false, 'vencido do backfill não sobe');
  assert.equal(pedeAcao(ato({ prazo: prazo({ natureza: 'ciencia' }) }), AGORA), false);
  assert.equal(pedeAcao(ato({ prazo: prazo({ metodoPrazo: 'cienciaPublicacao', natureza: null }) }), AGORA), false);
  assert.equal(pedeAcao(ato({ prazo: prazo({ deQuem: 'parteContraria' }) }), AGORA), false);
});

test('a etiqueta diz se é com você, e o tom acompanha a distância', () => {
  assert.deepEqual(situacaoDaLinha(ato({ prazo: prazo() }), { agora: AGORA }), { rotulo: 'Com você · 4 dias', curto: 'Seu · 4 dias', tom: 'ambar' });
  assert.deepEqual(
    situacaoDaLinha(ato({ prazo: prazo({ dataLimite: dia('10-09'), deQuem: 'indefinido' }) }), { agora: AGORA }),
    { rotulo: 'Confirme se é seu · 22 dias', curto: 'Confirmar · 22 dias', tom: 'voce' },
  );
  assert.deepEqual(situacaoDaLinha(ato({ prazo: prazo({ dataLimite: dia('09-14') }) }), { agora: AGORA }), { rotulo: 'Venceu há 3 dias', curto: 'Venceu há 3 dias', tom: 'tinto' });
  assert.deepEqual(situacaoDaLinha(ato({ prazo: prazo({ deQuem: 'parteContraria' }) }), { agora: AGORA, longo: true }), {
    rotulo: 'Prazo da outra parte · nada a fazer agora',
    curto: 'Outra parte',
    tom: 'neutro',
  });
  assert.deepEqual(situacaoDaLinha(ato({ prazo: prazo({ natureza: 'ciencia' }) }), { agora: AGORA }), { rotulo: 'Só ciência', curto: 'Só ciência', tom: 'neutro' });
  assert.deepEqual(situacaoDaLinha(ato({ prazo: prazo({ fechado: true }) }), { agora: AGORA }), { rotulo: 'Prazo encerrado', curto: 'Encerrado', tom: 'neutro' });
});

test('dentro de um prazo seu: verde claro com folga, âmbar perto do fim', () => {
  const corre = (restam) => ato({ prazoEmCurso: { restam, abriuEsteAto: false } });
  assert.deepEqual(situacaoDaLinha(corre(15), { agora: AGORA }), { rotulo: 'No seu prazo · 15 dias', curto: 'No prazo · 15 dias', tom: 'prazo' });
  assert.deepEqual(situacaoDaLinha(corre(4), { agora: AGORA }), { rotulo: 'No seu prazo · 4 dias', curto: 'No prazo · 4 dias', tom: 'ambar' });
  /* No cartão do processo o cabeçalho já diz — a linha fica calada. */
  assert.equal(situacaoDaLinha(corre(4), { agora: AGORA, semPrazoQueCorre: true }), null);
  /* O ato que ABRIU o prazo não é "no seu prazo" — é o prazo. */
  assert.equal(situacaoDaLinha(ato({ prazoEmCurso: { restam: 15, abriuEsteAto: true } }), { agora: AGORA }), null);
  /* A linha comum não diz nada. */
  assert.equal(situacaoDaLinha(ato(), { agora: AGORA }), null);
});

test('as novas se dividem em pede ação, processos e só cartório', () => {
  const itens = [
    ato({ id: 'stj', cnj: 'A', prazo: prazo({ dataLimite: dia('10-09') }) }),
    ato({ id: 'tjba-desp', cnj: 'B', ia: { deQuem: 'parteContraria' } }),
    ato({ id: 'tjdft', cnj: 'C', prazo: prazo() }),
    ato({ id: 'tjba-exp', cnj: 'B', categoria: 'tramite' }),
    ato({ id: 'tjto-1', cnj: 'D', categoria: 'tramite' }),
    ato({ id: 'tjba-com', cnj: 'B', categoria: 'tramite' }),
    ato({ id: 'tjto-2', cnj: 'E', categoria: 'publicacao' }),
  ];
  const r = montarNovidades(itens, {
    pedeAcao: (m) => pedeAcao(m, AGORA),
    ehCartorio: (m) => m.categoria === 'tramite' || m.categoria === 'publicacao',
    diasAte: (m) => diasAte(m.prazo?.dataLimite, AGORA),
  });

  assert.deepEqual(r.pedemAcao.map((m) => m.id), ['tjdft', 'stj'], 'o mais urgente primeiro');
  assert.equal(r.processos.length, 1);
  assert.deepEqual(r.processos[0].atos.map((m) => m.id), ['tjba-desp']);
  assert.deepEqual(r.processos[0].cartorio.map((m) => m.id), ['tjba-exp', 'tjba-com']);
  assert.deepEqual(r.soCartorio.map((m) => m.id), ['tjto-1', 'tjto-2']);
  assert.equal(r.totalProcessos, 5);
});

test('linha sem processo não se junta às outras sem processo', () => {
  const r = montarNovidades([ato({ id: 'x', cnj: '—' }), ato({ id: 'y', cnj: '—' })], {
    pedeAcao: () => false,
    ehCartorio: () => false,
    diasAte: () => null,
  });
  assert.equal(r.processos.length, 2);
  assert.equal(r.totalProcessos, 2);
});

test('"você viu até aqui" cai na primeira linha vista depois de uma nova, e só uma vez', () => {
  const linhas = (...flags) => flags.map((naoVista, i) => ({ id: `l${i}`, naoVista }));
  assert.deepEqual(posicaoDoDivisor(linhas(true, true, false, false)), { antesDe: 'l2', houveNova: true });
  assert.deepEqual(posicaoDoDivisor(linhas(false, false)), { antesDe: null, houveNova: false }, 'nada novo, nada a dividir');
  assert.deepEqual(posicaoDoDivisor(linhas(true, true)), { antesDe: null, houveNova: true }, 'a fronteira pode estar na próxima página');
  assert.deepEqual(posicaoDoDivisor(linhas(false, true), true), { antesDe: 'l0', houveNova: true }, 'a página anterior terminou em novas');
});
