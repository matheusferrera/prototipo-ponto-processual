import type { BlocoDoAto } from './ato-texto';

/**
 * O TRECHO DE ABERTURA — quando a IA não leu o ato, quem fala é o ato.
 *
 * ## Por que existe
 *
 * A leitura por IA cobre **6,1% dos atos legíveis** (15 de 245 numa conta, 10
 * de 119 na outra). Um card de ato desenhado em torno do resumo viria vazio em
 * 94% das vezes — com uma moldura e um botão "ler", que é a pior coisa que se
 * pode oferecer a quem acabou de clicar procurando saber o que aconteceu.
 *
 * Só que o texto está lá: **100% dos atos de origem `djen` têm inteiro teor**.
 * Então a abertura cai para as primeiras linhas do próprio ato, citadas e
 * marcadas como do juízo. É pior que um bom resumo e é muito melhor que um
 * vazio — e tem uma vantagem que o resumo não tem: são as palavras do
 * tribunal, não uma síntese nossa.
 *
 * ## Qual trecho
 *
 * `FINALIDADE` primeiro, quando existe. É o campo em que o DJEN escreve para
 * que serve a comunicação — literalmente a resposta à pergunta de quem abriu o
 * ato. Sem ele, o primeiro bloco com corpo de verdade; e o cabeçalho
 * burocrático (`PROCESSO:`, `CLASSE:`, `POLO ATIVO:`) fica de fora, porque
 * repetir o número do processo não diz nada a quem já está olhando para ele.
 *
 * **Sem import em tempo de execução**, para poder ser testado sob `node --test`
 * — o alias `@/` não resolve lá. Mesma razão de `fio-do-prazo.ts`.
 */

/**
 * Rótulos que são CAPA, não conteúdo.
 *
 * O ato do diário abre com a ficha do processo, e ela já está inteira na tela
 * (na barra do card, na ficha do ato e na linha de onde a pessoa veio). Um
 * trecho de abertura que dissesse "PROCESSO: 0700891-02.2023.8.07.0002" seria
 * o card repetindo a si mesmo no lugar mais caro dele.
 */
const CAPA = new Set([
  'PROCESSO', 'PROCESSO DE ORIGEM', 'CLASSE', 'ASSUNTO',
  'POLO ATIVO', 'POLO PASSIVO',
  'REPRESENTANTES POLO ATIVO', 'REPRESENTANTES POLO PASSIVO',
  'ADVOGADOS', 'DESTINATÁRIO', 'DESTINATÁRIOS',
]);

/** O rótulo que responde "para que serve este ato" — o DJEN o preenche sempre. */
const PREFERIDO = 'FINALIDADE';

/** Corpo menor que isto é rótulo com um dado curto, não um trecho que se leia. */
const CORPO_MINIMO = 40;

export interface TrechoDeAbertura {
  /** O rótulo do bloco de onde o trecho saiu, quando havia um. */
  rotulo: string | null;
  /** O trecho, já limpo e cortado. */
  trecho: string;
  /** Foi cortado — a tela sinaliza que há mais adiante. */
  truncado: boolean;
}

export function trechoDeAbertura(
  blocos: readonly BlocoDoAto[],
  limite = 320,
): TrechoDeAbertura | null {
  const uteis = blocos
    .map(b => ({ rotulo: b.rotulo?.toUpperCase().trim() ?? null, corpo: limpar(b.corpo) }))
    .filter(b => b.corpo.length >= CORPO_MINIMO && !(b.rotulo && CAPA.has(b.rotulo)));

  const escolhido = uteis.find(b => b.rotulo === PREFERIDO) ?? uteis[0];
  if (!escolhido) return null;

  const { texto, truncado } = cortar(escolhido.corpo, limite);
  return { rotulo: escolhido.rotulo, trecho: texto, truncado };
}

/**
 * Espaço em branco colapsado.
 *
 * O ato do diário vem com quebras de linha do PDF original — parágrafos
 * partidos no meio da frase, tabulações, linhas em branco. Num trecho de três
 * linhas isso vira um bloco rasgado; o texto inteiro, com a formatação
 * original, continua logo abaixo no `TeorDoAto`.
 */
function limpar(corpo: string): string {
  return corpo.replace(/\s+/g, ' ').trim();
}

/**
 * Corta no limite, **sem partir palavra**.
 *
 * Volta até o último espaço antes do teto; se não houver espaço nenhum (uma
 * "palavra" gigante, que na prática é um número de processo ou um hash), corta
 * seco, porque a alternativa é devolver o texto inteiro.
 */
function cortar(texto: string, limite: number): { texto: string; truncado: boolean } {
  if (texto.length <= limite) return { texto, truncado: false };
  const bruto = texto.slice(0, limite);
  const ultimoEspaco = bruto.lastIndexOf(' ');
  const cortado = ultimoEspaco > limite * 0.6 ? bruto.slice(0, ultimoEspaco) : bruto;
  // Pontuação solta no fim ficaria pendurada antes das reticências.
  return { texto: cortado.replace(/[\s.,;:—-]+$/, ''), truncado: true };
}
