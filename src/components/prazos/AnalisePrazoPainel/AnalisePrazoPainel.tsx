'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import type { AnalisePrazo, RiscoPrazo } from '@/types';
import { Button } from '@/components/ui/button';
import { dataWallClock } from '@/lib/wall-clock';
import styles from './AnalisePrazoPainel.module.css';

/**
 * "O que eu produzo até lá?" — a leitura do PRAZO pela IA, ao lado da leitura
 * do ato: peça a produzir, checklist, o que falta obter, e o risco de perder.
 *
 * Ela nunca redecide data, dias ou de quem — isso já foi resolvido sobre o
 * ato, com o calendário forense (ver `qualificacaoPrazo`/`procedenciaPrazo`).
 * Quando discorda, fala em `observacao`, que aparece aqui como divergência —
 * não muda nada sozinha.
 *
 * O backend cacheia por hash do conteúdo enviado: boa parte dos prazos com
 * vencimento em até 10 dias já chega com `analiseInicial` preenchida (o
 * pré-aquecimento da ronda do dia), e este componente só pede quando falta.
 */

const RISCO_ROTULO: Record<RiscoPrazo, string> = {
  preclusao: 'perde o prazo processual',
  perdaDeDireito: 'perde o direito material',
  revelia: 'revelia',
  multa: 'multa',
  nenhum: 'sem risco direto',
};

const COMPLEXIDADE_ROTULO: Record<'baixa' | 'media' | 'alta', string> = {
  baixa: 'complexidade baixa',
  media: 'complexidade média',
  alta: 'complexidade alta',
};

const CONFIANCA_ROTULO: Record<'alta' | 'media' | 'baixa', string> = {
  alta: 'confiança alta',
  media: 'confiança média',
  baixa: 'confiança baixa',
};

/** Primeiro intervalo do poll — o job costuma ser rápido de ENFILEIRAR; é a análise em si que demora. */
const INTERVALO_POLL_MS = 4_000;
/** Teto de espera nesta linha. Passado isso, a análise segue rodando; o botão some e o resultado chega na próxima vez que a pauta recarregar. */
const LIMITE_ESPERA_MS = 90_000;

type Fase = 'ocioso' | 'pedindo' | 'aguardando' | 'erro';

type RespostaJob = { status?: string; failReason?: string };
type RespostaAnalisePedida = { jobId?: string; analise?: AnalisePrazo | null; error?: string; code?: string };

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function AnalisePrazoPainel({
  prazoId,
  analiseInicial,
  podeAnalisar,
}: {
  prazoId: string;
  analiseInicial: AnalisePrazo | null;
  /** `false` quando o prazo está fechado ou não tem ato gravado — não há o que pedir. */
  podeAnalisar: boolean;
}) {
  const [analise, setAnalise] = useState(analiseInicial);
  const [fase, setFase] = useState<Fase>('ocioso');
  const [erro, setErro] = useState<string | null>(null);

  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  async function aguardarJob(jobId: string) {
    const ateQuando = Date.now() + LIMITE_ESPERA_MS;
    while (vivo.current && Date.now() < ateQuando) {
      await sleep(INTERVALO_POLL_MS);
      if (!vivo.current) return;

      const r = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' });
      if (!r.ok) continue;
      const job = (await r.json()) as RespostaJob;

      if (job.status === 'failed') throw new Error(job.failReason ?? 'A análise falhou no servidor.');
      if (job.status === 'completed') {
        // Relê pela própria rota: cache hit garante o formato de `AnaliseView`,
        // em vez de depender do formato bruto que o job devolveu.
        const r2 = await fetch(`/api/prazos/${encodeURIComponent(prazoId)}/analise`, { method: 'POST', cache: 'no-store' });
        if (r2.ok && vivo.current) setAnalise((await r2.json()) as AnalisePrazo);
        return;
      }
    }
    // Não é erro: segue na fila global de IA. Quem recarregar a pauta depois vê o resultado.
  }

  async function pedir() {
    setErro(null);
    setFase('pedindo');
    try {
      const res = await fetch(`/api/prazos/${encodeURIComponent(prazoId)}/analise`, { method: 'POST', cache: 'no-store' });

      if (res.status === 200) {
        if (vivo.current) { setAnalise((await res.json()) as AnalisePrazo); setFase('ocioso'); }
        return;
      }
      if (res.status === 202) {
        const corpo = (await res.json()) as RespostaAnalisePedida;
        if (corpo.analise && vivo.current) setAnalise(corpo.analise);
        if (vivo.current) setFase('aguardando');
        if (corpo.jobId) await aguardarJob(corpo.jobId);
        if (vivo.current) setFase('ocioso');
        return;
      }
      const corpo = (await res.json()) as RespostaAnalisePedida;
      throw new Error(
        corpo.code === 'SEM_ATO_PARA_LER'
          ? 'Este prazo não tem ato com texto para ler.'
          : corpo.error ?? `Não foi possível pedir a análise (${res.status})`,
      );
    } catch (falha) {
      if (!vivo.current) return;
      setFase('erro');
      setErro(falha instanceof Error ? falha.message : 'Não foi possível pedir a análise.');
    }
  }

  if (!analise && !podeAnalisar) return null;

  if (!analise) {
    const ocupado = fase === 'pedindo' || fase === 'aguardando';
    return (
      <div className={styles.pedido}>
        {erro && <span className={styles.erro} role="alert">{erro}</span>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={styles.botao}
          disabled={ocupado}
          aria-busy={ocupado}
          onClick={pedir}
        >
          {ocupado
            ? <LoaderCircle aria-hidden="true" size={14} className={styles.spinner} />
            : <Sparkles aria-hidden="true" size={14} />}
          {fase === 'aguardando' ? 'Lendo o ato…' : fase === 'pedindo' ? 'Pedindo…' : 'Analisar prazo com IA'}
        </Button>
      </div>
    );
  }

  const r = analise.resultado;
  const carimbo = [
    CONFIANCA_ROTULO[r.confianca],
    COMPLEXIDADE_ROTULO[r.complexidade],
    `atualizado em ${dataWallClock(new Date(analise.atualizadaEm))}`,
  ];

  return (
    <section className={styles.painel} aria-label="Análise do prazo pela IA">
      <div className={styles.cabecalho}>
        <span className={styles.rotulo}>
          <Sparkles size={13} aria-hidden="true" />
          Análise do prazo
        </span>
        <span className={styles.risco} data-risco={r.risco}>{RISCO_ROTULO[r.risco]}</span>
      </div>

      {r.peca && <p className={styles.peca}>{r.peca}</p>}
      <p className={styles.oQueFazer}>{r.oQueFazer}</p>

      {r.checklist.length > 0 && (
        <ul className={styles.checklist}>
          {r.checklist.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}

      {r.documentosNecessarios.length > 0 && (
        <div className={styles.documentos}>
          <span className={styles.documentosRotulo}>Falta obter</span>
          <ul className={styles.documentosLista}>
            {r.documentosNecessarios.map((doc, i) => <li key={i}>{doc}</li>)}
          </ul>
        </div>
      )}

      {r.precisaDosAutos && <p className={styles.autos}>É preciso abrir o processo para redigir esta peça.</p>}
      {r.observacao && <p className={styles.observacao}>Divergência com o que foi informado: {r.observacao}</p>}

      <p className={styles.carimbo}>{carimbo.join(' · ')}</p>
    </section>
  );
}
