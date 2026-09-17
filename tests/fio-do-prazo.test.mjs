import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIAS_QUE_NAO_SAO_O_ATO,
  colapsavelNoFeed,
  faixaDoPrazo,
  fracaoDoPrazo,
  mexeComOPrazo,
  quandoDoPrazo,
} from '../src/lib/fio-do-prazo.ts';
import { CATEGORIAS_QUE_A_IA_NAO_LE } from '../src/lib/leitura-do-ato.ts';

const prazo = (extra = {}) => ({
  id: 'd1',
  tipoDocumento: 'Despacho',
  peca: 'Contestação',
  natureza: 'manifestacao',
  metodoPrazo: 'textoExplicito',
  dataLimite: '2026-09-17T00:00:00.000Z',
  dias: 15,
  inicioEm: '2026-09-03T00:00:00.000Z',
  totalDias: 14,
  decorridos: 12,
  restam: 2,
  abriuEsteAto: false,
  ...extra,
});

/**
 * A GUARDA DA DIVERGÊNCIA. As duas listas do front descrevem a mesma decisão —
 * "isto é carimbo de cartório, não o ato" — e vivem separadas só porque o
 * harness de teste não deixa um módulo testável importar outro. Quando uma
 * categoria nova entrar em um lado, este teste fica vermelho antes de a tela
 * colapsar o que devia mostrar (ou mostrar o que devia colapsar).
 */
test('as duas listas de "não é o ato" do front não divergem', () => {
  assert.deepEqual(
    [...CATEGORIAS_QUE_NAO_SAO_O_ATO].sort(),
    [...CATEGORIAS_QUE_A_IA_NAO_LE].sort(),
  );
});

test('trâmite e publicação colapsam — 63% do feed, medido', () => {
  assert.equal(mexeComOPrazo('tramite'), false);
  assert.equal(mexeComOPrazo('publicacao'), false);
  assert.equal(colapsavelNoFeed('tramite'), true);
});

test('decisório, ato de parte e prazo mexem com o prazo', () => {
  for (const c of ['decisorio', 'atoDeParte', 'prazo']) {
    assert.equal(mexeComOPrazo(c), true, c);
  }
});

test('CATEGORIA NULA PASSA — é o expediente do DJEN, o único endereçado', () => {
  assert.equal(mexeComOPrazo(null), true);
  assert.equal(mexeComOPrazo(undefined), true);
  assert.equal(colapsavelNoFeed(null), false);
});

test('sem prazo em curso não há faixa — o caso de 169 dos 180 processos', () => {
  assert.equal(faixaDoPrazo({ prazoEmCurso: null, categoria: 'decisorio' }), null);
  assert.equal(faixaDoPrazo({ categoria: 'decisorio' }), null);
});

test('o ato que abriu o prazo nunca diz que "chegou dentro" dele', () => {
  const f = faixaDoPrazo({ prazoEmCurso: prazo({ abriuEsteAto: true }), categoria: 'decisorio' });
  assert.equal(f.tom, 'abriu');
  // "Prazo:" desde 15/09/2026 — o chip de vencimento saiu da linha e este
  // rótulo deixou de precisar se distinguir dele. O `tom` é o que continua
  // dizendo que foi ESTE ato que abriu.
  assert.equal(f.titulo, 'Prazo:');
});

test('a data-limite sai curta, lida em UTC, e some sem data', () => {
  // `2026-09-17T00:00:00.000Z` é wall-clock de Brasília gravado em UTC: lido
  // com `getDate()` viraria 16/09 em qualquer fuso a oeste de Greenwich.
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo() }).vence, '17 set');
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo({ dataLimite: null }) }).vence, null);
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo({ dataLimite: 'nao-e-data' }) }).vence, null);
});

test('ato que mexe com o prazo acende o aviso; trâmite fica em contexto', () => {
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo(), categoria: 'atoDeParte' }).tom, 'atencao');
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo(), categoria: null }).tom, 'atencao');
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo(), categoria: 'tramite' }).tom, 'curso');
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo(), categoria: 'publicacao' }).tom, 'curso');
});

test('o nome é a peça da IA; sem ela, a natureza; sem nenhuma, nada', () => {
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo() }).nome, 'Contestação');
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo({ peca: null }) }).nome, 'manifestação');
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo({ peca: '  ' }) }).nome, 'manifestação');
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo({ peca: null, natureza: 'ciencia' }) }).nome, 'ciência');
  // `tipoDocumento` NÃO vira nome: "prazo de Despacho" não é coisa que se diga.
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo({ peca: null, natureza: null }) }).nome, null);
});

