import { Sparkles } from 'lucide-react';
import type { MovimentacaoDetail } from '@/lib/api.server';
import { pedeConferencia } from '@/lib/movimentacao';
import { dataWallClock } from '@/lib/wall-clock';
import styles from './AtoDetalhe.module.css';

/**
 * O bloco que MOSTRA a leitura — separado de `AtoDetalhe.tsx` em 10/09/2026, e
 * não por tamanho: quem o renderiza depois de a IA responder é `LeituraDoAto`,
 * que é client component e mora ao lado. Deixá-lo onde estava faria
 * `AtoDetalhe → LeituraDoAto → AtoDetalhe` — ciclo de import atravessando a
 * fronteira client/server, que é onde ele deixa de ser inofensivo.
 *
 * Os estilos continuam em `AtoDetalhe.module.css` de propósito: este bloco é
 * irmão do teor e do prazo, e mover as classes separaria o par que o CSS
 * descreve como par.
 */

export const CONFIANCA: Record<string, string> = {
  alta: 'confiança alta',
  media: 'confiança média',
  baixa: 'confiança baixa',
};

/**
 * "O que fazer" — fundido nesta MESMA leitura desde `<data>` (antes era a
 * análise separada do `Deadline`, `AnalisePrazoPainel`, hoje removida). Os
 * rótulos são os mesmos que aquele componente usava.
 */
/** Exportado porque a linha FECHADA da pauta mostra o mesmo rótulo de risco. */
export const RISCO_ROTULO: Record<string, string> = {
  preclusao: 'perde o prazo processual',
  perdaDeDireito: 'perde o direito material',
  revelia: 'revelia',
  multa: 'multa',
  nenhum: 'sem risco direto',
};

const COMPLEXIDADE_ROTULO: Record<string, string> = {
  baixa: 'complexidade baixa',
  media: 'complexidade média',
  alta: 'complexidade alta',
};

/**
 * O que a IA leu no ato — ao lado do teor, e não dentro dele.
 *
 * O par é deliberado: `TeorDoAto` é o que o tribunal escreveu, este é o que
 * entendemos disso. Até 07/09/2026 a leitura não existia como bloco — ela vinha
 * espalhada em três lugares condicionais: `ia.acao` só aparece com providência,
 * `ia.fundamento` só aparece pendurado no bloco de prazo, e `confianca` e
 * `analisadoEm` viravam uma linha discreta na ficha. Num ato de mera ciência —
 * sem prazo e sem ação, que é a maioria — a análise ficava INVISÍVEL, mesmo
 * tendo rodado.
 *
 * `analisadoEm` é o gate, e não `resumo`: é ele que distingue "a IA não leu" de
 * "a IA leu e concluiu que não há nada a fazer". Sem análise o bloco não existe
 * — nunca uma caixa vazia dizendo que não há leitura. Quem oferece o botão
 * nesse caso é `LeituraDoAto`, que embrulha este bloco.
 */
export function LeituraIaDoAto({ mov }: { mov: Pick<MovimentacaoDetail, 'ia'> }) {
  const ia = mov.ia;
  if (!ia.analisadoEm && !ia.resumo) return null;

  /* O rodapé do bloco: quando foi lido e com que confiança. `confianca: baixa`
     não vai aqui — ela vira o aviso destacado abaixo, porque pedir conferência
     em letra miúda ao lado da data é escondê-la. */
  const carimbo = [
    ia.analisadoEm && `lido em ${dataWallClock(new Date(ia.analisadoEm))}`,
    ia.confianca && ia.confianca !== 'baixa' && CONFIANCA[ia.confianca],
  ].filter(Boolean) as string[];

  /* "O que fazer" só ganha a seção estruturada quando há algo além do óbvio —
     mera ciência sem peça, sem checklist e sem risco não precisa de uma caixa
     própria; o resumo acima já basta. `oQueFazer` em prosa fica para
     `ProvidenciaDoAto`, que desde 10/09/2026 aparece em TODO ato lido —
     mostrá-lo aqui também duplicaria o mesmo texto nos dois blocos que ficam
     lado a lado, agora em toda leitura e não só nas com peça. */
  const temOQueFazer = Boolean(
    ia.peca || ia.checklist.length > 0 || ia.documentosNecessarios.length > 0 ||
    (ia.risco && ia.risco !== 'nenhum') || ia.precisaDosAutos || ia.observacao,
  );

  return (
    <section className={styles.leitura} aria-label="Leitura do ato pela IA">
      <div className={styles.leituraCabecalho}>
        <span className={styles.leituraRotulo}>
          <Sparkles size={13} aria-hidden="true" />
          Leitura do ato
        </span>
        {carimbo.length > 0 && <span className={styles.leituraCarimbo}>{carimbo.join(' · ')}</span>}
      </div>

      {/* O resumo REPETE o título da linha logo acima (ou o `<h1>` da
          página), e aqui isso é correto: na linha ele é a manchete, sem
          dizer que é leitura de máquina. É este bloco que o qualifica — e
          sem ele o advogado não tem como saber que o título não é o rótulo
          do tribunal. */}
      {ia.resumo && <p className={styles.leituraResumo}>{ia.resumo}</p>}

      {/* `ia.fundamento` (o artigo de lei por trás dos dias) NÃO vai aqui, de
          propósito — repetiria o "prazo de N dias" que `PrazoDoAto` já mostra
          na coluna ao lado, com a mesma fonte de dados. Continua disponível
          no contrato (`MovementView.ia.fundamento`) para quem quiser: a lista
          ato-a-ato da aba de IA do processo o mostra num `<details>`. */}

      {pedeConferencia(mov) && (
        <p className={styles.leituraConferir}>
          leitura de confiança baixa — confira o texto do ato antes de decidir
        </p>
      )}

      {/* O QUE FAZER — fundido nesta leitura desde `<data>`. Peça, checklist,
          documentos que faltam e o risco de perder o prazo, na mesma chamada
          que já leu o ato — sem esperar uma análise de prazo à parte. */}
      {temOQueFazer && (
        <div className={styles.leituraOQueFazer}>
          <div className={styles.leituraChips}>
            {ia.peca && <span className={styles.leituraPeca}>{ia.peca}</span>}
            {ia.risco && ia.risco !== 'nenhum' && (
              <span className={styles.leituraRisco} data-risco={ia.risco}>{RISCO_ROTULO[ia.risco]}</span>
            )}
            {ia.complexidade && <span className={styles.leituraTagNeutra}>{COMPLEXIDADE_ROTULO[ia.complexidade]}</span>}
            {ia.precisaDosAutos && <span className={styles.leituraTagNeutra}>precisa dos autos</span>}
          </div>

          {ia.checklist.length > 0 && (
            <ul className={styles.leituraChecklist}>
              {ia.checklist.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          )}

          {ia.documentosNecessarios.length > 0 && (
            <div className={styles.leituraDocumentos}>
              <span className={styles.leituraDocumentosRotulo}>Falta obter</span>
              <ul className={styles.leituraDocumentosLista}>
                {ia.documentosNecessarios.map((doc, i) => <li key={i}>{doc}</li>)}
              </ul>
            </div>
          )}

          {ia.observacao && (
            <p className={styles.leituraObservacao}>Divergência com o que foi informado: {ia.observacao}</p>
          )}
        </div>
      )}
    </section>
  );
}
