/**
 * O ato do diário chega como **um parágrafo só**.
 *
 * Não é figura de linguagem: medido em 04/09/2026 sobre o acervo inteiro,
 * **0 de 1.145 atos** têm uma única quebra de linha, com média de 5.598
 * caracteres. O `white-space: pre-wrap` do bloco da íntegra, portanto, nunca
 * teve o que preservar — o texto sai como um muro de 20 e tantas linhas
 * maciças, que é o que torna a leitura penosa. Largura e corpo de fonte não
 * resolvem isso; o que falta é PAUSA.
 *
 * A pausa já existe no texto, marcada pelos rótulos que o PJe imprime em caixa
 * alta (`PROCESSO:`, `POLO ATIVO:`, `FINALIDADE:`, `OBSERVAÇÃO:`…). Este
 * módulo só os encontra e quebra o texto ali.
 *
 * ## A regra é uma LISTA, não um padrão
 *
 * O caminho óbvio — "sequência em caixa alta seguida de dois-pontos" — quebra
 * no lugar errado, porque nome de parte também vem em caixa alta e encosta no
 * rótulo seguinte: sobre o corpus real, esse padrão produz coisas como
 * `IVONETE VASCONCELOS DE MORAES RECLAMADO:` e `G DE L C ADVOGADOS:` como se
 * fossem rótulos. Uma lista fechada erra menos e erra de forma previsível — o
 * pior caso é não quebrar, que é o comportamento de hoje.
 *
 * ## O que este módulo NÃO faz
 *
 * Não reescreve, não reordena, não resume e não descarta. A íntegra é o que o
 * advogado confere contra o original: as partes devolvidas, concatenadas, são
 * **idêntica-caractere-a-caractere** ao texto que entrou. Há teste para isso.
 */

/**
 * Rótulos que iniciam bloco. Saíram da contagem sobre o acervo real, mais os
 * papéis processuais que aparecem em volume menor.
 *
 * Ordem importa: os compostos vêm antes dos simples, senão `POLO PASSIVO`
 * casaria só o pedaço final de `REPRESENTANTES POLO PASSIVO`.
 */
const ROTULOS = [
  'REPRESENTANTES POLO PASSIVO',
  'REPRESENTANTES POLO ATIVO',
  'POLO PASSIVO',
  'POLO ATIVO',
  'PROCESSO DE ORIGEM',
  'PROCESSO',
  'CLASSE',
  'ASSUNTO',
  'FINALIDADE',
  'OBSERVAÇÃO',
  'OBSERVAÇÕES',
  'EMENTA',
  'DECISÃO',
  'DISPOSITIVO',
  'RELATÓRIO',
  'DESTINATÁRIOS',
  'DESTINATÁRIO',
  'Destinatários',
  'Destinatário',
  'ADVOGADOS',
  'ADVOGADO',
  'RELATOR',
  'INTERESSADO',
  'REQUERENTE',
  'REQUERIDO',
  'RECLAMANTE',
  'RECLAMADO',
  'EXEQUENTE',
  'EXECUTADO',
  'EMBARGANTE',
  'EMBARGADO',
  'AGRAVANTE',
  'AGRAVADO',
  'APELANTE',
  'APELADO',
  'INVESTIGADO',
  'PACIENTE',
  'AUTOR',
  'RÉU',
] as const;

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * `(?<![A-Za-zÀ-ÿ])` impede casar o fim de outra palavra — sem isso, `AUTOR`
 * casaria dentro de `COAUTOR` e a quebra cairia no meio de um nome.
 */
const INICIO_DE_BLOCO = new RegExp(
  `(?<![A-Za-zÀ-ÿ])(${ROTULOS.map(escapar).join('|')})\\s*:`,
  'g',
);

export interface BlocoDoAto {
  /** O rótulo limpo, para exibir. `null` no trecho anterior ao primeiro rótulo. */
  rotulo: string | null;
  /**
   * O marcador **exato** que apareceu no texto, dois-pontos e espaços
   * inclusive (`"FINALIDADE:"`, mas também `"FINALIDADE :"`).
   *
   * Existe só para `recompor` devolver o original byte a byte. A primeira
   * versão remontava `${rotulo}:` e perdia o espaço antes do dois-pontos —
   * **160 dos 1.145 atos** saíam diferentes do que entraram. Num documento que
   * se confere contra o original, isso não é detalhe de formatação.
   */
  marcador: string | null;
  /** O texto do bloco, já sem o rótulo. Pode ser vazio. */
  corpo: string;
}

/**
 * Quebra o ato em blocos pelos rótulos conhecidos.
 *
 * Texto sem nenhum rótulo devolve **um bloco só**, com `rotulo: null` — que é
 * exatamente o comportamento de hoje, e é o degradado correto: sem estrutura
 * reconhecida, mostrar o texto corrido é melhor que inventar divisão.
 */
export function blocosDoAto(texto: string): BlocoDoAto[] {
  const blocos: BlocoDoAto[] = [];
  let cursor = 0;
  let rotuloAberto: string | null = null;

  let marcadorAberto: string | null = null;

  for (const m of texto.matchAll(INICIO_DE_BLOCO)) {
    const corpo = texto.slice(cursor, m.index);
    // O primeiro rótulo costuma vir logo no começo: não empurra um bloco vazio.
    if (corpo.trim() || rotuloAberto !== null) {
      blocos.push({ rotulo: rotuloAberto, marcador: marcadorAberto, corpo });
    }
    rotuloAberto = m[1];
    marcadorAberto = m[0];
    cursor = m.index + m[0].length;
  }

  blocos.push({ rotulo: rotuloAberto, marcador: marcadorAberto, corpo: texto.slice(cursor) });
  return blocos;
}

/**
 * O texto original reconstruído a partir dos blocos — a prova de que nada se
 * perdeu. Existe para o teste, e para quem duvidar em produção.
 */
export function recompor(blocos: BlocoDoAto[]): string {
  return blocos.map((b) => (b.marcador ?? '') + b.corpo).join('');
}
