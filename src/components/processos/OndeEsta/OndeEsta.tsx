import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Processo, ProcessoParte } from '@/types';
import { FASE_PROCESSO, nomeLegivel, tempoCurto } from '@/lib/processo-apresentacao';
import { StatusDot } from '@/components/ui/StatusDot/StatusDot';
import styles from './OndeEsta.module.css';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

function dataCurta(valor: string | null): string {
  if (!valor) return '—';
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? '—' : data.format(d);
}

const STATUS: Record<string, string> = { active: 'Ativo', archived: 'Arquivado', suspended: 'Suspenso' };

/**
 * § ONDE ESTÁ — fase, grau, status, órgão, autuação, valor. **Visíveis.**
 *
 * Até aqui o órgão julgador morava dentro de um `<details>` fechado: um clique
 * em toda visita, para sempre, para ler a vara em que o processo corre. O
 * `<details>` continua — mas com o que de fato é detalhe (partes por extenso,
 * assunto, alertas), e não com a resposta que se procura ao abrir a página.
 *
 * ## A fase é condicionada, e a tela diz isso
 *
 * `analiseCaso.fase` só existe depois que alguém roda "Analisar processo" —
 * `analiseCaso` é `null` até lá, que é o caso comum. Por isso a pílula de fase
 * tem dois desenhos: **preenchida** quando há leitura, **só contorno** quando
 * não há. Ausência não pode ter a cara de dado, e "Fase a confirmar" com fundo
 * cinza lê exatamente como "Em instrução" com fundo cinza.
 *
 * ## "Consultado há 3 h" fica aqui, não no cabeçalho
 *
 * É a procedência do que a página inteira mostra, e ela pertence ao bloco que
 * responde "onde está" — não à faixa de identidade, onde competiria com o nome
 * do cliente.
 */
export function OndeEsta({ processo, detalhes, detalhesAbertos = false }: {
  processo: Processo;
  /** O conteúdo do `<details>` — partes, capa e o resumo do caso, montados pela página. */
  detalhes?: ReactNode;
  /**
   * Nasce aberto. O `<details>` existia para a ficha caber numa calha de 352px
   * ao lado da lista; numa aba só dela, esconder o conteúdo que a aba promete
   * seria cobrar um clique por nada. Continua recolhível — só não começa assim.
   */
  detalhesAbertos?: boolean;
}) {
  const fase = processo.analiseCaso?.fase ?? null;
  const grau = processo.grau === '1' || processo.grau === '2' ? `${processo.grau}º grau` : null;
  const falhou = Boolean(processo.syncError);

  return (
    <div className={styles.bloco}>
      <div className={styles.estado}>
        <span className={fase ? styles.fase : `${styles.fase} ${styles.faseAConfirmar}`}>
          {FASE_PROCESSO[fase ?? 'indefinido']}
        </span>
        <span className={styles.classe}>
          {[processo.classeJudicial ?? processo.materia, grau, STATUS[processo.status] ?? processo.status]
            .filter(Boolean).join(' · ')}
        </span>
      </div>

      <p className={styles.orgao}>{processo.orgaoJulgador}</p>

      {/* Sem leitura do caso não há fase, e dizer de onde ela viria é melhor do
          que um rótulo cinza que parece um dado que ninguém conseguiu ler. */}
      {!fase && (
        <p className={styles.notaFase}>
          A fase vem da leitura do caso pela IA, e ninguém pediu a análise deste processo ainda.
        </p>
      )}

      <dl className={styles.ficha}>
        <Campo rotulo="Autuado">
          {dataCurta(processo.autuadoEm)}
          {processo.autuadoEm && <span className={styles.desde}> · {tempoCurto(processo.autuadoEm)}</span>}
        </Campo>
        <Campo rotulo="Valor da causa">
          {processo.valorCausa == null ? '—' : moeda.format(processo.valorCausa)}
        </Campo>
        <Campo rotulo="Consultado">
          <span className={styles.sync}>
            <StatusDot state={falhou ? 'alert' : 'quiet'} />
            {falhou
              ? 'falhou'
              : processo.lastScrapedAt ? tempoCurto(processo.lastScrapedAt) : 'aguardando'}
          </span>
        </Campo>
      </dl>

      {/* ── O TRIBUNAL DIZ "ATIVO" E O PROCESSO NÃO ANDA ────────────────────
          Status do tribunal não é sinal de vida: metade de um acervo está
          parada com a etiqueta `active`. O aviso só sai quando a contradição
          existe — um ano inteiro sem movimentação num processo que o tribunal
          marca como ativo. */}
      {processo.status === 'active' && paradoHaMaisDeUmAno(processo.lastMovAt) && (
        <p className={styles.contradicao}>
          O tribunal ainda marca este processo como <strong>Ativo</strong>, e ele não se move
          há {tempoCurto(processo.lastMovAt).replace('há ', '')}. Status do tribunal não é sinal de vida.
        </p>
      )}

      {detalhes && (
        <details className={styles.detalhes} id="detalhes-processo" open={detalhesAbertos || undefined}>
          <summary className={styles.resumo}>
            <ChevronRight aria-hidden="true" size={14} strokeWidth={2} className={styles.seta} />
            <span className={styles.resumoTitulo}>Detalhes do processo</span>
            <span className={styles.resumoNota}>partes, assunto, alertas</span>
          </summary>
          <div className={styles.corpoDetalhes}>{detalhes}</div>
        </details>
      )}
    </div>
  );
}

function paradoHaMaisDeUmAno(lastMovAt: string | null): boolean {
  if (!lastMovAt) return false;
  const d = new Date(lastMovAt).getTime();
  return !Number.isNaN(d) && Date.now() - d > 365 * 86_400_000;
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className={styles.campo}>
      <dt className={styles.campoRotulo}>{rotulo}</dt>
      <dd className={styles.campoValor}>{children}</dd>
    </div>
  );
}

/** Um polo por extenso, com representantes — o conteúdo do `<details>`. */
export function PoloBlock({ titulo, partes }: { titulo: string; partes: ProcessoParte[] }) {
  return (
    <div className={styles.polo}>
      <h3 className={styles.poloTitulo}>{titulo}</h3>
      {partes.length === 0 ? (
        <p className={styles.poloVazio}>Partes ainda não disponíveis nesta consulta.</p>
      ) : (
        <ul className={styles.poloLista}>
          {partes.map((parte, i) => (
            <li key={`${parte.nome}-${i}`} className={styles.poloItem}>
              <span className={styles.poloNome}>{nomeLegivel(parte.nome)}</span>
              <span className={styles.poloDoc}>{[parte.tipo, parte.documento].filter(Boolean).join(' · ')}</span>
              {parte.representantes.length > 0 && (
                <span className={styles.poloRepresentantes}>{parte.representantes.join(' · ')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
