'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Sparkles } from 'lucide-react';
import styles from './AnalisarProcessoButton.module.css';

interface Props {
  /** Id do processo no nosso banco — a chave da contagem de leitura. */
  processId: string;
  /** Número CNJ, que é o endereço que as fontes públicas entendem. */
  numero: string;
  /**
   * A classe do botão vem da PÁGINA, não daqui — mesma razão do
   * `ExportProcessoPdfButton`: ele mora na barra de breadcrumb ao lado de
   * "Ver no PJe", e os três têm que ser o mesmo botão.
   */
  className?: string;
}

/** Rótulo humano de cada etapa que o job publica em `result.etapa`. */
const ETAPAS: Record<string, string> = {
  processo: 'localizando o processo',
  pdpj: 'histórico do processo atualizado',
  prazos: 'calculando prazos',
};

/** Primeiro intervalo do poll do job. Ele costuma terminar em segundos. */
const INTERVALO_JOB_MS = 1_500;
/**
 * Intervalo do poll da LEITURA, que é outra ordem de grandeza: cada ato leva
 * ~20 s (o modelo, mais o teto de `KIMI_RPM` numa fila de concorrência 1).
 * Perguntar mais rápido não faz o modelo ler mais rápido.
 */
const INTERVALO_LEITURA_MS = 6_000;

/** Teto do job da consulta: passou disto, ele não está terminando por nossa causa. */
const LIMITE_JOB_MS = 90_000;

/**
 * Quanto tempo sem NENHUMA leitura nova antes de devolver o controle.
 *
 * Substituiu um teto absoluto de 10 minutos, que era a medida errada: um
 * processo de 48 atos leva ~16 min só para drenar, e a fila `ia` é global — ela
 * pode estar ocupada com a ronda de outra conta. O que separa "está andando,
 * devagar" de "não vai andar" é o PROGRESSO, não o relógio: enquanto ato novo
 * aparece, a espera continua; três minutos calados encerram.
 */
const PACIENCIA_SEM_PROGRESSO_MS = 3 * 60_000;

/**
 * A mesma espera, depois que a rodada já leu o que pediu.
 *
 * Uma leitura escreve em TODAS as movimentações do mesmo ato (o agrupamento é
 * pelo hash do teor), então "movimentações lidas ≥ atos enfileirados" é forte
 * indício de fim, e não prova: um ato de quatro linhas adianta o contador
 * enquanto outro ainda está na fila. Meio minuto calado depois disso encerra —
 * sem ele, toda rodada terminaria com três minutos de poll contra uma fila
 * parada.
 */
const GRACA_APOS_ALVO_MS = 30_000;

/**
 * Rodadas de leitura por clique.
 *
 * A rodada existe porque a busca da peça acontece dentro da requisição (até
 * duas idas ao portal por documento), então o backend a limita e devolve o
 * resto em `adiadosPorOrcamento`. Oito rodadas cobrem qualquer processo do
 * acervo; o teto está aqui para uma tela esquecida aberta não pedir para sempre.
 */
const MAX_RODADAS = 8;

type Fase = 'ocioso' | 'consultando' | 'lendo' | 'pronto';

type RespostaJob = {
  status?: string;
  failReason?: string;
  result?: {
    etapa?: string;
    criado?: boolean;
    pdpj?: { movimentos?: number };
  };
};

/**
 * O que `POST /ia/processos/{id}` devolve — só o que foi ENFILEIRADO, nunca o
 * resultado: a fila `ia` é serial e resolve depois.
 */
type RespostaIa = {
  atos?: {
    enfileirados?: number;
    candidatos?: number;
    semTexto?: number;
    /** Ficaram de fora pelo teto de atos da rodada. */
    excedentes?: number;
    /** Têm documento e ficaram sem teor porque o orçamento de busca acabou. */
    adiadosPorOrcamento?: number;
  };
  analises?: { prazosEnfileirados?: number; casosEnfileirados?: number };
  error?: string;
};

