'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Sparkles } from 'lucide-react';
import type { CategoriaMovimentacao, LeituraIa, OrigemMovimentacao } from '@/types';
import type { MovimentacaoDetail } from '@/lib/api.server';
import { Button } from '@/components/ui/button';
import { podeLerComIa } from '@/lib/leitura-do-ato';
import { LeituraIaDoAto } from './LeituraIaDoAto';
import styles from './LeituraDoAto.module.css';

/**
 * A leitura do ato **com o botão que a pede** — dentro do collapse da
 * movimentação.
 *
 * Até 10/09/2026 a leitura de um ato só acontecia por tabela: a ronda do dia
 * lia o que tinha saído naquele dia, e "Analisar processo" lia o processo
 * inteiro. Quem abria UMA linha da timeline e via o rótulo cru do cartório não
 * tinha como pedir a leitura daquela linha — apesar de a rota existir desde
 * 07/09 (`POST /ia/movimentacoes/{id}`) e de ser a análise mais barata das
 * quatro: um ato, uma chamada.
 *
 * **Três respostas, e as três são estado de tela, não erro:**
 *
 * | resposta | o que significa | o que a tela faz |
 * |---|---|---|
 * | 200 | já lido (cache do backend) | mostra a leitura na hora |
 * | 202 | enfileirado | acompanha até o resumo aparecer |
 * | 409 `ATO_NAO_LEGIVEL` | não há texto para ler | explica, em vez de girar |
 *
 * **O 202 não traz `jobId`** — diferente de `/ia/prazos/{id}` e de
 * `/ia/processos/{id}` —, então não há job para acompanhar: quem responde é a
 * própria movimentação. Daí o poll em `/api/movimentacoes/{id}/leitura`, que
 * devolve só o bloco `ia` (o detalhe inteiro carrega o ato, 3,8 KB de média e
 * 288 KB no maior — puxá-lo a cada volta seria pagar o ato inteiro para ler
 * seis campos).
 *
 * **O botão não aparece onde a IA não lê**, e isso é medido, não palpite: o
 * backend só aceita origem pública e recusa `publicacao`/`tramite`, que são a
 * maior parte do acervo. Oferecer o botão ali seria prometer leitura e devolver
 * 409 — o mesmo defeito que a rota órfã de 07/09 produziu, em que um 404 do
 * Express virava "a IA não leu nada" na tela.
 */

/** Um ato leva ~20 s no teto da Moonshot (`KIMI_RPM` 3, concorrência 1, fila global). */
const INTERVALO_POLL_MS = 5_000;

/**
 * Teto de espera. A fila `ia` é GLOBAL e serial: um ato pedido enquanto a ronda
 * do dia drena espera a vez dela. Passado o teto a leitura continua — o que
 * para é o poll, para uma aba esquecida não bater no servidor por horas.
 */
const LIMITE_ESPERA_MS = 5 * 60_000;

type Fase = 'ocioso' | 'pedindo' | 'lendo';

