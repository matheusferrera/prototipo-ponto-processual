'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, Search, ArrowRight, AlertTriangle } from 'lucide-react';
import styles from './OabSearch.module.css';

type Tribunal = { sigla: string; processos: number; suportado: boolean };
type Preview = { totalProcessos: number; desde: string; tribunais: Tribunal[] };

/** `/cadastro?oab=…&uf=…` → `/onboarding?oab=…&uf=…`: a OAB viaja pela URL até
 *  o onboarding, que a usa como valor inicial do campo. */
function hrefCadastro(numero: string, uf: string) {
  const qs = new URLSearchParams({ oab: numero.replace(/\D/g, ''), uf: uf.toUpperCase() });
  return `/cadastro?${qs}`;
}

/**
 * Busca por OAB do hero — o único CTA acima da dobra.
 *
 * Chama a rota anônima `/api/public/preview-oab` (DJEN nacional, base
 * pública), então o visitante vê os **próprios** processos antes de dar
 * e-mail: a prova mais forte que a página tem para oferecer. O cadastro só
 * é pedido depois do resultado, já com a OAB guardada em localStorage para
 * o onboarding não repetir a pergunta.
 */
export function OabSearch() {
  const [numero, setNumero] = useState('');
  const [uf, setUf] = useState('');
  const [estado, setEstado] = useState<'idle' | 'buscando' | 'ok' | 'erro'>('idle');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [erro, setErro] = useState('');
  const numeroRef = useRef<HTMLInputElement>(null);
  const ufRef = useRef<HTMLInputElement>(null);
  /* A busca aparece duas vezes na landing (hero e CTA final): id fixo
     duplicaria o atributo e faria o <label> do rodapé focar o campo do topo. */
  const uid = useId();
  const idNumero = `oab-numero-${uid}`;
  const idUf = `oab-uf-${uid}`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (estado === 'buscando') return;

    /* O botão nunca fica desabilitado: sobre o fundo verde do hero um CTA
       apagado lê como indisponível, e é o único pedido acima da dobra. Campo
       faltando vira foco + aviso, não um botão morto. */
    if (!numero.trim()) {
      setErro('Informe o número da sua OAB.');
      setEstado('erro');
      numeroRef.current?.focus();
      return;
    }
    if (uf.trim().length !== 2) {
      setErro('Informe a UF da sua OAB (duas letras).');
      setEstado('erro');
      ufRef.current?.focus();
      return;
    }

    setEstado('buscando');
    setErro('');

    try {
      const qs = new URLSearchParams({ oabNumero: numero.replace(/\D/g, ''), oabUf: uf.toUpperCase() });
      const res = await fetch(`/api/public/preview-oab?${qs}`);
      const data = await res.json();

      if (!res.ok) {
        setErro(data.error ?? 'Não foi possível consultar agora.');
        setEstado('erro');
        return;
      }

      setPreview(data as Preview);
      setEstado('ok');
    } catch {
      setErro('Não foi possível consultar agora. Tente de novo em instantes.');
      setEstado('erro');
    }
  }

  function reiniciar() {
    setEstado('idle');
    setPreview(null);
    setErro('');
  }

  if (estado === 'ok' && preview) {
    return <Resultado preview={preview} numero={numero} uf={uf.toUpperCase()} onVoltar={reiniciar} />;
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
        <button type="submit" className={styles.submit} disabled={estado === 'buscando'}>
          {estado === 'buscando' ? (
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

      {estado === 'erro' ? (
        <p className={styles.erro}>
          <AlertTriangle size={14} /> {erro}
        </p>
      ) : (
        <p className={styles.micro}>
          Consulta em base pública. Não pedimos senha de tribunal, não pedimos cartão. Leva 30 segundos.
        </p>
      )}
    </div>
  );
}

function Resultado({
  preview,
  numero,
  uf,
  onVoltar,
}: {
  preview: Preview;
  numero: string;
  uf: string;
  onVoltar: () => void;
}) {
  const { totalProcessos, tribunais } = preview;

  if (totalProcessos === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.resultado}>
          <p className={styles.resultadoEyebrow}>OAB {numero}/{uf}</p>
          <p className={styles.resultadoTitulo}>
            Nenhuma publicação sua nos últimos 6 meses em base pública.
          </p>
          <p className={styles.resultadoDesc}>
            Isso é comum em OAB nova, em processos que correm em segredo de justiça e em tribunais que
            publicam pouco no diário nacional. Com login do tribunal, alcançamos também esses.
          </p>
          <div className={styles.resultadoAcoes}>
            <button type="button" className={styles.voltar} onClick={onVoltar}>
              Tentar outra OAB
            </button>
            <Link href={hrefCadastro(numero, uf)} className={styles.resultadoCta}>
              CRIAR CONTA <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cobertos = tribunais.filter(t => t.suportado).length;

  return (
    <div className={styles.wrap}>
      <div className={styles.resultado}>
        <p className={styles.resultadoEyebrow}>Encontramos na OAB {numero}/{uf}</p>
        <p className={styles.resultadoNumero}>
          <strong>{totalProcessos}</strong> {totalProcessos === 1 ? 'processo' : 'processos'} em{' '}
          <strong>{tribunais.length}</strong> {tribunais.length === 1 ? 'tribunal' : 'tribunais'}
        </p>

        <ul className={styles.tribunais}>
          {tribunais.slice(0, 8).map(t => (
            <li key={t.sigla} className={styles.tribunal} data-suportado={t.suportado ? 'sim' : 'nao'}>
              <span className={styles.tribunalSigla}>{t.sigla}</span>
              <span className={styles.tribunalQtd}>{t.processos}</span>
            </li>
          ))}
          {tribunais.length > 8 && (
            <li className={styles.tribunalMais}>+{tribunais.length - 8}</li>
          )}
        </ul>

        <p className={styles.resultadoDesc}>
          {cobertos > 0
            ? `Sincronizamos ${cobertos === tribunais.length ? 'todos' : cobertos} desses tribunais automaticamente, várias vezes por dia. `
            : ''}
          Esses são só os que publicaram nos últimos 6 meses em base pública — com login do tribunal
          entram também os sigilosos e os em segredo de justiça.
        </p>

        <div className={styles.resultadoAcoes}>
          <Link href={hrefCadastro(numero, uf)} className={styles.resultadoCta}>
            MONITORAR ESSES PROCESSOS <ArrowRight size={14} />
          </Link>
          <button type="button" className={styles.voltar} onClick={onVoltar}>
            Consultar outra OAB
          </button>
        </div>
        <p className={styles.micro}>Grátis para começar. Sem cartão. Sem senha de tribunal.</p>
      </div>
    </div>
  );
}
