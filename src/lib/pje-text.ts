/**
 * Limpeza de texto compartilhada entre Prazos e Movimentações — os dois
 * consomem os mesmos campos brutos do PJe (`assunto`, `tipoDocumento`,
 * `descricao`), que vêm com ruído de formulário: código numérico interno e
 * caminho taxonômico completo.
 */

/** Remove o código numérico que o PJe anexa a assuntos, tipos e descrições: "Intimação (466281043)" → "Intimação". */
export function semCodigo(valor: string): string {
  return valor.replace(/\s*\(\d+\)\s*$/, '').trim();
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