/** O corpo de `POST /ia/movimentacoes/{id}` — 200 e 202 têm formas diferentes. */
type AnaliseDoAto = {
  analisadoEm?: string | null;
  resumoIa?: string | null;
  fundamentoIa?: string | null;
  confiancaIa?: string | null;
  deQuemIa?: LeituraIa['deQuem'];
  oQueFazer?: string | null;
  peca?: string | null;
  checklist?: string[] | null;
  documentosNecessarios?: string[] | null;
  risco?: LeituraIa['risco'];
  complexidade?: LeituraIa['complexidade'];
  precisaDosAutos?: boolean | null;
  observacao?: string | null;
};
type RespostaLeitura = AnaliseDoAto & {
  /** 202: quantos jobs foram para a fila, e a análise ANTERIOR, se havia. */
  enfileirados?: number;
  analise?: AnaliseDoAto | null;
  error?: string;
  code?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** `AnaliseDoAto` (os nomes da API) → `LeituraIa` (os nomes da tela). */
function paraLeitura(a: AnaliseDoAto | null | undefined): LeituraIa | null {
  if (!a) return null;
  return {
    resumo: a.resumoIa?.trim() || null,
    fundamento: a.fundamentoIa?.trim() || null,
    confianca: a.confiancaIa?.trim() || null,
    deQuem: a.deQuemIa ?? null,
    analisadoEm: a.analisadoEm ?? null,
    oQueFazer: a.oQueFazer?.trim() || null,
    peca: a.peca?.trim() || null,
    checklist: a.checklist?.filter(Boolean) ?? [],
    documentosNecessarios: a.documentosNecessarios?.filter(Boolean) ?? [],
    risco: a.risco ?? null,
    complexidade: a.complexidade ?? null,
    precisaDosAutos: a.precisaDosAutos === true,
    observacao: a.observacao?.trim() || null,
  };
}

export function LeituraDoAto({
  mov,
}: {
  /**
   * `origem`/`categoria` soltos do `Pick`, e não herdados de
   * `MovimentacaoDetail`: `AtoDoPrazo` (o ato embutido em `/deadlines`, usado
   * por `PrazoRow`) os declara opcionais — backend anterior a `<data>` não os
   * mandava ali —, e `Pick` exigiria a mesma obrigatoriedade de
   * `MovimentacaoDetail`. `podeLerComIa` já trata ausência como "passa".
   */
  mov: Pick<MovimentacaoDetail, 'id' | 'ia'> & {
    origem?: OrigemMovimentacao | null;
    categoria?: CategoriaMovimentacao | null;
  };
}) {
  const router = useRouter();
  const [ia, setIa] = useState<LeituraIa>(mov.ia);
  const [fase, setFase] = useState<Fase>('ocioso');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  /* Fechar o collapse desmonta este componente no meio do poll — sem isto ele
     seguiria chamando `setState` num componente que já saiu da tela. */
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  const lida = Boolean(ia.analisadoEm || ia.resumo);
  const legivel = podeLerComIa(mov);

  /**
   * Espera o resumo aparecer na própria movimentação.
   *
   * O alvo é MUDAR `analisadoEm`, não "ter" `analisadoEm`: na releitura o campo
   * já vinha preenchido, e esperar por presença terminaria no primeiro poll com
   * a leitura antiga na tela.
   */
  async function acompanhar(partida: string | null): Promise<boolean> {
    const ateQuando = Date.now() + LIMITE_ESPERA_MS;

    while (vivo.current && Date.now() < ateQuando) {
      await sleep(INTERVALO_POLL_MS);
      if (!vivo.current) return true;

      const r = await fetch(`/api/movimentacoes/${encodeURIComponent(mov.id)}/leitura`, { cache: 'no-store' });
      if (!r.ok) continue;
      const { ia: nova } = (await r.json()) as { ia: LeituraIa };

      if (nova?.analisadoEm && nova.analisadoEm !== partida) {
        if (!vivo.current) return true;
        setIa(nova);
        // A linha ACIMA do collapse mostra o resumo como título (ver
        // `resumoMovimentacao`), e ela é renderizada no servidor: sem o
        // refresh, o painel mostraria a leitura e o título continuaria sendo o
        // rótulo do cartório.
        router.refresh();
        return true;
      }
    }
    // Estourou o teto. Continua não sendo erro — a leitura pode estar viva na
    // fila —, mas o `false` importa: quem chama TEM de dizer isso na tela.
    // Enquanto isto era `void`, desistir era indistinguível de nada ter
    // acontecido: o spinner sumia, o botão voltava a "Ler de novo" e nenhuma
    // palavra explicava os cinco minutos. Foi assim que o dedupe de `jobId` em
    // `OPCOES_ANALISE` (o `add` engolido enquanto o job concluído seguia no
    // Redis) passou por "a tela fica carregando para sempre" em vez de por
    // "pedi e não entrou na fila".
    return false;
  }

  async function pedir(forcar: boolean) {
    setErro(null);
    setAviso(null);
    setFase('pedindo');
    const partida = ia.analisadoEm;

    try {
      const url = `/api/ia/movimentacoes/${encodeURIComponent(mov.id)}${forcar ? '?forcar=true' : ''}`;
      const res = await fetch(url, { method: 'POST', cache: 'no-store' });
      const corpo = (await res.json()) as RespostaLeitura;

      if (res.status === 200) {
        // Já estava lido e ninguém pediu releitura: o backend devolve o que
        // está gravado, e isso é resposta, não cache frio.
        const nova = paraLeitura(corpo);
        if (nova && vivo.current) { setIa(nova); router.refresh(); }
        if (vivo.current) setFase('ocioso');
        return;
      }

      if (res.status === 202) {
        // A análise ANTERIOR vem junto para a tela não piscar vazia enquanto a
        // nova é escrita.
        const anterior = paraLeitura(corpo.analise);
        if (anterior && vivo.current) setIa(anterior);
        if (vivo.current) setFase('lendo');
        const chegou = await acompanhar(partida);
        if (vivo.current) {
          setFase('ocioso');
          if (!chegou) {
            setAviso('A leitura não voltou em 5 minutos. Ela pode ainda estar na fila da IA — recarregue a página em instantes. Se continuar assim, a fila não recebeu o pedido.');
          }
        }
        return;
      }

      if (res.status === 409) {
        // Não é falha: o ato não tem o que ler — sem texto, ou de categoria que
        // só devolveria o rótulo de volta.
        if (vivo.current) {
          setFase('ocioso');
          setAviso('Este ato não tem texto para a IA ler.');
        }
        return;
      }

      throw new Error(
        res.status === 503
          ? 'A análise por IA está desligada nesta instalação.'
          : corpo.error ?? `Não foi possível pedir a leitura (${res.status})`,
      );
    } catch (falha) {
      console.error('Não foi possível pedir a leitura do ato.', falha);
      if (!vivo.current) return;
      setFase('ocioso');
      setErro(falha instanceof Error ? falha.message : 'Não foi possível pedir a leitura do ato.');
    }
  }

  // Sem leitura e sem como pedir, o bloco não existe — nunca uma caixa vazia
  // dizendo que não há leitura (a regra de `LeituraIaDoAto`, mantida aqui).
  if (!lida && !legivel) return null;

  const ocupado = fase !== 'ocioso';
  const rotulo = fase === 'lendo' ? 'Lendo o ato…'
    : fase === 'pedindo' ? 'Pedindo…'
    : lida ? 'Ler de novo'
    : 'Ler este ato com IA';

  return (
    <div className={styles.bloco}>
      <LeituraIaDoAto mov={{ ia }} />

      <div className={styles.pedido}>
        {erro && <span className={styles.erro} role="alert">{erro}</span>}
        {!erro && aviso && <span className={styles.aviso} role="status">{aviso}</span>}
        {fase === 'lendo' && (
          // `polite`: é acompanhamento, não alerta — não deve interromper quem
          // estiver percorrendo a timeline com leitor de tela.
          <span className={styles.andamento} aria-live="polite">
            na fila da IA — o resumo aparece aqui
          </span>
        )}

        {legivel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={styles.botao}
            disabled={ocupado}
            aria-busy={ocupado}
            title={lida
              ? 'Relê este ato com a IA — útil quando o inteiro teor chegou depois da primeira leitura'
              : 'Pede à IA que leia este ato: o que aconteceu, o que fazer e de quem é o prazo'}
            onClick={() => void pedir(lida)}
          >
            {ocupado
              ? <LoaderCircle aria-hidden="true" size={14} className={styles.spinner} />
              : <Sparkles aria-hidden="true" size={14} />}
            {rotulo}
          </Button>
        )}
      </div>
    </div>
  );
}
