import test from 'node:test';
import assert from 'node:assert/strict';
import { panoramaProcesso, origemDataPrazo } from '../src/lib/processo-panorama.ts';

const prazo = (id, dias, extra = {}) => ({ id, diasRestantes: dias, vencimentoISO: dias === null ? null : `2026-09-${String(7 + dias).padStart(2, '0')}`, fechado: false, ...extra });
test('prioriza próximo prazo aberto e conserva alertas de vencidos e sem data', () => {
  const resumo = panoramaProcesso([], [prazo('encerrado', 0, { fechado: true }), prazo('longe', 12), prazo('vencido', -2), prazo('proximo', 2), prazo('sem-data', null)]);
  assert.equal(resumo.prazo.id, 'proximo');
  assert.equal(resumo.vencidos, 1);
  assert.equal(resumo.semData, 1);
});
test('mantém vencidos e expedientes sem data quando não há prazo futuro', () => {
  assert.equal(panoramaProcesso([], [prazo('vencido', -1), prazo('sem-data', null)]).prazo.id, 'vencido');
  assert.equal(panoramaProcesso([], [prazo('sem-data', null)]).prazo.id, 'sem-data');
  assert.equal(panoramaProcesso([], [prazo('encerrado', 0, { fechado: true })]).prazo, null);
});
test('sugestão com prazo encerrado não reaparece como providência', () => {
  const atos = [{ id: '1', ia: { acao: 'Antiga' }, prazo: { fechado: true } }, { id: '2', ia: { acao: 'Encerrada no expediente' } }, { id: '3', ia: { acao: 'Conferir' } }];
  const resumo = panoramaProcesso(atos, [prazo('p', 0, { movementId: '2', fechado: true })]);
  assert.equal(resumo.ultimo.id, '1');
  assert.equal(resumo.acao.id, '3');
});
test('não apresenta datas calculadas como informadas pelo tribunal', () => {
  assert.equal(origemDataPrazo(prazo('p', 1, { origemPrazo: 'djen' })), 'Data estimada · a conferir');
  assert.equal(origemDataPrazo(prazo('p', 1, { origemPrazo: 'painel' })), 'Informada pelo tribunal');
  assert.equal(origemDataPrazo(prazo('p', 1)), 'Origem da data a confirmar');
  assert.equal(origemDataPrazo(prazo('p', null)), 'Data a confirmar');
});
