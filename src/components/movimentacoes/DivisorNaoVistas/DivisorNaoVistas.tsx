'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LoaderCircle } from 'lucide-react';
import styles from './DivisorNaoVistas.module.css';

/**
 * "12 novas desde sua última visita" — o divisor que faltava no feed.
 *
 * ## Por que ele é a mudança mais importante desta tela
 *
 * O acervo medido tem **18.485 movimentações** numa conta só. A 50 por página,
 * são 370 páginas — e até 15/09/2026 não existia marcação de lido em lugar
 * nenhum do produto. Quem abriu o feed ontem não tinha como saber onde parou;
 * a única forma de achar a novidade era reconhecer as linhas do topo.
 *
 * ## Por que uma marca d'água e não estado por linha
 *
 * `User.movimentacoesVistasAte` é uma data. A pergunta que a tela responde é
 * "o que chegou desde a última vez que olhei", e uma data a responde com uma
 * comparação — contra 18 mil escritas para marcar cada linha.
 *
 * O que se perde é marcar UMA linha deixando as outras. Não é o que a tela
 * precisa: ninguém percorre uma pauta marcando item a item.
 *
 * ## O carimbo é do servidor
 *
 * O botão não manda data. Deixar o cliente escolher permitiria marcar como
 * visto algo que ainda vai chegar, e um relógio de navegador adiantado faria
 * isso sozinho.
 */
export function DivisorNaoVistas({
  naoVistas,
  vistasAte,
}: {
  naoVistas: number;
  /** ISO, ou `null` em conta que nunca marcou nada. */
  vistasAte: string | null;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciarRefresh] = useTransition();

  /* Nada novo, nada a dizer. Um divisor "0 novas" seria ruído permanente no
     topo de uma tela que já é densa. */
  if (naoVistas <= 0) return null;

  async function marcar() {
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch('/api/movimentacoes/vistas', { method: 'POST' });
      if (!res.ok) throw new Error();
      iniciarRefresh(() => router.refresh());
    } catch {
      setErro('Não foi possível marcar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={styles.raiz}>
      <span className={styles.marca} aria-hidden="true" />
      <span className={styles.texto}>
        {naoVistas === 1 ? '1 nova' : `${naoVistas} novas`}
        {/* A referência importa: "12 novas" sem "desde quando" não é número,
            é adjetivo. Conta que nunca marcou não tem referência — e aí a
            frase diz isso, em vez de inventar uma data. */}
        {vistasAte ? ` desde ${desde(vistasAte)}` : ' — você ainda não marcou nada como visto'}
      </span>
      {erro && <span className={styles.erro} role="alert">{erro}</span>}
      <button type="button" className={styles.botao} disabled={salvando} onClick={() => void marcar()}>
        {salvando
          ? <LoaderCircle size={13} aria-hidden="true" className={styles.girando} />
          : <Check size={13} aria-hidden="true" />}
        Marcar tudo como visto
      </button>
    </div>
  );
}

/** "ontem, 18:40" · "12/09, 09:12" — a referência, curta. */
function desde(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'a última visita';

  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dia = new Date(d); dia.setHours(0, 0, 0, 0);
  const dias = Math.round((hoje.getTime() - dia.getTime()) / 86_400_000);

  if (dias === 0) return `hoje, ${hora}`;
  if (dias === 1) return `ontem, ${hora}`;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}, ${hora}`;
}
