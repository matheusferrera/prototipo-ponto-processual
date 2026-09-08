import test from 'node:test';
import assert from 'node:assert/strict';
import { diaMovimentacao, movimentacaoDaUltimaData } from '../src/lib/movimentacao-novidade.ts';

test('todos os atos da última data são novos, independentemente da hora', () => {
  for (const hora of ['00:00:00', '02:00:00', '23:59:59']) {
    assert.equal(movimentacaoDaUltimaData(`2026-09-06T${hora}.000Z`, '2026-09-06'), true);
  }
});

test('páginas e filtros antigos não criam uma nova data de novidade', () => {
  const ultimaData = '2026-09-06';
  const paginaAntiga = ['2026-09-04T12:00:00Z', '2026-09-05T23:59:59Z'];
  assert.deepEqual(paginaAntiga.map(data => movimentacaoDaUltimaData(data, ultimaData)), [false, false]);
  assert.equal(movimentacaoDaUltimaData('2026-09-07T00:00:00Z', ultimaData), false);
});

test('a última data continua nova mesmo se não houver movimentação recente', () => {
  assert.equal(movimentacaoDaUltimaData('2024-01-02T08:00:00Z', '2024-01-02'), true);
});

test('respeita o dia civil UTC usado no cabeçalho e as viradas de ano', () => {
  assert.equal(diaMovimentacao('2026-01-01T00:00:00.000Z'), '2026-01-01');
  assert.equal(movimentacaoDaUltimaData('2025-12-31T23:59:59Z', '2026-01-01'), false);
});

test('datas ausentes ou inválidas nunca recebem o selo', () => {
  assert.equal(diaMovimentacao(undefined), null);
  assert.equal(diaMovimentacao('invalida'), null);
  assert.equal(movimentacaoDaUltimaData('invalida', '2026-09-06'), false);
  assert.equal(movimentacaoDaUltimaData('2026-09-06T00:00:00Z', null), false);
});
