'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { slugOab } from '@/lib/previa';
import { ROTA_PAINEL } from '@/lib/rotas';
import styles from './page.module.css';

/**
 * O CTA desta página para quem já tem sessão: liga o monitoramento e vai ao painel.
 *
 * Quem chegou aqui logado já viu os processos — mandá-lo ao onboarding seria
 * repetir a mesma busca numa segunda tela para chegar ao mesmo lugar. O que
 * faltava não era outra tela, era **gravar a OAB na conta**: é o que
 * `/scraper/monitorar-oab` faz (persiste a OAB e enfileira DJEN + consulta
 * pública), e é por isso que este é um botão e não um link — a navegação só
 * acontece depois que o servidor confirma.
 *
 * No painel, esta conta cai em `PainelSincronizando`: tem OAB, ainda não tem
 * varredura concluída. É o estado certo, e ele já existia.
 */
export function MonitorarOab({
  oab,
  className,
  seta = 16,
  children,
}: {
  oab: { numero: string; uf: string };
  /** A classe do link que este botão substitui — os dois têm de ser o mesmo objeto na tela. */
  className: string;
  /** Tamanho da seta do CTA que ele substitui. */
  seta?: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function ligar() {
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch('/api/scraper/monitorar-oab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oabNumero: oab.numero, oabUf: oab.uf }),
      });

      if (!res.ok) {
        const dados = await res.json().catch(() => ({}));
        // Sessão vencida no meio do caminho: a conta existe, só falta entrar de
        // novo — e o `next` traz a pessoa de volta com a OAB intacta.
        if (res.status === 401) {
          router.push(`/login?next=/oab/${slugOab(oab.numero, oab.uf)}`);
          return;
        }
        setErro(dados.error ?? 'Não foi possível ligar o monitoramento agora.');
        return;
      }

      router.push(ROTA_PAINEL);
      // O painel é Server Component: sem isto ele pode ser servido do cache do
      // roteador, de antes de a OAB existir na conta.
      router.refresh();
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={ligar} disabled={enviando}>
        {enviando ? (
          <>
            Ligando o monitoramento… <Loader2 size={seta} className={styles.girando} aria-hidden="true" />
          </>
        ) : (
          <>
            {children} <ArrowRight size={seta} aria-hidden="true" />
          </>
        )}
      </button>
      {erro && (
        <p className={styles.fechoMicro} role="alert">
          {erro}
        </p>
      )}
    </>
  );
}
