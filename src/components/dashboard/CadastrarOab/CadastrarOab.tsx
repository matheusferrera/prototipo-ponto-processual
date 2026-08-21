'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { limparOabNumero, limparOabUf, normalizarOab } from '@/lib/previa';
import styles from './CadastrarOab.module.css';

interface CadastrarOabProps {
  /** Preenche o campo quando já existe uma OAB e o objetivo é corrigi-la. */
  oabInicial?: { numero: string; uf: string };
  rotuloBotao: string;
}

/**
 * Informar a OAB direto do painel vazio.
 *
 * Existe porque o painel sem processos precisava de um lugar para responder a
 * pergunta que ele mesmo faz. Mandar para o onboarding não resolvia: aquela
 * tela trata a OAB como resposta já dada — sem OAB na URL ela vai direto pedir
 * o login do tribunal, que é um pedido muito maior e não é o que falta aqui.
 *
 * Grava e sai: `POST /scraper/monitorar-oab` persiste a OAB e enfileira as duas
 * varreduras públicas (DJEN e consulta pública). O resultado não vem nesta
 * resposta — o `router.refresh()` devolve o painel no estado "sincronizando", e
 * é o próprio painel que conta o que encontrou.
 */
export function CadastrarOab({ oabInicial, rotuloBotao }: CadastrarOabProps) {
  const router = useRouter();
  const [numero, setNumero] = useState(oabInicial?.numero ?? '');
  const [uf, setUf] = useState(oabInicial?.uf ?? '');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');

    const oab = normalizarOab(numero, uf);
    if (!oab) {
      setErro('Informe o número e a UF da sua OAB.');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch('/api/scraper/monitorar-oab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oabNumero: oab.numero, oabUf: oab.uf }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error ?? 'Não foi possível salvar sua OAB agora.');
        return;
      }

      // O painel é Server Component: quem relê o estado da conta é o servidor.
      router.refresh();
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <div className={styles.campos}>
        <label className={styles.campo}>
          <span className={styles.rotulo}>Nº da OAB</span>
          <input
            className={styles.input}
            value={numero}
            onChange={e => { setNumero(limparOabNumero(e.target.value)); setErro(''); }}
            placeholder="12345"
            inputMode="numeric"
            maxLength={8}
            disabled={enviando}
            aria-invalid={!!erro}
          />
        </label>

        <label className={`${styles.campo} ${styles.campoUf}`}>
          <span className={styles.rotulo}>UF</span>
          <input
            className={styles.input}
            value={uf}
            onChange={e => { setUf(limparOabUf(e.target.value)); setErro(''); }}
            placeholder="SP"
            maxLength={2}
            disabled={enviando}
            aria-invalid={!!erro}
          />
        </label>

        <button type="submit" className={styles.botao} disabled={enviando}>
          {enviando ? <Loader2 size={14} className={styles.girando} /> : <Search size={14} />}
          {enviando ? 'Buscando…' : rotuloBotao}
        </button>
      </div>

      {erro && <p className={styles.erro} role="alert">{erro}</p>}
    </form>
  );
}
