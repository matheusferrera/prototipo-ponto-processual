import Link from 'next/link';
import { ChevronRight, Clock3 } from 'lucide-react';
import type { Prazo } from '@/types';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { ProvidenciaDoAto, DocumentosDoAto } from '@/components/movimentacoes/AtoDetalhe/AtoDetalhe';
import { RISCO_ROTULO } from '@/components/movimentacoes/AtoDetalhe/LeituraIaDoAto';
import { LeituraDoAto } from '@/components/movimentacoes/AtoDetalhe/LeituraDoAto';
import { clientePrazo, expedientePrazo, procedenciaPrazo, qualificacaoPrazo, rotuloNatureza } from '@/lib/prazo';
import { tribunalTagLabel } from '@/lib/tribunals';
import { dataPrazo, faixaPrazo, quandoPrazo } from '@/lib/prazo-apresentacao';
import { partesCurtas } from '@/lib/pje-text';
import { dataWallClock } from '@/lib/wall-clock';
import styles from './PrazoRow.module.css';

/**
 * Até quando, e por quê — "manifestação · pelo diário · sem dobra · do
 * destinatário", seguido de como a data foi obtida. É o que substitui a ficha
 * genérica de rótulo/valor: os mesmos campos existiam no tipo desde sempre,
 * só nunca chegavam preenchidos do mapeador (ver `toPrazo` em `api.server.ts`).
 */
function QuandoEPorQue({ p }: { p: Prazo }) {
  const qualificacao = qualificacaoPrazo(p);
  const estimado = Boolean(p.vencimentoISO) && (p.origemPrazo === 'djen' || p.origemPrazo === 'tribunalPublico');
  if (qualificacao.length === 0 && !p.publicadoEm) return null;

  return (
    <div className={styles.quando}>
      {qualificacao.length > 0 && <p className={styles.quandoLinha}>{qualificacao.join(' · ')}</p>}
      {/* `p.fundamento` (o artigo de lei) não entra aqui, de propósito — é o
          mesmo texto que `LeituraIaDoAto` também não mostra mais: repetiria
          o "prazo de N dias" que `qualificacao` já deu, uma linha acima. */}
      <p className={styles.quandoProcedencia}>
        {procedenciaPrazo(p)}
        {estimado && '. Não considera feriado local nem suspensão por portaria.'}
      </p>
      {p.publicadoEm && (
        <p className={styles.quandoProcedencia}>
          Conta da publicação de {dataWallClock(new Date(p.publicadoEm))}
          {/* Três nomes, não o polo inteiro — aqui cabe um a mais que na
              linha fechada, porque o card aberto é onde se confere de quem é
              o prazo. `partesCurtas` diz quantos ficaram de fora. */}
          {p.parte ? ` · intimado: ${partesCurtas(p.parte, 3)}` : ''}
          {p.cienciaFicta && ' · ciência automática (ficta)'}
        </p>
      )}
    </div>
  );
}

/** Uma hierarquia para pauta, kanban, calendário e expedientes sem data. */
export function PrazoRow({ prazo: p, compacto = false }: { prazo: Prazo; compacto?: boolean }) {
  const faixa = faixaPrazo(p);
  const natureza = rotuloNatureza(p);
  const titulo = expedientePrazo(p);
  const parte = clientePrazo(p);
  const estimado = Boolean(p.vencimentoISO) && (p.origemPrazo === 'djen' || p.origemPrazo === 'tribunalPublico');

  // O que sobra depois de leitura, providência, qualificação e documentos já
  // terem dito o resto: só órgão e assunto, quando não subiram para o título.
  const fichaResidual = [
    ['Órgão julgador', p.orgaoJulgador !== '—' ? p.orgaoJulgador : null],
    ['Assunto', p.assunto && p.assunto !== parte ? p.assunto : null],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <details className={`${styles.item} ${compacto ? styles.compacto : ''}`}>
      <summary className={styles.linha}>
        <span className={styles.corpo}>
          <span className={styles.vencimento} data-faixa={faixa}>
            <Clock3 size={14} aria-hidden="true" />
            <span>{p.fechado ? 'Encerrado' : quandoPrazo(p.diasRestantes)}</span>
            {/* O `≈` antes da data JÁ diz que é cálculo nosso — a etiqueta
                "Data estimada" ao lado repetia a mesma informação e roubava a
                largura de quem lê a data. A ressalva por extenso continua no
                detalhe, que é onde ela cabe. */}
            {p.vencimentoISO && (
              <time dateTime={p.vencimentoISO} title={estimado ? 'Data calculada por nós, não publicada pelo tribunal' : undefined}>
                {estimado ? '≈ ' : ''}{dataPrazo(p.vencimentoISO)}
              </time>
            )}
          </span>
          <span className={styles.titulo}>{titulo}</span>
          {parte !== titulo && <span className={styles.parte}>{parte}</span>}
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
        </span>
        <span className={styles.calha}>
          <span className={styles.tags}>
            {natureza && <span className={styles.natureza}>{natureza}</span>}
            <TribTag label={tribunalTagLabel(p.tribunal, p.grau)} />
            <ChevronRight size={16} className={styles.seta} aria-hidden="true" />
          </span>
          <span className={styles.cnj}>{p.cnj}</span>
        </span>
      </summary>
      <div className={styles.detalhe}>
        {/* Você precisa vem primeiro — a providência é a pergunta que se
            responde ao abrir o card. Até quando/por quê fica na coluna ao
            lado no desktop, e a leitura do ato fecha embaixo das duas, em
            largura total: mesma ordem e mesma grade de `PrazoDoAto`, em
            `AtoDetalhe.module.css`. */}
        <div className={styles.painel}>
          {/* O que fazer — a providência que o ato cobra, e de quem ela é. */}
          {p.ato && (
            <div className={styles.painelPrecisa}>
              <ProvidenciaDoAto mov={p.ato} />
            </div>
          )}

          <div className={styles.painelQuando}>
            <QuandoEPorQue p={p} />
          </div>

          {/* O que aconteceu, o que produzir até lá (peça, checklist, o que
              falta, o risco) e o botão que pede a leitura quando ainda falta —
              tudo na mesma chamada desde a fusão ato+prazo. Substitui a
              `LeituraIaDoAto` somente-leitura + o `AnalisePrazoPainel` (rota
              `/ia/prazos/{id}`, removida) que existiam separados até 10/09/2026. */}
          {p.ato && (
            <div className={styles.painelLeitura}>
              <LeituraDoAto mov={p.ato} />
            </div>
          )}
        </div>

        {/* Os documentos — a peça do tribunal e a certidão de publicação. */}
        {p.ato && <DocumentosDoAto mov={p.ato} />}

        {!p.vencimentoISO && (
          <p className={styles.nota}>Este expediente não tem data de vencimento informada e não entra na contagem de urgência.</p>
        )}

        {fichaResidual.length > 0 && (
          <dl className={styles.ficha}>
            {fichaResidual.map(([rotulo, valor]) => <div key={rotulo}><dt>{rotulo}</dt><dd>{valor}</dd></div>)}
          </dl>
        )}

        <div className={styles.links}>
          {p.movementId && <Link href={`/movimentacoes/${encodeURIComponent(p.movementId)}`}>Ver o ato que abriu o prazo →</Link>}
          <Link href={`/processos/${encodeURIComponent(p.cnj)}`}>Ver o processo →</Link>
        </div>
      </div>
    </details>
  );
}
