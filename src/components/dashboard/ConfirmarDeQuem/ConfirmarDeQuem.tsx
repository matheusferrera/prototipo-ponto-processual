'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, X } from 'lucide-react';
import styles from './ConfirmarDeQuem.module.css';

export function ConfirmarDeQuem({ prazoId }: { prazoId: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  async function confirmar(deQuem: 'destinatario' | 'parteContraria') {
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch(`/api/prazos/${encodeURIComponent(prazoId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deQuem }),
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => ({}));
        throw new Error(dados?.error ?? 'Não foi possível salvar.');
      }
      dialog.current?.close();
      iniciar(() => router.refresh());
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <button type="button" className={styles.gatilho} onClick={() => dialog.current?.showModal()}>
        Responder
      </button>
      <dialog
        ref={dialog}
        className={styles.folha}
        aria-labelledby={`confirmar-${prazoId}`}
        onClick={evento => {
          const caixa = evento.currentTarget.getBoundingClientRect();
          const fora = evento.clientX < caixa.left || evento.clientX > caixa.right
            || evento.clientY < caixa.top || evento.clientY > caixa.bottom;
          if (fora) evento.currentTarget.close();
        }}
      >
            <div className={styles.cabecalho}>
              <h2 id={`confirmar-${prazoId}`}>De quem é este prazo?</h2>
              <button type="button" className={styles.fechar} aria-label="Fechar" onClick={() => dialog.current?.close()}>
                <X aria-hidden="true" />
              </button>
            </div>
            <p className={styles.explicacao}>Sua resposta decide se este prazo entra nos avisos do WhatsApp.</p>
            <div className={styles.opcoes}>
              <button type="button" disabled={salvando} onClick={() => void confirmar('destinatario')}>
                <strong>É meu prazo</strong>
                <span>Ele continua na pauta e passa a gerar avisos.</span>
              </button>
              <button type="button" disabled={salvando} onClick={() => void confirmar('parteContraria')}>
                <strong>É da outra parte</strong>
                <span>Sai da pilha de ação. Dá para corrigir depois.</span>
              </button>
            </div>
            {salvando && <p className={styles.estado}><LoaderCircle aria-hidden="true" /> Salvando resposta…</p>}
            {erro && <p className={styles.erro} role="alert">{erro}</p>}
      </dialog>
    </>
  );
}
