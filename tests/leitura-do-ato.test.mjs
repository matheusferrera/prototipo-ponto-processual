import test from 'node:test';
import assert from 'node:assert/strict';
import { podeLerComIa } from '../src/lib/leitura-do-ato.ts';

/**
 * O botão "Ler este ato com IA" só aparece onde `POST /ia/movimentacoes/{id}`
 * aceitaria o pedido. Estes casos são o recorte do backend
 * (`etapaLeituraDoMovimento`) traduzido para a tela — quando ele mudar lá, aqui
 * fica vermelho antes de virar um 409 na cara de quem clicou.
 */

test('as três origens públicas são lidas', () => {
  for (const origem of ['djen', 'tribunalPublico', 'pdpj']) {
    assert.equal(podeLerComIa({ origem, categoria: 'decisorio' }), true, origem);
  }
});

test('o painel autenticado e o DataJud ficam de fora', () => {
  // `scraper` tem vencimento OFICIAL, e a leitura do ato é a única análise que
  // mexe em prazo; `datajud` não tem texto nenhum.
  assert.equal(podeLerComIa({ origem: 'scraper', categoria: 'decisorio' }), false);
  assert.equal(podeLerComIa({ origem: 'datajud', categoria: 'decisorio' }), false);
});

test('publicação e trâmite não são o ato — ler devolveria o rótulo de volta', () => {
  assert.equal(podeLerComIa({ origem: 'pdpj', categoria: 'publicacao' }), false);
  assert.equal(podeLerComIa({ origem: 'pdpj', categoria: 'tramite' }), false);
  for (const categoria of ['decisorio', 'prazo', 'atoDeParte']) {
    assert.equal(podeLerComIa({ origem: 'pdpj', categoria }), true, categoria);
  }
});

test('categoria NULA passa — é assim que o ato do diário chega', () => {
  // O DJEN é gravado sem categoria e é a única fonte de ato ENDEREÇADO: tratar
  // o nulo como "não lê" esconderia o diário inteiro do botão.
  assert.equal(podeLerComIa({ origem: 'djen', categoria: null }), true);
  assert.equal(podeLerComIa({ origem: 'djen' }), true);
});

test('campo ausente nunca esconde o botão sozinho', () => {
  // Quem decide de verdade é o backend; a função só evita oferecer o que ele
  // recusaria com CERTEZA.
  assert.equal(podeLerComIa({}), true);
  assert.equal(podeLerComIa({ categoria: 'decisorio' }), true);
});
