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
 * ~20 s no teto da Moonshot (`KIMI_RPM` 3, concorrência 1, e a fila é global).
 * Perguntar mais rápido não faz o modelo ler mais rápido.
 */
const INTERVALO_LEITURA_MS = 6_000;

/** Teto do job: passou disto, ele não está terminando por nossa causa. */
const LIMITE_JOB_MS = 90_000;
/**
 * Teto da leitura. 25 atos é o máximo por rodada do backend, a ~20 s cada — daí
 * os 10 minutos. Depois disso devolvemos o controle: uma aba esquecida aberta
 * não deve ficar batendo no servidor.
 */
const LIMITE_LEITURA_MS = 10 * 60_000;

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
  atos?: { enfileirados?: number; candidatos?: number; semTexto?: number };
  analises?: { prazosEnfileirados?: number; casosEnfileirados?: number };
  error?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Atualiza ESTE processo nas fontes públicas e manda a IA explicar o que veio.
 *
 * São **duas chamadas**, e é isto que o botão orquestra:
 *
 * 1. **A consulta** (`POST /consulta-publica/processo`) — capa e histórico pelo
 *    PDPJ, mais a heurística de prazo do ato. Assíncrona, mas termina em
 *    segundos; o andamento sai por etapa em `/api/jobs/{jobId}`.
 * 2. **A leitura** (`POST /api/ia/processos/{id}`) — os três níveis da
 *    pirâmide: os atos ainda não lidos, os prazos em aberto e a síntese do
 *    caso. Só ENFILEIRA; a fila `ia` é serial e drena a ~20 s por ato.
 *
 * **A segunda chamada é a correção de 08/09/2026.** Até 07/09 quem lia era o
 * próprio job da consulta (`result.leitura.enfileirados`), e naquele dia a
 * leitura saiu de lá e virou rota própria — `POST /ia/processos/{id}`, que
 * ninguém no front chamava. O botão continuou "funcionando": consultava o PDPJ,
 * lia `result.leitura` (que deixou de existir), achava zero e anunciava
 * **"nada novo para ler neste processo"** em processo nenhum lido. Medido em
 * 08/09/2026 no `5008313-42.2024.4.03.6000`: 137 movimentações, **0** com
 * resumo, e a aba de IA dizendo que a IA não tinha lido nada — o que era
 * verdade, e continuaria sendo a cada clique.
 *
 * A fase de leitura conta o que já foi lido (`/api/processos/{id}/leitura`) e o
 * denominador vem da resposta da rota de IA (`atos.enfileirados`). É sempre
 * fato consultado — não há barra de porcentagem aqui porque não há denominador
 * honesto antes de a etapa 1 responder.
 *
 * `router.refresh()` a cada ato lido: a página é Server Component, e é ele que
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

  /** Conta os resumos até chegar ao alvo (ou até o teto de espera). */
  const acompanharLeitura = useCallback(async (alvo: number) => {
    const ateQuando = Date.now() + LIMITE_LEITURA_MS;
    const partida = await contarLidas(processId);
    // O alvo é relativo ao que já estava lido: um processo relido tem resumo de
    // rodadas anteriores, e contá-los mostraria "12 de 3".
    const meta = partida + alvo;
    let ultima = partida;

    while (vivo.current && Date.now() < ateQuando) {
      setDetalhe(`${ultima - partida} de ${alvo} ${alvo === 1 ? 'ato lido' : 'atos lidos'}`);
      if (ultima >= meta) return;

      await sleep(INTERVALO_LEITURA_MS);
      if (!vivo.current) return;

      const agora = await contarLidas(processId);
      // Só recarrega quando há o que mostrar — um refresh por volta do poll
      // rebuscaria a página inteira para não mudar nada.
      if (agora > ultima) router.refresh();
      ultima = agora;
    }
  }, [processId, router]);

  /**
   * Pede a leitura por IA e devolve quantos ATOS foram para a fila.
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

      // A consulta trouxe o que havia; agora a IA lê. É esta chamada que faltava
      // — ver o cabeçalho.
      setDetalhe('pedindo a leitura à IA');
      const ia = await pedirLeitura();
      if (!vivo.current) return;

      const enfileirados = ia.atos?.enfileirados ?? 0;
      if (enfileirados > 0) {
        setFase('lendo');
        await acompanharLeitura(enfileirados);
      }

      if (!vivo.current) return;
      setFase('pronto');
      // Sem ATO novo para ler, ainda pode haver prazo e síntese na fila — e
      // dizer "nada novo" com o caso sendo escrito seria mentira na direção
      // ruim: a pessoa fecharia a aba antes de a análise aparecer.
      const naFila = (ia.analises?.prazosEnfileirados ?? 0) + (ia.analises?.casosEnfileirados ?? 0);
      setDetalhe(
        enfileirados > 0 ? null
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
        title="Consulta este processo nas fontes públicas e pede à IA que explique as movimentações"
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

/** Quantas movimentações deste processo já têm resumo da IA. */
async function contarLidas(processId: string): Promise<number> {
  const resposta = await fetch(`/api/processos/${encodeURIComponent(processId)}/leitura`, {
    cache: 'no-store',
  });
  if (!resposta.ok) throw new Error(`Não foi possível acompanhar a leitura (${resposta.status})`);
  const { lidas } = (await resposta.json()) as { lidas: number };
  return lidas;
}
