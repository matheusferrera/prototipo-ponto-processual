import test from 'node:test';
import assert from 'node:assert/strict';
import { sortPrazos } from '../src/lib/api.server.ts';

/**
 * A ordem da agenda: primeiro o que ainda vai vencer, depois o que passou.
 *
 * Até 07/09/2026 a ordem `fatal` era por DATA ascendente, e isso era o mesmo
 * que "mais próximo" enquanto a lista trazia só o futuro. Quando a agenda parou
 * de cortar por data — 313 vencidos e 175 encerrados contra 12 a vencer numa
 * conta real —, o topo virou um prazo de 2020.
 */
const p = (id, dias, fechado = false) => ({
  id, diasRestantes: dias, fechado,
  vencimentoISO: dias === null ? null : '2026-01-01',
  tribunal: 'X', grau: '', parte: 'p', tipo: 't',
});
const ids = (l) => l.map(x => x.id);

test('o que ainda vai vencer vem primeiro, do mais próximo ao mais distante', () => {
  const l = [p('em 30d', 30), p('em 2d', 2), p('hoje', 0)];
  sortPrazos(l, 'fatal', 'asc');
  assert.deepEqual(ids(l), ['hoje', 'em 2d', 'em 30d']);
});

test('depois os vencidos, do mais RECENTE ao mais antigo', () => {
  const l = [p('há 900d', -900), p('há 1d', -1), p('há 30d', -30)];
  sortPrazos(l, 'fatal', 'asc');
  assert.deepEqual(ids(l), ['há 1d', 'há 30d', 'há 900d']);
});

test('a vencer sempre antes de vencido, por mais distante que esteja', () => {
  const l = [p('venceu ontem', -1), p('vence em 300d', 300)];
  sortPrazos(l, 'fatal', 'asc');
  assert.deepEqual(ids(l), ['vence em 300d', 'venceu ontem']);
});

test('encerrado depois do vencido em aberto — histórico não empurra prazo vivo', () => {
  const l = [p('encerrado ontem', -1, true), p('aberto há 900d', -900)];
  sortPrazos(l, 'fatal', 'asc');
  assert.deepEqual(ids(l), ['aberto há 900d', 'encerrado ontem']);
});

test('sem data no fim, nunca no topo por acidente do null', () => {
  const l = [p('sem data', null), p('há 900d', -900), p('em 3d', 3)];
  sortPrazos(l, 'fatal', 'asc');
  assert.deepEqual(ids(l), ['em 3d', 'há 900d', 'sem data']);
});

test('"mais distante" inverte DENTRO da faixa, não troca as faixas', () => {
  const l = [p('em 2d', 2), p('em 30d', 30), p('há 1d', -1), p('há 900d', -900)];
  sortPrazos(l, 'fatal', 'desc');
  assert.deepEqual(ids(l), ['em 30d', 'em 2d', 'há 900d', 'há 1d']);
});

test('a lista real: o topo é o que está vencendo, e o que passou aparece logo abaixo', () => {
  const l = [p('há 900d', -900), p('em 30d', 30), p('sem data', null),
             p('encerrado', -5, true), p('em 1d', 1), p('há 2d', -2)];
  sortPrazos(l, 'fatal', 'asc');
  assert.deepEqual(ids(l), ['em 1d', 'em 30d', 'há 2d', 'há 900d', 'encerrado', 'sem data']);
});
