import type { NaturezaPrazo, Prazo } from '@/types';
import { assuntoCurto, semCodigo } from '@/lib/pje-text';

export { assuntoCurto };

const ROTULO_NATUREZA: Record<NaturezaPrazo, string> = {
  ciencia: 'ciência',
  manifestacao: 'manifestação',
};

/**
 * "ciência" ou "manifestação" — o que o prazo cobra do advogado.
 *
 * `null` quando o tribunal não deixou claro: a UI omite o rótulo em vez de
 * chutar, porque um prazo rotulado errado é pior do que um prazo sem rótulo.
 */
export function rotuloNatureza(pz: Prazo): string | null {
  return pz.natureza ? ROTULO_NATUREZA[pz.natureza] : null;
}

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

const CANAL_PRAZO: Record<NonNullable<Prazo['canal']>, string> = {
  diario: 'pelo diário',
  portal: 'pelo portal',
};

const DE_QUEM_PRAZO: Record<NonNullable<Prazo['deQuem']>, string> = {
  destinatario: 'do destinatário',
  parteContraria: 'da parte contrária',
  indefinido: 'de quem, a confirmar',
};

/**
 * A linha de qualificação — "manifestação · pelo diário · sem dobra · do
 * destinatário". É a resposta a "até quando E POR QUÊ", que a ficha genérica
 * anterior não dava: ela tinha os mesmos nomes de campo, só nunca foi
 * alimentada (ver `toPrazo` em `api.server.ts`).
 */
export function qualificacaoPrazo(pz: Prazo): string[] {
  return [
    pz.diasPrazo ? `prazo de ${pz.diasPrazo} ${pz.diasPrazo === 1 ? 'dia' : 'dias'}` : null,
    rotuloNatureza(pz),
    pz.canal ? CANAL_PRAZO[pz.canal] : null,
    pz.emDobro === true ? 'em dobro' : pz.emDobro === false ? 'sem dobra' : null,
    pz.deQuem ? DE_QUEM_PRAZO[pz.deQuem] : null,
  ].filter((v): v is string => Boolean(v));
}

/**
 * Como a data foi obtida, em uma frase — publicada pelo tribunal, ou uma das
 * quatro camadas de cálculo (`prazo-legal.ts` no backend). É o que separa o
 * vencimento que o tribunal publicou da estimativa que fazemos sobre o ato.
 */
export function procedenciaPrazo(pz: Prazo): string {
  if (pz.origemPrazo === 'painel' || pz.origemPrazo === 'grid') return 'prazo publicado pelo tribunal';
  switch (pz.metodoPrazo) {
    case 'textoExplicito':    return 'os dias vieram escritos no ato';
    case 'prazoLegal':        return 'prazo legal do recurso, calculado por nós';
    case 'padraoCpc218':      return 'padrão de 5 dias do art. 218, § 3º, do CPC';
    case 'cienciaPublicacao': return 'mera ciência — a data é a da publicação';
    case 'analiseIa':         return 'derivado da leitura do ato';
    default:                  return 'calculado por nós';
  }
}
