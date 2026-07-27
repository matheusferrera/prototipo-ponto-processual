import type { Prazo } from '@/types';

/**
 * Título de um prazo na UI: o assunto do processo; sem assunto, a parte;
 * sem nenhum dos dois, o tipo do expediente (que nunca é vazio).
 *
 * `assunto` e `parte` são independentes — um não faz fallback para o outro no
 * mapeamento (ver `toPrazo`), justamente para que a UI possa mostrar os dois.
 */
export function tituloPrazo(pz: Prazo): string {
  return pz.assunto || pz.parte || pz.tipo;
}

/** Parte a exibir como linha secundária — omitida quando ela já é o título. */
export function parteSecundaria(pz: Prazo, titulo: string): string | null {
  return pz.parte && pz.parte !== titulo ? pz.parte : null;
}

/** Remove o código numérico que o PJe anexa a assuntos e tipos: "Intimação (466281043)" → "Intimação". */
function semCodigo(valor: string): string {
  return valor.replace(/\s*\(\d+\)\s*$/, '').trim();
}

/**
 * Folha do assunto do PJe, que vem como caminho taxonômico completo:
 * "DIREITO TRIBUTÁRIO (14) / Impostos (5916) / IRPJ… (5933) / Retido na fonte (5937)"
 * → "Retido na fonte". É a matéria que o advogado reconhece na pauta.
 */
export function assuntoCurto(assunto: string): string {
  if (!assunto) return '';
  const folha = assunto.split(' / ').at(-1) ?? assunto;
  return semCodigo(folha) || semCodigo(assunto) || assunto;
}

/**
 * Hierarquia da pauta (view "Pauta"), espelhando a pauta que o escritório manda
 * por e-mail: o cliente encabeça a linha, o expediente diz o que fazer e o
 * assunto desce para a meta junto com os autos.
 *
 * Ex.: "Município de Sonora | Embargos de Declaração | autos nº … · ICMS CFEM"
 */
export function clientePrazo(pz: Prazo): string {
  return pz.parte || assuntoCurto(pz.assunto) || pz.tipo;
}

/** Expediente sem o id interno do documento — o "o que fazer" da linha. */
export function expedientePrazo(pz: Prazo): string {
  return semCodigo(pz.tipo) || pz.tipo;
}

/** Assunto a exibir na meta — encurtado e omitido quando já subiu para o título. */
export function assuntoSecundario(pz: Prazo, cliente: string): string | null {
  const curto = assuntoCurto(pz.assunto);
  return curto && curto !== cliente ? curto : null;
}
