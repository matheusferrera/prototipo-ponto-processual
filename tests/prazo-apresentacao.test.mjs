import test from 'node:test';
import assert from 'node:assert/strict';
import { faixaPrazo, quandoPrazo, dataPrazo } from '../src/lib/prazo-apresentacao.ts';

const prazo = dias => ({ diasRestantes: dias, vencimentoISO: '2026-09-06', fechado: false });

test('distingue vencidos, hoje e amanhã sem datas negativas no rótulo', () => {
  assert.equal(quandoPrazo(-4), 'Venceu há 4 dias');
  assert.equal(quandoPrazo(-1), 'Venceu ontem');
  assert.equal(quandoPrazo(0), 'Vence hoje');
  assert.equal(quandoPrazo(1), 'Vence amanhã');
  assert.equal(quandoPrazo(3), 'Vence em 3 dias');
  assert.equal(quandoPrazo(null), 'Sem data definida');
});

test('cada prazo com data pertence a uma faixa, inclusive vencidos e encerrados', () => {
  const cenarios = [[-2, 'vencidos'], [0, 'critico'], [3, 'critico'], [4, 'proximos'], [7, 'proximos'], [8, 'atencao'], [14, 'atencao'], [15, 'posteriores'], [30, 'posteriores']];
  for (const [dias, faixa] of cenarios) assert.equal(faixaPrazo(prazo(dias)), faixa);
  assert.equal(faixaPrazo({ ...prazo(-2), fechado: true }), 'encerrados');
  assert.equal(faixaPrazo({ ...prazo(0), fechado: true }), 'encerrados');
});

test('sem data não recebe urgência e a data civil não depende do fuso', () => {
  assert.equal(faixaPrazo({ ...prazo(0), vencimentoISO: null }), 'semData');
  assert.equal(faixaPrazo(prazo(null)), 'semData');
  assert.equal(dataPrazo('2026-09-06'), '06/09/2026');
});
