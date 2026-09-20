'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LoaderCircle } from 'lucide-react';
import styles from './MarcarVistas.module.css';

/**
 * "Marcar vistas" — carimba a marca d'água da conta com o instante do servidor.
 *
 * **Leva a marca ANTERIOR na URL** (`?voltar=`), e é o que torna o "Desfazer"
 * possível sem estado de cliente: a tela vazia que aparece depois do clique é
 * um Server Component, e ela só sabe para onde voltar porque o endereço diz.
 * `nunca` é a conta que ainda não tinha marcado nada.
 */
export function MarcarVistas({
  vistasAte,
  destino = '/movimentacoes?vista=novas',
}: {
  vistasAte: string | null;
  /** Para reutilizar o verbo fora da aba Novas sem tirar a pessoa da tela. */
  destino?: string;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  async function marcar() {
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch('/api/movimentacoes/vistas', { method: 'POST' });
      if (!res.ok) throw new Error();
      const separador = destino.includes('?') ? '&' : '?';
      const voltar = encodeURIComponent(vistasAte ?? 'nunca');
      iniciar(() => router.replace(`${destino}${separador}voltar=${voltar}`, { scroll: false }));
    } catch {
      setErro('Não foi possível marcar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      {erro && <span className={styles.erro} role="alert">{erro}</span>}
      <button type="button" className={styles.botao} disabled={salvando} onClick={() => void marcar()}>
        {salvando
          ? <LoaderCircle size={18} aria-hidden="true" className={styles.girando} />
          : <Check size={18} aria-hidden="true" />}
        Marcar vistas
      </button>
    </>
  );
}

/**
 * "Desfazer" — devolve a marca ao que era antes do clique.
 *
 * O backend só aceita voltar para TRÁS (ou para "nunca marcou"): andar para
 * trás só devolve linhas à lista de novas, e não há como esconder por aqui
 * nada que ainda vai chegar.
 */
export function DesfazerVistas({ voltarPara }: { voltarPara: string | null }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  async function desfazer() {
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch('/api/movimentacoes/vistas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voltarPara }),
      });
      if (!res.ok) throw new Error();
      iniciar(() => router.replace('/movimentacoes?vista=novas', { scroll: false }));
    } catch {
      setErro('Não foi possível desfazer.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      {erro && <span className={styles.erro} role="alert">{erro}</span>}
      <button type="button" className={styles.botao} disabled={salvando} onClick={() => void desfazer()}>
        {salvando && <LoaderCircle size={18} aria-hidden="true" className={styles.girando} />}
        Desfazer
      </button>
    </>
  );
}
