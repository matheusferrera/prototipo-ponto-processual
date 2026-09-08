import Link from 'next/link';
import { ChevronRight, Clock3 } from 'lucide-react';
import type { Prazo } from '@/types';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { LeituraIaDoAto, ProvidenciaDoAto, DocumentosDoAto } from '@/components/movimentacoes/AtoDetalhe/AtoDetalhe';
import { AnalisePrazoPainel } from '../AnalisePrazoPainel/AnalisePrazoPainel';
import { clientePrazo, expedientePrazo, procedenciaPrazo, qualificacaoPrazo, rotuloNatureza } from '@/lib/prazo';
import { tribunalTagLabel } from '@/lib/tribunals';
import { dataPrazo, faixaPrazo, quandoPrazo } from '@/lib/prazo-apresentacao';
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
  if (qualificacao.length === 0 && !p.fundamento && !p.publicadoEm) return null;

  return (
    <div className={styles.quando}>
      {qualificacao.length > 0 && <p className={styles.quandoLinha}>{qualificacao.join(' · ')}</p>}
      <p className={styles.quandoProcedencia}>
        {p.fundamento ? `${p.fundamento} — ` : ''}{procedenciaPrazo(p)}
        {estimado && '. Não considera feriado local nem suspensão por portaria.'}
      </p>
      {p.publicadoEm && (
        <p className={styles.quandoProcedencia}>
          Conta da publicação de {dataWallClock(new Date(p.publicadoEm))}
          {p.parte ? ` · intimado: ${p.parte}` : ''}
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
        {/* O que fazer — a providência que o ato cobra, e de quem ela é. */}
        {p.ato && <ProvidenciaDoAto mov={p.ato} />}

        {/* O que aconteceu — a leitura do ato pela IA, com fundamento e confiança. */}
        {p.ato && <LeituraIaDoAto mov={p.ato} />}

        {/* Até quando e por quê — a qualificação do prazo. */}
        <QuandoEPorQue p={p} />

        {/* O que produzir até lá — peça, checklist, o que falta, o risco. */}
        <AnalisePrazoPainel
          prazoId={p.id}
          analiseInicial={p.analise ?? null}
          podeAnalisar={p.fechado !== true && Boolean(p.ato)}
        />

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
