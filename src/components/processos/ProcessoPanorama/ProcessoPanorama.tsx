import Link from 'next/link';
import { ArrowUpRight, Clock3, Sparkles } from 'lucide-react';
import type { AnaliseDoCaso, Prazo, TimelineEvent } from '@/types';
import { panoramaProcesso, origemDataPrazo } from '@/lib/processo-panorama';
import { dataPrazo, quandoPrazo, faixaPrazo } from '@/lib/prazo-apresentacao';
import { RevisarProvidencia, VerAnaliseCompleta } from './ProcessoControls';
import styles from './ProcessoPanorama.module.css';

const DESTINATARIOS: Record<string, string> = {
  destinatario: 'Destinatário do ato', parteContraria: 'Parte contrária', terceiro: 'Terceiro', indefinido: 'Destinatário a confirmar',
};

const FASE: Record<string, string> = {
  conhecimento: 'Conhecimento', instrucao: 'Instrução', sentenciado: 'Sentenciado',
  recursal: 'Fase recursal', execucao: 'Execução', arquivado: 'Arquivado', indefinido: 'Fase a confirmar',
};

export function ProcessoPanorama({ eventos, prazos, basePath, caso }: {
  eventos: TimelineEvent[]; prazos: Prazo[]; basePath: string;
  /** A síntese do processo pela IA — o topo da pirâmide. Ver `AnaliseDoCaso`. */
  caso?: AnaliseDoCaso | null;
}) {
  const { ultimo, prazo, acao, vencidos, semData } = panoramaProcesso(eventos, prazos);
  return <section className={styles.panorama} aria-label="Panorama do processo">
    {/* O RESUMO DO CASO, como CHAMADA — não como cópia.
        A aba de IA já responde "onde o caso está", e melhor: `<dl>` com campos
        rotulados (Situação, Pedido, Última decisão, Aguardando, Atenção,
        Próximo passo). A primeira versão disto repetia os mesmos dados aqui,
        empilhados como parágrafos de peso igual — 1.097px de parede, um card
        dentro de outro card, e a mesma informação em dois lugares com a pior
        das duas apresentações vencendo por estar mais acima na página.

        O painel é uma OLHADA: a fase, as três primeiras linhas da síntese, e a
        porta para a leitura inteira. Quem quer o detalhe clica. */}
    {caso && (
      <section className={styles.caso} aria-labelledby="sintese-caso">
        <div className={styles.casoCabeca}>
          <h2 id="sintese-caso" className={styles.casoTitulo}>
            <Sparkles size={14} aria-hidden="true" /> Resumo do processo
          </h2>
          {/* Neutro, não âmbar: "Arquivado" é um FATO de estado, não uma
              advertência, e o register de produto proíbe acento saturado em
              estado inativo. No painel o `.badge` âmbar já significa três
              coisas (procedência, ressalva, taxonomia) — a fase sai dessa
              sobrecarga e fica em tom neutro. */}
          <span className={styles.casoFase}>{FASE[caso.fase] ?? FASE.indefinido}</span>
          {/* A confiança baixa muda COMO se lê tudo acima, então ela sobe para
              o cabeçalho. Antes era o fim da menor linha do bloco — o lugar
              onde uma ressalva não ressalva nada. */}
          {caso.confianca === 'baixa' && <span className={styles.casoRessalva}>leitura incerta</span>}
        </div>
        <p className={styles.casoSintese}>{caso.sintese}</p>
        <p className={styles.casoRodape}>
          {/* Trocar a aba não basta: a aba de IA abre ~800px abaixo do painel,
              fora da tela. O componente cliente leva o clique até a leitura —
              ver `VerAnaliseCompleta`, que explica por que o hash sozinho não
              resolve nesta página. */}
          <VerAnaliseCompleta href={`${basePath}?aba=ia#analises-ia`} />
          {/* `atualizadaEm` existia no tipo e não era renderizado: uma síntese
              anterior à última movimentação está velha de um jeito que o leitor
              não tem como perceber. */}
          {caso.atualizadaEm && (
            <span className={styles.casoData}>Resumo de IA · {new Date(caso.atualizadaEm).toLocaleDateString('pt-BR')}</span>
          )}
        </p>
      </section>
    )}

    <section className={styles.section} aria-labelledby="ultimo-acontecimento">
      <div className={styles.heading}><h2 id="ultimo-acontecimento">O que aconteceu</h2>{ultimo && <time dateTime={ultimo.dia} className={styles.small}>{ultimo.date} {ultimo.ano}</time>}</div>
      {ultimo ? <>
        <h3>{ultimo.title}</h3>
        {ultimo.ia?.resumo ? <p className={styles.description}>{ultimo.ia.resumo}</p> : <p className={styles.description}>Consulte a movimentação para conferir o conteúdo disponível deste ato.</p>}
        {ultimo.ia?.resumo && <span className={styles.small}>Resumo de IA · conferir no ato original</span>}
        <Link href={`/movimentacoes/${encodeURIComponent(ultimo.id)}`} className={styles.link}>Ver movimentação de origem <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </> : <p className={styles.description}>Nenhuma movimentação disponível para apresentar. Use “Analisar processo” para consultar as fontes.</p>}
    </section>
    <section className={styles.section} aria-labelledby="pontos-atencao">
      <div className={styles.heading}><h2 id="pontos-atencao">Precisa de atenção</h2><Clock3 size={16} aria-hidden="true" /></div>
      {prazo ? <>
        <div className={styles.deadline} data-faixa={faixaPrazo(prazo)}><strong>{quandoPrazo(prazo.diasRestantes)}</strong>{prazo.vencimentoISO && <time dateTime={prazo.vencimentoISO}>{dataPrazo(prazo.vencimentoISO)}</time>}</div>
        <p className={styles.deadlineTitle}>{prazo.tipo}</p>
        <p className={styles.small}>{[prazo.parte, DESTINATARIOS[prazo.deQuem ?? 'indefinido']].filter(Boolean).join(' · ')}</p>
        <span className={styles.badge}>{origemDataPrazo(prazo)}</span>
        {vencidos > 0 && <p className={styles.pending}>{vencidos} {vencidos === 1 ? 'prazo com data vencida sem encerramento registrado' : 'prazos com data vencida sem encerramento registrado'}.</p>}
        {semData > 0 && <p className={styles.small}>{semData} {semData === 1 ? 'expediente sem data definida' : 'expedientes sem data definida'}.</p>}
        <Link className={styles.link} href={`${basePath}?aba=prazos`}>Conferir prazos <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </> : <p className={styles.description}>Nenhum prazo pendente disponível nesta consulta.</p>}
      <div className={styles.task}>
        <div className={styles.heading}><h3><Sparkles size={14} aria-hidden="true" /> Providência sugerida pela IA</h3>{acao && <span className={styles.badge}>A conferir</span>}</div>
        {acao ? <>
          <p className={styles.description}>{acao.ia?.oQueFazer}</p>
          <p className={styles.small}>{DESTINATARIOS[acao.ia?.deQuem ?? 'indefinido']} · {acao.date} {acao.ano}{acao.ia?.confianca === 'baixa' ? ' · Leitura com baixa confiança' : ''}</p>
          {acao.ia?.fundamento && <details className={styles.basis}><summary>Ver fundamento</summary><p>{acao.ia.fundamento}</p></details>}
          <Link className={styles.link} href={`/movimentacoes/${encodeURIComponent(acao.id)}`}>Conferir ato de origem <ArrowUpRight size={14} aria-hidden="true" /></Link>
          <RevisarProvidencia key={acao.id} />
        </> : <p className={styles.description}>Sem análise de IA disponível para este processo.</p>}
      </div>
    </section>
  </section>;
}
