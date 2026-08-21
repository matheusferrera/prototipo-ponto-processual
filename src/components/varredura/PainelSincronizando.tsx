'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { formatarOab, type UsuarioAtual } from '@/lib/usuario';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import type { ScraperSecretView } from '@/lib/credenciais';
import { ScannerTribunais } from './ScannerTribunais';
import { DicasVarredura } from './DicasVarredura';
import styles from './Varredura.module.css';

/** Quantos processos a espera mostra. O resto é assunto do dashboard. */
const AMOSTRA = 6;

/** Primeiro intervalo entre consultas. Os primeiros processos costumam cair
 *  nos segundos iniciais, então vale ser impaciente no começo. */
const INTERVALO_INICIAL_MS = 2500;
/** Teto do intervalo: passados alguns minutos, insistir a cada 2s só queima
 *  requisição — o job do DJEN não fica mais rápido por ser observado. */
const INTERVALO_MAX_MS = 12_000;
const FATOR_BACKOFF = 1.25;

/** Depois disto paramos de consultar sozinhos e devolvemos o controle. Uma
 *  aba esquecida aberta a noite inteira não deve ficar batendo no backend. */
const LIMITE_MS = 10 * 60_000;

type ProcessoAchado = {
  id: string;
  numero: string;
  tribunal: string;
  parte: string | null;
};

type RespostaProcessos = {
  data?: {
    id: string;
    numero: string;
    tribunal: string;
    poloAtivo?: { nome?: string | null }[] | null;
    assunto?: string | null;
    classeJudicial?: string | null;
  }[];
  total?: number;
};

/**
 * Causa 2 do painel vazio: a OAB está cadastrada e a primeira varredura ainda
 * não terminou.
 *
 * Esta tela era um Server Component — um card parado, com um spinner que não
 * sabia de nada, até a pessoa pensar em apertar F5. Como a primeira varredura
 * leva **minutos** (job do DJEN + consulta pública, enfileirados em
 * `POST /scraper/monitorar-oab`), o resultado prático era um advogado olhando
 * uma tela morta e concluindo que o produto não funcionou.
 *
 * Agora ela consulta o backend enquanto espera e vai **revelando os processos
 * conforme chegam**: aos trinta segundos já há linha na tela, e a espera deixa
 * de ser espera para virar a carteira se enchendo. O que é mostrado é sempre
 * fato consultado (`GET /processes`), nunca progresso simulado — não existe
 * barra de porcentagem aqui porque não existe denominador honesto.
 *
 * O fim da varredura é o mesmo sinal que o servidor usa para escolher entre os
 * três vazios (`lastSuccessAt` no `ScraperSecret`). Quando ele aparece, um
 * `router.refresh()` entrega a tela ao dashboard de verdade.
 */
