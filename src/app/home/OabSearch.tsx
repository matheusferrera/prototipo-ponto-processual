'use client';

import { useId, useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, AlertTriangle } from 'lucide-react';
import { slugOab } from '@/lib/previa';
import styles from './OabSearch.module.css';

/**
 * Busca por OAB do hero — o único CTA acima da dobra.
 *
 * Não resolve o resultado aqui: navega para `/oab/<numero>-<uf>`, uma página
 * dedicada que consulta o DJEN no servidor e conta a história dos processos
 * daquela OAB. Isso dá URL ao resultado (sobrevive ao F5, é compartilhável) e
 * tira o visitante da landing, que competia por atenção com o próprio dado.
 *
 * A validação continua aqui para o erro de campo aparecer no lugar onde ele
 * foi cometido, em vez de virar uma navegação para uma página de erro.
 */
export function OabSearch() {
  const router = useRouter();
  const [navegando, iniciarNavegacao] = useTransition();
  const [numero, setNumero] = useState('');
  const [uf, setUf] = useState('');
  const [erro, setErro] = useState('');
  const numeroRef = useRef<HTMLInputElement>(null);
  const ufRef = useRef<HTMLInputElement>(null);
  /* A busca aparece duas vezes na landing (hero e CTA final): id fixo
     duplicaria o atributo e faria o <label> do rodapé focar o campo do topo. */
  const uid = useId();
  const idNumero = `oab-numero-${uid}`;
  const idUf = `oab-uf-${uid}`;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (navegando) return;

    /* O botão nunca fica desabilitado: sobre o fundo verde do hero um CTA
       apagado lê como indisponível, e é o único pedido acima da dobra. Campo
       faltando vira foco + aviso, não um botão morto. */
    if (!numero.trim()) {
      setErro('Informe o número da sua OAB.');
      numeroRef.current?.focus();
      return;
    }
    if (uf.trim().length !== 2) {
      setErro('Informe a UF da sua OAB (duas letras).');
      ufRef.current?.focus();
      return;
    }

    setErro('');
    /* Dentro da transição, `navegando` cobre a espera do Server Component —
       o botão mostra progresso até a página de resultado assumir. */
    iniciarNavegacao(() => router.push(`/oab/${slugOab(numero, uf)}`));
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={idNumero}>
            Nº da OAB
          </label>
          <input
            id={idNumero}
            ref={numeroRef}
            className={styles.input}
            value={numero}
            onChange={e => setNumero(e.target.value.replace(/\D/g, ''))}
            placeholder="12345"
            inputMode="numeric"
            maxLength={8}
            autoComplete="off"
          />
        </div>
        <div className={`${styles.field} ${styles.fieldUf}`}>
          <label className={styles.label} htmlFor={idUf}>
            UF
          </label>
          <input
            id={idUf}
            ref={ufRef}
            className={styles.input}
            value={uf}
            onChange={e => setUf(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
            placeholder="SP"
            maxLength={2}
            autoComplete="off"
          />
        </div>
        <button type="submit" className={styles.submit} disabled={navegando}>
          {navegando ? (
            <>
              <Loader2 size={14} className={styles.spin} /> CONSULTANDO…
            </>
          ) : (
            <>
              <Search size={14} /> VER MEUS PROCESSOS
            </>
          )}
        </button>
      </form>

      {erro ? (
        <p className={styles.erro} role="alert">
          <AlertTriangle size={14} /> {erro}
        </p>
      ) : (
        <p className={styles.micro}>
          Consulta em base pública. Não pedimos senha de tribunal nem cartão.
        </p>
      )}
    </div>
  );
}