test('a distância em palavras, e o vencido NÃO é grampeado em "vence hoje"', () => {
  assert.equal(quandoDoPrazo(0), 'vence hoje');
  assert.equal(quandoDoPrazo(1), 'vence amanhã');
  assert.equal(quandoDoPrazo(2), 'faltam 2 dias');
  assert.equal(quandoDoPrazo(-1), 'venceu ontem');
  assert.equal(quandoDoPrazo(-5), 'venceu há 5 dias');
  assert.equal(quandoDoPrazo(null), null);
});

test('prazo aberto e VENCIDO se declara vencido e urgente', () => {
  const f = faixaDoPrazo({ prazoEmCurso: prazo({ restam: -4, decorridos: 14 }) });
  assert.equal(f.vencido, true);
  assert.equal(f.urgente, true);
  assert.equal(f.quando, 'venceu há 4 dias');
});

test('urgente é até 3 dias — 4 já não é', () => {
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo({ restam: 3 }) }).urgente, true);
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo({ restam: 4 }) }).urgente, false);
});

test('a barra é a fração da janela, e nunca passa dos limites', () => {
  assert.equal(fracaoDoPrazo(prazo()), 12 / 14);
  assert.equal(fracaoDoPrazo(prazo({ decorridos: 0 })), 0);
  assert.equal(fracaoDoPrazo(prazo({ decorridos: 14 })), 1);
  assert.equal(fracaoDoPrazo(prazo({ decorridos: 99 })), 1);
});

test('sem data-limite não há barra nem "quando" — e a faixa ainda existe', () => {
  const f = faixaDoPrazo({
    prazoEmCurso: prazo({ dataLimite: null, totalDias: null, decorridos: null, restam: null }),
    categoria: 'decisorio',
  });
  assert.equal(f.fracao, null);
  assert.equal(f.quando, null);
  assert.equal(f.nome, 'Contestação');
  assert.equal(f.urgente, false);
  assert.equal(f.vencido, false);
});

test('a estimativa se declara — só textoExplicito é o tribunal dizendo', () => {
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo() }).estimado, false);
  for (const metodo of ['prazoLegal', 'padraoCpc218', 'cienciaPublicacao', 'analiseIa', null]) {
    assert.equal(faixaDoPrazo({ prazoEmCurso: prazo({ metodoPrazo: metodo }) }).estimado, true, String(metodo));
  }
});

test('a faixa aponta para o fio daquele prazo', () => {
  assert.equal(faixaDoPrazo({ prazoEmCurso: prazo() }).href, '/movimentacoes/fio/d1');
});

import { agruparTramite, colapsavelNaLista } from '../src/lib/fio-do-prazo.ts';

const linha = (categoria, extra = {}) => ({ categoria, ...extra });

test('trâmite DENTRO de um prazo nunca colapsa — "decorrido prazo do réu" é o caso', () => {
  assert.equal(colapsavelNaLista(linha('tramite')), true);
  assert.equal(colapsavelNaLista(linha('tramite', { prazoEmCurso: prazo() })), false);
  assert.equal(colapsavelNaLista(linha('publicacao', { prazoEmCurso: prazo() })), false);
});

test('corridas consecutivas viram um bloco; o resto fica linha', () => {
  const blocos = agruparTramite([
    linha('decisorio'),
    linha('tramite'),
    linha('publicacao'),
    linha('tramite'),
    linha('atoDeParte'),
  ]);
  assert.deepEqual(blocos.map(b => b.tipo), ['linha', 'tramite', 'linha']);
  assert.equal(blocos[1].itens.length, 3);
});

test('trâmite separado por uma sentença NÃO se junta — a ordem é o eixo da tela', () => {
  const blocos = agruparTramite([
    linha('tramite'), linha('tramite'),
    linha('decisorio'),
    linha('tramite'), linha('tramite'),
  ]);
  assert.deepEqual(blocos.map(b => b.tipo), ['tramite', 'linha', 'tramite']);
});

test('corrida de UM não colapsa — o clique não pagaria a linha escondida', () => {
  const blocos = agruparTramite([linha('decisorio'), linha('tramite'), linha('decisorio')]);
  assert.deepEqual(blocos.map(b => b.tipo), ['linha', 'linha', 'linha']);
});

test('categoria nula nunca colapsa — é o expediente do DJEN', () => {
  const blocos = agruparTramite([linha(null), linha(null), linha(null)]);
  assert.deepEqual(blocos.map(b => b.tipo), ['linha', 'linha', 'linha']);
});

test('lista vazia devolve lista vazia', () => {
  assert.deepEqual(agruparTramite([]), []);
});

test('lista toda de trâmite vira um bloco só', () => {
  const blocos = agruparTramite([linha('tramite'), linha('tramite'), linha('tramite')]);
  assert.deepEqual(blocos.map(b => b.tipo), ['tramite']);
});
