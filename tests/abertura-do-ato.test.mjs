import test from 'node:test';
import assert from 'node:assert/strict';
import { trechoDeAbertura } from '../src/lib/abertura-do-ato.ts';

const b = (rotulo, corpo) => ({ rotulo, marcador: rotulo ? `${rotulo}:` : null, corpo });
const longo = (n, palavra = 'palavra') => Array(n).fill(palavra).join(' ');

test('FINALIDADE ganha de tudo — é o campo que diz para que serve o ato', () => {
  const r = trechoDeAbertura([
    b('EMENTA', longo(10)),
    b('FINALIDADE', 'Intimar a parte para apresentar contrarrazões ao recurso no prazo legal.'),
  ]);
  assert.equal(r.rotulo, 'FINALIDADE');
  assert.match(r.trecho, /contrarrazões/);
});

test('sem FINALIDADE, o primeiro bloco com corpo de verdade', () => {
  const r = trechoDeAbertura([
    b('EMENTA', 'A decisão recorrida merece reforma, conforme os fundamentos a seguir expostos.'),
    b('DECISÃO', longo(10)),
  ]);
  assert.equal(r.rotulo, 'EMENTA');
});

/**
 * O ato do diário abre com a ficha do processo, e ela já está inteira na tela.
 * Um trecho de abertura repetindo o número do processo seria o card repetindo
 * a si mesmo no lugar mais caro dele.
 */
test('a CAPA do ato não vira abertura', () => {
  const r = trechoDeAbertura([
    b('PROCESSO', '0700891-02.2023.8.07.0002 — autuado em 12/03/2023 na 3ª Vara Cível'),
    b('POLO ATIVO', 'MUNICÍPIO DE ANORI e outros, representado por procurador municipal'),
    b('FINALIDADE', 'Intimar para manifestação sobre o laudo pericial em cinco dias.'),
  ]);
  assert.equal(r.rotulo, 'FINALIDADE');
});

test('bloco curto demais não é trecho — é rótulo com um dado', () => {
  const r = trechoDeAbertura([b('CLASSE', 'Procedimento Comum'), b('EMENTA', longo(12))]);
  assert.equal(r.rotulo, 'EMENTA');
});

test('texto sem rótulo nenhum ainda abre — rotulo null é o degradado certo', () => {
  const r = trechoDeAbertura([b(null, 'Vistos. Defiro a produção da prova testemunhal requerida pela autora.')]);
  assert.equal(r.rotulo, null);
  assert.match(r.trecho, /^Vistos/);
});

test('só capa e migalhas devolve null — a tela cai no rótulo do cartório', () => {
  assert.equal(trechoDeAbertura([b('PROCESSO', longo(20)), b('CLASSE', 'Comum')]), null);
  assert.equal(trechoDeAbertura([]), null);
});

test('as quebras do PDF são colapsadas — o teor íntegro fica no bloco de baixo', () => {
  const r = trechoDeAbertura([b('FINALIDADE', 'Intimar   a\n\nparte\tpara\n  contestar em quinze dias úteis.')]);
  assert.equal(r.trecho, 'Intimar a parte para contestar em quinze dias úteis.');
});

test('corta no limite SEM partir palavra, e marca que foi cortado', () => {
  const r = trechoDeAbertura([b('FINALIDADE', longo(200, 'contrarrazoes'))], 100);
  assert.equal(r.truncado, true);
  assert.ok(r.trecho.length <= 100);
  // Nenhuma palavra partida: o último token tem de ser a palavra inteira.
  assert.ok(r.trecho.split(' ').every(p => p === 'contrarrazoes'));
});

test('texto curto não é marcado como truncado', () => {
  const r = trechoDeAbertura([b('FINALIDADE', 'Intimar a parte para ciência do despacho proferido nos autos.')]);
  assert.equal(r.truncado, false);
});

test('pontuação solta não fica pendurada antes das reticências', () => {
  const r = trechoDeAbertura([b('FINALIDADE', `${longo(8, 'abc')} , ${longo(40, 'abc')}`)], 40);
  assert.equal(r.truncado, true);
  assert.doesNotMatch(r.trecho, /[\s.,;:—-]$/);
});
