import type { CategoriaMovimentacao, PrazoEmCurso } from '@/types';
import { faixaDoPrazo } from '@/lib/fio-do-prazo';
import styles from './FaixaDoPrazo.module.css';

/**
 * A FAIXA — o elo entre esta movimentação e o prazo que está correndo.
 *
 * É a única coisa na linha que responde **"no decorrer do prazo"**: que prazo
 * este ato toca e quanto dele já passou. Medido em 15/09/2026, é a ligação que
 * separava 18.485 movimentações (370 páginas) dos 11 prazos abertos da conta —
 * sem ela, a única forma de saber que um ato caiu dentro de um prazo seu era
 * reconhecer o número do processo de cabeça.
 *
 * ### Só ocupa espaço quando existe
 *
 * `null` em 169 dos 180 processos medidos. A linha desses continua exatamente
 * como era — mesma altura, mesma gramática. Reservar a faixa em toda linha
 * repetiria o erro da coluna de prazo de 92px que saiu do feed em 06/09/2026.
 *
 * ### Um tom por vez
 *
 * Âmbar **só** em `atencao` — o ato que pode mudar a peça, chegando com o
 * relógio correndo. É o caso caro e silencioso: a outra parte protocola no dia
 * 13 dos seus 15 e isso vira uma linha entre dezoito mil. Pintar de urgência
 * também o trâmite gastaria o sinal antes de ele precisar, que é a mesma
 * medição que tirou a borda verde de todas as linhas do feed.
 *
 * ### Não é link, e é HTML que manda
 *
 * A linha inteira já é um `<a>` (ou um `<button>`, quando expande), e âncora
 * dentro de âncora é HTML inválido: o navegador desmonta o aninhamento e o
 * clique cai no elemento errado. Quem leva ao fio é o painel expandido, que
 * mora FORA da âncora — mesma disciplina do ícone de documento.
 *
 * Por isso também tudo aqui é `<span>`: `<div>` dentro de `<a>` é válido em
 * HTML5, mas o resto do conteúdo da linha já é inline por essa razão e
 * misturar os dois quebraria o grid do `.corpo`.
 */
export function FaixaDoPrazo({
  prazoEmCurso,
  categoria,
  /** No fio, o prazo é o cabeçalho da tela — repetir o nome em toda linha é ruído. */
  semNome = false,
}: {
  prazoEmCurso?: PrazoEmCurso | null;
  categoria?: CategoriaMovimentacao | null;
  semNome?: boolean;
}) {
  const faixa = faixaDoPrazo({ prazoEmCurso, categoria });
  if (!faixa) return null;

  const nome = semNome ? null : faixa.nome;

  return (
    <span
      className={styles.faixa}
      data-tom={faixa.tom}
      data-vencido={faixa.vencido ? '' : undefined}
      data-urgente={faixa.urgente ? '' : undefined}
    >
      <span className={styles.texto}>
        <span className={styles.titulo}>{faixa.titulo}</span>
        {(nome || faixa.quando || faixa.vence) && (
          <span className={styles.detalhe}>
            {nome}
            {nome && (faixa.quando || faixa.vence) ? ' · ' : null}
            {faixa.quando}
            {/* A DATA entre parênteses, depois da distância. "faltam 22 dias"
                responde a urgência; a data responde "cai quando?", que é o que
                se cruza com a agenda — e era o que o chip do topo da linha
                dizia antes de sair.

                O "≈" cola na DATA, e é ali que ele sempre quis estar: ele é a
                ressalva de um vencimento que, fora de `textoExplicito`, é
                cálculo nosso sobre a regra do art. 4º da Lei 11.419 (que não
                conhece feriado estadual, prazo em dobro nem suspensão por
                portaria). Enquanto não havia data na faixa ele viajava colado
                em "faltam 2 dias", que é a consequência; agora acompanha a
                causa, como o chip fazia ("Prazo ≈ 18 set"). */}
            {faixa.vence && (
              <span className={styles.vence}>
                {'('}
                {faixa.estimado && (
                  <span className={styles.estimado} title="data calculada por nós, não publicada pelo tribunal">≈</span>
                )}
                {faixa.vence}
                {')'}
              </span>
            )}
          </span>
        )}
      </span>

      {/* A BARRA é redundante de propósito: quem a lê já leu "faltam 2 dias" ao
          lado. Ela existe para a proporção ser vista sem ler — e por isso é
          `aria-hidden`, senão o leitor de tela ouviria o mesmo fato duas vezes.
          Sem régua (prazo sem data-limite) não há barra: inventar um
          denominador desenharia uma progressão que não existe. */}
      {faixa.fracao !== null && (
        <span className={styles.barra} aria-hidden="true">
          <span className={styles.preenchida} style={{ width: `${Math.round(faixa.fracao * 100)}%` }} />
        </span>
      )}
    </span>
  );
}
