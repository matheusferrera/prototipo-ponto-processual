import test from 'node:test';
import assert from 'node:assert/strict';
import { diaCurto, marcosDaCadeia } from '../src/lib/cadeia-do-prazo.ts';

const cadeia = (extra = {}) => ({
  disponibilizadoEm: '02/09/2026',
  publicadoEm: '03/09/2026',
  inicioEm: '04/09/2026',
  venceEm: '25/09/2026',
  contagem: 'uteis',
  dias: 15,
  ...extra,
});

/**
 * `new Date('03/09/2026')` lê a string como MÊS/DIA em locale americano e
 * devolve 9 de março. A cadeia inteira sairia com meses trocados — e o erro é
 * silencioso, porque a data resultante é válida.
 */
test('a data é lida como dd/mm, nunca como mm/dd', () => {
  assert.equal(diaCurto('03/09/2026'), 'qui, 3 set');
  assert.equal(diaCurto('09/03/2026'), 'seg, 9 mar');
});

test('o dia da semana sai junto — é ele que responde "tenho o fim de semana?"', () => {
  assert.equal(diaCurto('05/09/2026'), 'sáb, 5 set');
  assert.equal(diaCurto('06/09/2026'), 'dom, 6 set');
});

test('data impossível não vira outra data', () => {
  assert.equal(diaCurto('31/02/2026'), null);
  assert.equal(diaCurto('2026-09-03'), null);
  assert.equal(diaCurto(''), null);
});

test('os quatro marcos, na ordem, com a regra de cada um', () => {
  const m = marcosDaCadeia(cadeia());
  assert.equal(m.length, 4);
  assert.deepEqual(m.map(x => x.rotulo), [
    'disponibilizado no diário', 'considera-se publicado', 'começa a correr', 'vence',
  ]);
  assert.equal(m[0].regra, null);
  assert.match(m[1].regra, /art\. 4º, § 3º/);
  assert.match(m[2].regra, /CPC 224/);
  assert.equal(m[3].regra, '15 dias úteis depois');
  assert.equal(m[3].fim, true);
  assert.equal(m[0].fim, false);
});

test('dias corridos aparecem como corridos — o regime penal conta assim', () => {
  const m = marcosDaCadeia(cadeia({ contagem: 'corridos', dias: 5 }));
  assert.equal(m[3].regra, '5 dias corridos depois');
});

test('a concordância no singular — "1 dia útil", nunca "1 dia úteis"', () => {
  // Prazo de 1 dia existe (ciência, vista dos autos), e a frase errada é o que
  // faz o advogado desconfiar de toda a conta.
  assert.equal(marcosDaCadeia(cadeia({ dias: 1 })).at(-1).regra, '1 dia útil depois');
  assert.equal(marcosDaCadeia(cadeia({ dias: 1, contagem: 'corridos' })).at(-1).regra, '1 dia corrido depois');
  assert.equal(marcosDaCadeia(cadeia({ dias: 2 })).at(-1).regra, '2 dias úteis depois');
});

test('cadeia com data quebrada devolve lista vazia — meia explicação é pior que nenhuma', () => {
  assert.deepEqual(marcosDaCadeia(cadeia({ inicioEm: 'xx/xx/xxxx' })), []);
  assert.deepEqual(marcosDaCadeia(cadeia({ venceEm: '' })), []);
});
