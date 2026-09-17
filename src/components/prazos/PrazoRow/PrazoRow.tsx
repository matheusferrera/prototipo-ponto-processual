import Link from 'next/link';
import { ChevronRight, Clock3 } from 'lucide-react';
import type { Prazo } from '@/types';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { RISCO_ROTULO } from '@/components/movimentacoes/AtoDetalhe/LeituraIaDoAto';
import { BaixarPrazo } from '@/components/prazos/BaixarPrazo/BaixarPrazo';
import { LembrarPrazo } from '@/components/prazos/LembrarPrazo/LembrarPrazo';
import { clienteEhPresumido, clientePrazo, expedientePrazo, rotuloNatureza } from '@/lib/prazo';
import { tribunalTagLabel } from '@/lib/tribunals';
import { dataPrazo, faixaPrazo, quandoPrazo } from '@/lib/prazo-apresentacao';
import styles from './PrazoRow.module.css';

/**
 * Uma hierarquia para pauta, kanban, calendário e expedientes sem data.
 *
 * ## Abrir um prazo é abrir o CARD do ato que o abriu (17/09/2026)
 *
 * Até aqui a linha era um `<details>` que expandia um painel próprio — outra
 * composição dos mesmos blocos, com os mesmos três defeitos que tiraram o
 * painel do feed em 15/09/2026: a lista saltando ao abrir, a pauta inteira
 * continuando visível embaixo, e a cadeia de contagem do vencimento sem lugar.
 *
 * Agora a linha é um link para `/movimentacoes/<movementId>`, que
 * `app/@card/(.)movimentacoes/[id]` intercepta: o card abre por cima da pauta,
 * que continua montada e parada, e fechar devolve filtro, vista e rolagem.
 *
 * **O card do ato É o card deste prazo**, e não por aproximação:
 * `Deadline.movementId` é NOT NULL e `@unique` no backend — um ato abre no
 * máximo um prazo, e todo prazo tem o seu ato. O "Até quando" do card e a barra
 * de ação dele são deste prazo. Um card próprio de prazo seria a sexta
 * composição do mesmo ato, e a primeira a divergir seria a regra do prazo.
 *
 * ## Os verbos ficam FORA do link
 *
 * Âncora com botão dentro é HTML inválido, e o navegador desmonta a árvore. O
 * link cobre o corpo; um `::after` o estende sobre a linha inteira (tags e CNJ
 * inclusive), e os verbos, por virem depois no DOM e serem posicionados,
 * pintam por cima dele e recebem o próprio clique.
 */
export function PrazoRow({ prazo: p, compacto = false }: { prazo: Prazo; compacto?: boolean }) {
  const faixa = faixaPrazo(p);
  const natureza = rotuloNatureza(p);
  const titulo = expedientePrazo(p);
  const parte = clientePrazo(p);
  // O nome saiu do cruzamento com a minha OAB, ou é o que o ATO nomeia?
  // Sem essa distinção os dois têm a mesma cara — e num prazo de polo passivo
  // o segundo é a parte CONTRÁRIA.
  const partePresumida = clienteEhPresumido(p);
  const estimado = Boolean(p.vencimentoISO) && (p.origemPrazo === 'djen' || p.origemPrazo === 'tribunalPublico');

  /* O processo é só a rede para uma API anterior a 07/09/2026, quando
     `movementId` ainda podia vir nulo. Hoje ele sempre vem. */
  const href = p.movementId
    ? `/movimentacoes/${encodeURIComponent(p.movementId)}`
    : `/processos/${encodeURIComponent(p.cnj)}`;

  return (
    <div className={`${styles.item} ${compacto ? styles.compacto : ''}`} data-baixado={p.fechado ? '' : undefined}>
      <div className={styles.linha}>
        <Link href={href} className={`${styles.corpo} ${styles.abrir}`}>
          <span className={styles.vencimento} data-faixa={faixa}>
            <Clock3 size={14} aria-hidden="true" />
            <span>{p.fechado ? 'Encerrado' : quandoPrazo(p.diasRestantes)}</span>
            {/* O `≈` antes da data JÁ diz que é cálculo nosso — a etiqueta
                "Data estimada" ao lado repetia a mesma informação e roubava a
                largura de quem lê a data. A ressalva por extenso continua no
                card, que é onde ela cabe. */}
            {p.vencimentoISO && (
              <time
                className={styles.comDica}
                dateTime={p.vencimentoISO}
                title={estimado ? 'Data calculada por nós, não publicada pelo tribunal' : undefined}
              >
                {estimado ? '≈ ' : ''}{dataPrazo(p.vencimentoISO)}
              </time>
            )}
          </span>
          <span className={styles.titulo}>{titulo}</span>
          {parte !== titulo && (
            <span className={styles.parte}>
              {parte}
              {partePresumida && (
                <span
                  className={`${styles.parteAConfirmar} ${styles.comDica}`}
                  title="O tribunal não publicou os representantes deste processo, então não dá para afirmar de que lado você está. Este é o nome que o ato cita."
                >
                  a confirmar
                </span>
              )}
            </span>
          )}
          {p.deQuem === 'parteContraria' && <span className={styles.contexto}>Prazo da parte contrária</span>}

          {/* A PEÇA, na linha fechada. `expedientePrazo` acima é o rótulo do
              cartório ("Sentença", "Despacho"), que diz o que CHEGOU e não o
              que fazer — e é justamente isso que se procura ao varrer a pauta
              decidindo o que atacar hoje. Ela só existe depois da leitura do
              ato (fusão ato+prazo), e é `null` em mera ciência: a linha volta
              a ser o que era, sem caixa vazia. */}
          {p.ato?.ia.peca && (
            <span className={styles.peca}>
              {p.ato.ia.peca}
              {p.ato.ia.risco && p.ato.ia.risco !== 'nenhum' && (
                <span className={styles.pecaRisco} data-risco={p.ato.ia.risco}>{RISCO_ROTULO[p.ato.ia.risco]}</span>
              )}
            </span>
          )}
        </Link>
        <span className={styles.calha}>
          <span className={styles.tags}>
            {natureza && <span className={styles.natureza}>{natureza}</span>}
            <TribTag label={tribunalTagLabel(p.tribunal, p.grau)} />
            <ChevronRight size={16} className={styles.seta} aria-hidden="true" />
          </span>
          <span className={styles.cnj}>{p.cnj}</span>
          {/* O VERBO, na linha fechada. Ele é a razão de a pauta existir como
              tela de trabalho e não como relatório: até 15/09/2026 a linha
              inteira era um link, e a única coisa que se podia fazer com um
              prazo era abrir o detalhe dele. A linha voltou a abrir o detalhe
              — o card —, mas os verbos continuam aqui, sem precisar abri-lo.

              Fica na calha, embaixo do CNJ, e não no corpo: o corpo responde
              "o que é isto" e a calha responde "o que eu faço com isto". */}
          {/* OS DOIS VERBOS. "Protocolei" encerra; "Lembrar" adia sem encerrar
              — é a diferença entre o prazo que acabou e o que ainda vai
              precisar de trabalho. Prazo já baixado não oferece lembrete: não
              há o que lembrar. */}
          <span className={styles.verbos}>
            {!p.fechado && (
              <LembrarPrazo
                prazoId={p.id}
                vencimentoISO={p.vencimentoISO}
                lembrarEm={p.lembrarEm ?? null}
              />
            )}
            <BaixarPrazo prazoId={p.id} fechado={Boolean(p.fechado)} compacto={compacto} />
          </span>
        </span>
      </div>
    </div>
  );
}