export function PainelSincronizando({ oab }: { oab: NonNullable<UsuarioAtual['oab']> }) {
  const router = useRouter();

  const [achados, setAchados] = useState<ProcessoAchado[]>([]);
  const [total, setTotal] = useState(0);
  const [desistiu, setDesistiu] = useState(false);

  /* Ids já renderizados. Só o que é novo ganha a animação de entrada — sem
     isto a lista inteira repica a cada consulta e o efeito vira ruído. */
  const jaVistos = useRef(new Set<string>());
  const [recemChegados, setRecemChegados] = useState<Set<string>>(new Set());

  /* O ciclo vive em refs porque o intervalo muda a cada volta e um efeito que
     dependesse dele se remontaria sozinho a cada troca. */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Marcado na montagem do efeito, não aqui: `Date.now()` no corpo do
     componente é impuro e o React reclama, com razão. */
  const inicio = useRef(0);
  const vivo = useRef(true);

  const consultar = useCallback(async (): Promise<'seguir' | 'parar'> => {
    const [resProcessos, resSecrets] = await Promise.all([
      fetch(`/api/processes?page=1&limit=${AMOSTRA}`, { cache: 'no-store' }),
      fetch('/api/secrets', { cache: 'no-store' }),
    ]);

    if (resProcessos.ok) {
      const body = (await resProcessos.json()) as RespostaProcessos;
      const lista = (body.data ?? []).map<ProcessoAchado>(p => ({
        id: p.id,
        numero: p.numero,
        tribunal: p.tribunal,
        parte: p.poloAtivo?.[0]?.nome ?? p.assunto ?? p.classeJudicial ?? null,
      }));

      const novos = lista.filter(p => !jaVistos.current.has(p.id)).map(p => p.id);
      for (const id of novos) jaVistos.current.add(id);

      setAchados(lista);
      setTotal(body.total ?? lista.length);
      if (novos.length > 0) setRecemChegados(new Set(novos));
    }

    /* O mesmo critério do servidor (`jaVarreu` em `painel/page.tsx`): a
       varredura acabou quando algum secret registrou sucesso. */
    if (resSecrets.ok) {
      const secrets = (await resSecrets.json()) as ScraperSecretView[];
      if (Array.isArray(secrets) && secrets.some(s => s.lastSuccessAt)) return 'parar';
    }

    return 'seguir';
  }, []);

  useEffect(() => {
    vivo.current = true;
    inicio.current = Date.now();
    let intervalo = INTERVALO_INICIAL_MS;

    const agendar = (ms: number) => {
      timer.current = setTimeout(volta, ms);
    };

    async function volta() {
      if (!vivo.current) return;

      /* Aba escondida não consulta. O trabalho continua no servidor de
         qualquer jeito, e quem está em outra aba não está esperando. */
      if (typeof document !== 'undefined' && document.hidden) {
        agendar(2000);
        return;
      }

      if (Date.now() - inicio.current > LIMITE_MS) {
        setDesistiu(true);
        return;
      }

      let resultado: 'seguir' | 'parar' = 'seguir';
      try {
        resultado = await consultar();
      } catch {
        /* Rede oscilando não é motivo para matar a espera: o backoff já
           afrouxa o ritmo sozinho e a próxima volta tenta de novo. */
      }

      if (!vivo.current) return;

      if (resultado === 'parar') {
        /* Acabou. Quem decide o que mostrar agora é o servidor — pode ser o
           dashboard cheio ou o "nada publicado", e ele já sabe escolher. */
        router.refresh();
        return;
      }

      intervalo = Math.min(intervalo * FATOR_BACKOFF, INTERVALO_MAX_MS);
      agendar(intervalo);
    }

    agendar(INTERVALO_INICIAL_MS);

    return () => {
      vivo.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [consultar, router]);

  /* Só as siglas realmente encontradas acendem no scanner. */
  const siglasAchadas = [...new Set(achados.map(p => p.tribunal))];
  const achou = total > 0;

  return (
    <div className={styles.wrapper}>
      <ScannerTribunais achados={siglasAchadas} />

      <div className={styles.titulo}>
        {achou ? 'Montando sua carteira' : 'Procurando seus processos'}
      </div>

      <p className={styles.desc}>
        Estamos varrendo os diários oficiais atrás de publicações da OAB{' '}
        <strong>{formatarOab(oab)}</strong>. A primeira varredura leva alguns minutos —
        pode fechar a página, o trabalho continua.
      </p>

      <p className={styles.estado} role="status">
        {desistiu ? (
          'A varredura passou de dez minutos. Ela continua rodando no servidor — recarregue a página para ver o que já chegou.'
        ) : achou ? (
          <>
            <span className={styles.estadoForte}>
              {total} processo{total === 1 ? '' : 's'}
            </span>{' '}
            em {siglasAchadas.length} tribuna{siglasAchadas.length === 1 ? 'l' : 'is'} até agora
            <span className={styles.reticencias} aria-hidden="true" />
          </>
        ) : (
          <>
            Varrendo os tribunais
            <span className={styles.reticencias} aria-hidden="true" />
          </>
        )}
      </p>

      {achados.length > 0 && (
        <div className={styles.achados}>
          <div className={styles.achadosHead}>
            <span className={styles.achadosTitulo}>Já encontramos</span>
            <span className={styles.achadosContagem}>{total}</span>
          </div>
          {achados.map(p => (
            <div
              key={p.id}
              className={`${styles.achadoRow}${recemChegados.has(p.id) ? ` ${styles.achadoNovo}` : ''}`}
            >
              <span className={styles.achadoCnj}>{p.numero}</span>
              <span className={styles.achadoParte}>{p.parte ?? '—'}</span>
              <TribTag label={p.tribunal} />
            </div>
          ))}
          {total > achados.length && (
            <div className={styles.achadosRodape}>
              e mais {total - achados.length} — o dashboard mostra a carteira inteira.
            </div>
          )}
        </div>
      )}

      <DicasVarredura />

      <div className={styles.acoes}>
        {achou && (
          <button type="button" className={styles.botaoPrimario} onClick={() => router.refresh()}>
            Abrir o dashboard →
          </button>
        )}
        <Link
          href="/credenciais"
          className={achou ? styles.botaoSecundario : styles.botaoPrimario}
        >
          <KeyRound size={14} /> Conectar o login de um tribunal
        </Link>
      </div>
    </div>
  );
}
