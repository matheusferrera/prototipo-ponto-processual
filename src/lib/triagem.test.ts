import assert from 'node:assert/strict';
import test from 'node:test';
import type { Movimentacao, Prazo } from '../types';
import { LIMITE_POR_GRUPO, montarTriagem } from './triagem';

const agora = Date.UTC(2026, 8, 20, 15);

function prazo(parcial: Partial<Prazo> = {}): Prazo {
  return {
    id: parcial.id ?? crypto.randomUUID(), tribunal: 'TJDFT', grau: '1º', origem: 'djen',
    cnj: '0000000-00.2026.8.07.0001', orgaoJulgador: '1ª Vara', parte: 'Cliente',
    cliente: ['Cliente'], parteContraria: ['Outra parte'], assunto: 'Direito civil',
    tipo: 'Intimação', natureza: 'manifestacao', vencimento: '21/09',
    vencimentoISO: '2026-09-21', diasRestantes: 1, movementId: 'mov-1', fechado: false,
    deQuem: 'destinatario', ato: null, state: 'alert', ...parcial,
  };
}

function movimento(parcial: Partial<Movimentacao> = {}): Movimentacao {
  return {
    id: parcial.id ?? crypto.randomUUID(), tribunal: 'TJDFT', cnj: '0001',
    orgaoJulgador: '1ª Vara', parte: 'Cliente', assunto: '', tipo: 'Despacho',
    detail: 'Intimação para manifestação', state: 'signal', origem: 'djen',
    categoria: 'publicacao', ia: {
      resumo: 'Apresente manifestação.', fundamento: null, confianca: 'alta',
      deQuem: 'destinatario', analisadoEm: null, oQueFazer: 'Manifestar-se.',
      peca: 'Manifestação', checklist: [], documentosNecessarios: [], risco: 'preclusao',
      complexidade: 'baixa', precisaDosAutos: false, observacao: null,
    },
    prazo: { id: 'p-mov', dataLimite: '2026-09-22', dias: 2, natureza: 'manifestacao', metodoPrazo: 'textoExplicito', fechado: false, deQuem: 'destinatario' },
    ...parcial,
  };
}

test('vencido sem baixa entra sempre e prazo da outra parte desce', () => {
  const resultado = montarTriagem([
    prazo({ id: 'vencido', diasRestantes: -2, vencimentoISO: '2026-09-18' }),
    prazo({ id: 'outra', deQuem: 'parteContraria' }),
  ], [], agora);
  assert.equal(resultado.grupos[0]?.itens.length, 1);
  assert.equal(resultado.maisAdiante[0]?.id, 'outra');
});

test('mera ciência não pede ação e prazo sem data nunca some', () => {
  const ciencia = movimento({ prazo: { id: 'c', dataLimite: '2026-09-22', dias: 2, natureza: 'ciencia', metodoPrazo: 'cienciaPublicacao', fechado: false } });
  const semData = prazo({ id: 'sem-data', vencimento: null, vencimentoISO: null, diasRestantes: null });
  const resultado = montarTriagem([semData], [ciencia], agora);
  assert.equal(resultado.maisAdiante[0]?.id, 'sem-data');
  assert.equal(resultado.grupos.some(g => g.chave === 'chegou'), false);
});

test('prazo indefinido com data pede confirmação', () => {
  const resultado = montarTriagem([prazo({ id: 'duvida', deQuem: 'indefinido' })], [], agora);
  assert.equal(resultado.grupos[0]?.chave, 'deQuemE');
  assert.equal(resultado.grupos[0]?.itens[0]?.tipo, 'prazo');
});

test('limita cada pergunta a oito cartões e contabiliza o excedente', () => {
  const prazos = Array.from({ length: 11 }, (_, i) => prazo({ id: `p-${i}` }));
  const grupo = montarTriagem(prazos, [], agora).grupos[0]!;
  assert.equal(grupo.itens.length, LIMITE_POR_GRUPO);
  assert.equal(grupo.excedentes, 3);
});
