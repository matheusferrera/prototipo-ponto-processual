/**
 * Limpeza de texto compartilhada entre Prazos e Movimentações — os dois
 * consomem os mesmos campos brutos do PJe (`assunto`, `tipoDocumento`,
 * `descricao`), que vêm com ruído de formulário: código numérico interno e
 * caminho taxonômico completo.
 */

/** Remove o código numérico que o PJe anexa a assuntos, tipos e descrições: "Intimação (466281043)" → "Intimação". */
export function semCodigo(valor: string): string {
  // O `DJEN-` opcional cobre a origem pública: ali o sufixo é `(DJEN-611209370)`,
  // o id da comunicação no diário, e sem ele o rótulo do prazo aparecia como
  // "Ementa (DJEN-611209370)" na aba de prazos do processo. É a mesma limpeza
  // que `descricaoDoAto` faz no backend — o número é chave, não informação.
  return valor.replace(/\s*\((?:DJEN-)?\d+\)\s*$/i, '').trim();
}

/**
 * Folha do assunto do PJe, que vem como caminho taxonômico completo:
 * "DIREITO TRIBUTÁRIO (14) / Impostos (5916) / IRPJ… (5933) / Retido na fonte (5937)"
 * → "Retido na fonte". É a matéria que o advogado reconhece de relance.
 */
export function assuntoCurto(assunto: string): string {
  if (!assunto) return '';
  const folha = assunto.split(' / ').at(-1) ?? assunto;
  return semCodigo(folha) || semCodigo(assunto) || assunto;
}

/**
 * As partes de `parte`, em lista — o campo vem "Fulano, Beltrano, Sicrano"
 * quando o ato intima mais de uma, e num POLO COLETIVO isso chega a centenas
 * de nomes: uma execução de servidores do TRF1 trouxe 313, e a linha da pauta
 * gastava vinte linhas listando-os, com o chip de prazo e o CNJ empurrados
 * para fora do campo de visão de quem varre a pauta.
 *
 * `ocultos` é o resto, para a tela poder dizer "+311" em vez de fingir que só
 * havia dois nomes. Quem quer a lista inteira abre os autos: nenhuma tela
 * nossa é o lugar de reproduzir um polo de 313 pessoas.
 */
export function partesDoTexto(
  bruto: string | null | undefined,
  limite: number,
): { nomes: string[]; ocultos: number } {
  if (!bruto) return { nomes: [], ocultos: 0 };
  const nomes = bruto.split(',').map(nome => nome.trim()).filter(Boolean);
  return { nomes: nomes.slice(0, limite), ocultos: Math.max(0, nomes.length - limite) };
}

/**
 * O mesmo corte, já em UMA LINHA — "Fulano, Beltrano +311 partes".
 *
 * O "+N" vem com a palavra, diferente do `+N` pelado que a ficha do ato usa:
 * ali o número está no fim de uma lista de nomes e não há o que confundir; na
 * linha da pauta ele fica solto ao lado de um chip de dias e de um CNJ, onde
 * "+311" sozinho pode ser lido como qualquer outra contagem.
 *
 * Não reordena para pôr o cliente da conta primeiro — ver `destinatariosDoAto`
 * em `movimentacao.ts`: nada no contrato de hoje marca QUAL nome do polo é o
 * cliente, e destacar o nome errado é o lado caro do erro aqui.
 */
export function partesCurtas(bruto: string | null | undefined, limite = 2): string {
  const { nomes, ocultos } = partesDoTexto(bruto, limite);
  if (nomes.length === 0) return '';
  if (ocultos === 0) return nomes.join(', ');
  return `${nomes.join(', ')} +${ocultos} ${ocultos === 1 ? 'parte' : 'partes'}`;
}
