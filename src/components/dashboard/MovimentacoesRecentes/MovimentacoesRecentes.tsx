'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Lock } from 'lucide-react';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { DocumentoLink } from '@/components/movimentacoes/DocumentoLink/DocumentoLink';
import styles from './MovimentacoesRecentes.module.css';

/**
 * O PASSO do "exibir mais": cinco por vez, começando em cinco.
 *
 * Não é scroll infinito de propósito — o painel já tem os 50 atos na mão (eles
 * vieram na mesma busca que alimenta o heatmap e os contadores), então revelar
 * é só estado local, mas revelar TUDO de uma vez faria o dashboard abrir com
 * cinquenta linhas de prosa acima dos outros blocos.
 */
const PASSO = 5;

/**
 * Uma linha do painel, já resolvida NO SERVIDOR.
 *
 * O componente é cliente (o "exibir mais" precisa de estado), e por isso tudo
 * o que exige o acervo — o nome do caso, que sai de `nomeDoCaso` cruzando o
 * CNJ com a carteira; o estado do documento — é decidido antes de atravessar a
 * fronteira. O que chega aqui é o que a linha desenha, e nada mais: mandar o
 * `Processo` inteiro por item seria pagar serialização por dado que a tela não
 * mostra.
 */
export interface LinhaRecente {
  id: string;
  /** O confronto entre os polos — o mesmo título da página do processo. */
  titulo: string;
  cnj: string;
  tribunal: string;
  /** "HOJE", "ONTEM" ou "4 SET" — o mesmo rótulo de dia do feed. */
  dataLabel: string;
  /** `HH:MM`, ausente quando o ato só tem data (o diário publica sem hora). */
  time?: string;
  /** O rótulo do tribunal ("Juntada de Petição de petição"). */
  detail: string;
  resumo: string | null;
  acao: string | null;
  daParteContraria: boolean;
  confiancaBaixa: boolean;
  /**
   * O que fazer com o documento:
   * `abre` vira link; `sigiloso` vira cadeado sem clique; `nenhum` não desenha
   * nada. Quem decide é o servidor, que enxerga o livro-razão da aquisição.
   */
  doc: 'abre' | 'sigiloso' | 'nenhum';
  /** Motivo do cadeado, no hover. */
  docMotivo?: string;
  /** O PDF oficial do CNJ — presente em 100% dos atos do diário. */
  temCertidao: boolean;
}

/**
 * AS ÚLTIMAS MOVIMENTAÇÕES — o feed do painel, com o caso identificado e o que
 * a IA leu.
 *
 * Substituiu a lista que usava `MovimentacaoRow` em 08/09/2026. A linha de lá é
 * desenhada para a tela de movimentações, onde a coluna da esquerda é o cliente
 * e o corpo é o ato; aqui o que faltava era outra coisa — o **caso** (o número
 * sozinho não diz de que processo se trata), o resumo da IA quando existe, e o
 * acesso ao documento sem sair do painel.
 */
export function MovimentacoesRecentes({ linhas }: { linhas: LinhaRecente[] }) {
  const [visiveis, setVisiveis] = useState(PASSO);
  const mostradas = linhas.slice(0, visiveis);
  const faltam = linhas.length - mostradas.length;

  return (
    <>
      {mostradas.map(l => (
        <div key={l.id} className={styles.item}>
          <Link href={`/movimentacoes/${l.id}`} className={styles.corpo}>
            <span className={styles.cabeca}>
              <span className={styles.caso}>{l.titulo}</span>
              <TribTag label={l.tribunal} />
            </span>

            {/* QUANDO primeiro, e mais forte que o número. Os dois estavam na
                mesma linha, no mesmo cinza e no mesmo peso, e a data sumia no
                meio — num feed cronológico ela é o eixo de leitura, e o CNJ é
                a etiqueta que se confere depois de já ter achado a linha. */}
            <span className={styles.etiqueta}>
              <span className={styles.quando}>
                {l.dataLabel}{l.time ? ` · ${l.time}` : ''}
              </span>
              <span className={styles.cnj}>{l.cnj}</span>
            </span>

            <span className={styles.ato}>{l.detail}</span>

            {l.resumo && <p className={styles.resumo}>{l.resumo}</p>}
            {l.acao && <span className={styles.acao}><strong>A fazer:</strong> {l.acao}</span>}
          </Link>

          <span className={styles.chips}>
            {/* Prazo da outra parte é o que evita trabalho à toa: o ato chegou,
                e não é seu. */}
            {l.daParteContraria && <span className={styles.chip}>prazo da parte contrária</span>}
            {/* `baixa` = o ato chegou sem dispositivo. Esconder isso é
                apresentar palpite como fato num campo usado para não perder prazo. */}
            {l.confiancaBaixa && (
              <span className={styles.chip} data-confianca="baixa">confira o ato</span>
            )}
            {l.doc === 'sigiloso' && (
              <span className={styles.chip} data-sigilo="" title={l.docMotivo}>
                <Lock size={11} aria-hidden="true" /> documento sigiloso
              </span>
            )}
            {l.doc === 'abre' && (
              <DocumentoLink url={`/api/movimentacoes/${l.id}/documento`} className={styles.doc}>
                <FileText size={12} aria-hidden="true" />
                ver documento
              </DocumentoLink>
            )}
            {/* A certidão é OUTRO documento, não uma segunda via da peça: é a
                prova de que o ato foi publicado, com o teor integral. */}
            {l.temCertidao && (
              <DocumentoLink
                url={`/api/movimentacoes/${l.id}/certidao`}
                className={styles.doc}
                title="O PDF oficial do CNJ: capa, destinatário, advogados com OAB e o teor integral."
              >
                <FileText size={12} aria-hidden="true" />
                certidão de publicação
              </DocumentoLink>
            )}
          </span>
        </div>
      ))}

      {faltam > 0 && (
        <button
          type="button"
          className={styles.mais}
          onClick={() => setVisiveis(v => v + PASSO)}
        >
          Exibir mais {Math.min(PASSO, faltam)}
        </button>
      )}
    </>
  );
}