/** A cobertura do processo, como `/api/processos/{id}/leitura` a devolve. */
type Cobertura = { lidas: number; legiveis: number; total: number };

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function plural(n: number, um: string, muitos: string): string {
  return `${n} ${n === 1 ? um : muitos}`;
}

/**
 * Atualiza ESTE processo nas fontes públicas e manda a IA explicar o que veio —
 * **até acabar**.
 *
 * São **duas chamadas**, e é isto que o botão orquestra:
 *
 * 1. **A consulta** (`POST /consulta-publica/processo`) — capa e histórico pelo
 *    PDPJ, mais a heurística de prazo do ato. Assíncrona, mas termina em
 *    segundos; o andamento sai por etapa em `/api/jobs/{jobId}`.
 * 2. **A leitura** (`POST /api/ia/processos/{id}`), em RODADAS — os atos ainda
 *    não lidos e a síntese do caso. Só enfileira; a fila `ia` é serial e drena
 *    a ~20 s por ato.
 *
 * **Por que rodadas (10/09/2026).** Uma chamada não esgota o processo: a busca
 * da peça acontece dentro dela, então o backend limita quantos documentos vai
 * atrás por vez e devolve o resto em `adiadosPorOrcamento` (e em `excedentes`,
 * o teto de atos). Antes o botão parava na primeira: num processo com 48 atos
 * ele lia 25, dizia "análise concluída" e ficava por isso — metade do processo
 * analisado, sem nada na tela explicando por quê. Agora ele pede a rodada
 * seguinte até uma delas não enfileirar mais nada — e para antes disso se a fila
 * deixar de andar.
 *
 * **O progresso é a COBERTURA do processo inteiro**, não a contagem da primeira
 * página: `/api/processos/{id}/leitura` passou a responder pelo dossiê da IA. O
 * contador antigo olhava as 100 movimentações mais novas enquanto a IA lê por
 * categoria — e ficava parado em números que nunca alcançavam o alvo.
 *
 * `router.refresh()` a cada avanço: a página é Server Component, e é ele que
 * troca o rótulo do tribunal pelo resumo da IA na timeline, sem recarregar.
 */
export function AnalisarProcessoButton({ processId, numero, className }: Props) {
  const router = useRouter();

  const [fase, setFase] = useState<Fase>('ocioso');
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  /* Desmontar a página (navegar para outro processo) tem que parar o ciclo —
     senão ele segue chamando `setState` num componente que já saiu da tela. */
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  /** A cobertura do processo — três números, contados no servidor. */
  const contarLidas = useCallback(async (): Promise<Cobertura> => {
    const resposta = await fetch(`/api/processos/${encodeURIComponent(processId)}/leitura`, {
      cache: 'no-store',
    });
    if (!resposta.ok) throw new Error(`Não foi possível acompanhar a leitura (${resposta.status})`);
    return (await resposta.json()) as Cobertura;
  }, [processId]);

  /**
   * Espera o job da consulta terminar, narrando a etapa.
   *
   * Não devolve mais contagem de leitura: desde 07/09/2026 este job não lê nada
   * — quem lê é `POST /api/ia/processos/{id}`, chamada logo depois.
   */
  const acompanharJob = useCallback(async (jobId: string): Promise<void> => {
    const ateQuando = Date.now() + LIMITE_JOB_MS;

    while (vivo.current && Date.now() < ateQuando) {
      const resposta = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' });
      if (!resposta.ok) throw new Error(`Não foi possível acompanhar a consulta (${resposta.status})`);
      const job = (await resposta.json()) as RespostaJob;

      if (job.result?.etapa) setDetalhe(ETAPAS[job.result.etapa] ?? job.result.etapa);
      if (job.status === 'failed') throw new Error(job.failReason ?? 'A consulta falhou no servidor.');
      if (job.status === 'completed') {
        // A consulta já gravou capa, movimentações e prazo: vale mostrar isso
        // antes mesmo de a primeira leitura sair.
        router.refresh();
        return;
      }

      await sleep(INTERVALO_JOB_MS);
    }

    // Estourou o teto: não é erro, o job continua na fila. A leitura é pedida
    // do mesmo jeito — ela varre o banco (`analisadoEm IS NULL`), então pega o
    // que a consulta já gravou e o resto na próxima vez.
  }, [router]);

  /**
   * Acompanha uma rodada até a fila parar de andar. Devolve quantas
   * movimentações foram lidas NELA.
   *
   * O alvo em atos não serve como condição de parada: uma leitura escreve em
   * todas as movimentações do mesmo ato (o agrupamento é pelo hash do teor),
   * então 25 atos podem virar 40 movimentações lidas — comparar os dois números
   * encerraria a espera cedo, com jobs ainda na fila. Quem diz que acabou é a
   * própria fila, quando para de produzir.
   */
  const acompanharRodada = useCallback(async (rodada: number, enfileirados: number): Promise<number> => {
    const partida = await contarLidas();
    let ultima = partida;
    let ultimoAvanco = Date.now();

    while (vivo.current) {
      const lidasNaRodada = ultima.lidas - partida.lidas;
      setDetalhe(
        `rodada ${rodada} · ${plural(lidasNaRodada, 'ato lido', 'atos lidos')}` +
        ` de ~${enfileirados} · ${ultima.lidas} no processo`,
      );

      const paciencia = lidasNaRodada >= enfileirados ? GRACA_APOS_ALVO_MS : PACIENCIA_SEM_PROGRESSO_MS;
      if (Date.now() - ultimoAvanco > paciencia) return lidasNaRodada;

      await sleep(INTERVALO_LEITURA_MS);
      if (!vivo.current) return lidasNaRodada;

      const agora = await contarLidas();
      // Só recarrega quando há o que mostrar — um refresh por volta do poll
      // rebuscaria a página inteira para não mudar nada.
      if (agora.lidas > ultima.lidas) {
        ultimoAvanco = Date.now();
        router.refresh();
      }
      ultima = agora;
    }

    return ultima.lidas - partida.lidas;
  }, [contarLidas, router]);

  /**
   * Pede uma rodada de leitura e devolve o que o backend enfileirou.
   *
   * Os prazos e a síntese do caso entram na mesma chamada e não têm poll: eles
   * aparecem na aba de IA quando a fila os resolver, e inventar barra para eles
   * seria dois denominadores concorrendo no mesmo rótulo.
   */
  const pedirLeitura = useCallback(async (): Promise<RespostaIa> => {
    const resposta = await fetch(`/api/ia/processos/${encodeURIComponent(processId)}`, {
      method: 'POST',
      cache: 'no-store',
    });
    const corpo = (await resposta.json()) as RespostaIa;
    if (!resposta.ok) {
      // 503 é a instalação sem chave de IA — dizer isso é mais útil que "falhou".
      throw new Error(resposta.status === 503
        ? 'A análise por IA está desligada nesta instalação.'
        : corpo.error ?? `Não foi possível pedir a leitura (${resposta.status})`);
    }
    return corpo;
  }, [processId]);

  async function analisar() {
    setErro(null);
    setFase('consultando');
    setDetalhe(null);

    try {
      const resposta = await fetch('/api/consulta-publica/processo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero }),
        cache: 'no-store',
      });
      const corpo = (await resposta.json()) as { jobId?: string; error?: string };

      if (!resposta.ok || !corpo.jobId) {
        throw new Error(corpo.error ?? `Não foi possível iniciar a análise (${resposta.status})`);
      }

      await acompanharJob(corpo.jobId);
      if (!vivo.current) return;

      // A consulta trouxe o que havia; agora a IA lê — quantas rodadas forem
      // precisas para não sobrar ato legível sem leitura.
      setDetalhe('pedindo a leitura à IA');
      let lidasNoTotal = 0;
      let sobrou = 0;
      let naFila = 0;
      let rodada = 0;

      while (rodada < MAX_RODADAS) {
        const ia = await pedirLeitura();
        if (!vivo.current) return;

        naFila += (ia.analises?.prazosEnfileirados ?? 0) + (ia.analises?.casosEnfileirados ?? 0);
        const enfileirados = ia.atos?.enfileirados ?? 0;
        sobrou = (ia.atos?.excedentes ?? 0) + (ia.atos?.adiadosPorOrcamento ?? 0);
        if (enfileirados === 0) break;

        rodada += 1;
        setFase('lendo');
        const lidasNaRodada = await acompanharRodada(rodada, enfileirados);
        if (!vivo.current) return;
        lidasNoTotal += lidasNaRodada;

        // A fila parou sem ler nada desta rodada: insistir só repetiria o
        // mesmo pedido — o que ficou é o que a próxima visita pega.
        if (lidasNaRodada === 0) break;

        // **Não se para por `sobrou === 0`**, e a medição é que decidiu. Parecia
        // a saída óbvia — o backend diz o que adiou —, mas ela perde o ato que
        // se TORNA legível durante a rodada: buscar a peça grava o teor, e um
        // ato sem texto no começo tem texto no fim. Medido em 10/09/2026 no
        // `0700891-02.2023.8.07.0002`: a rodada 1 devolveu `excedentes: 0` e
        // `adiadosPorOrcamento: 0` — nada pendente, pelo relato dela — e a
        // rodada seguinte ainda encontrou **5 atos** para ler. Quem encerra o
        // ciclo é a rodada que não enfileira nada, verificada no topo do laço.
      }

      if (!vivo.current) return;
      setFase('pronto');
      const cobertura = await contarLidas().catch(() => null);
      setDetalhe(
        lidasNoTotal > 0
          ? `${plural(lidasNoTotal, 'ato lido', 'atos lidos')} agora` +
            (cobertura ? ` · ${cobertura.lidas} de ${cobertura.legiveis} com texto no processo` : '') +
            (sobrou > 0 ? ' · ainda há atos por ler — clique de novo' : '')
          : naFila > 0 ? 'atos já lidos; prazos e síntese na fila'
          : 'nada novo para ler neste processo',
      );
      router.refresh();
    } catch (falha) {
      console.error('Não foi possível analisar o processo.', falha);
      if (!vivo.current) return;
      setFase('ocioso');
      setDetalhe(null);
      setErro(falha instanceof Error ? falha.message : 'Não foi possível analisar o processo.');
    }
  }

  const ocupado = fase === 'consultando' || fase === 'lendo';
  const rotulo = fase === 'consultando' ? 'Analisando…'
    : fase === 'lendo' ? 'Lendo os atos…'
    : fase === 'pronto' ? 'Análise concluída'
    : 'Analisar processo';

  return (
    <>
      {erro && <span className={styles.erro} role="alert">{erro}</span>}
      {!erro && detalhe && (
        // `polite` e não `assertive`: é acompanhamento, não alerta — não deve
        // interromper quem estiver lendo a timeline com leitor de tela.
        <span className={styles.detalhe} aria-live="polite">{detalhe}</span>
      )}
      <button
        type="button"
        className={className}
        title="Consulta este processo nas fontes públicas e pede à IA que leia todas as movimentações possíveis"
        disabled={ocupado}
        aria-busy={ocupado}
        onClick={analisar}
      >
        {ocupado ? (
          <LoaderCircle aria-hidden="true" size={16} strokeWidth={2} className={styles.spinner} />
        ) : (
          <Sparkles aria-hidden="true" size={16} strokeWidth={2} />
        )}
        {rotulo}
      </button>
    </>
  );
}
