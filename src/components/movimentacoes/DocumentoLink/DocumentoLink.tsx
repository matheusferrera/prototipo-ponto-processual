'use client';

import { useState } from 'react';
import { Lock, RefreshCw } from 'lucide-react';
import styles from './DocumentoLink.module.css';

/**
 * O link de um documento — mas que sabe abrir a boca quando falha.
 *
 * Um `<a href target="_blank">` normal não tem como mostrar
 * `{"error":"...","code":"DOCUMENTO_INDISPONIVEL"}`: o navegador troca a aba
 * inteira pelo JSON cru que a rota devolveu. Isso já aconteceu num caso real
 * — peça de parte do PDPJ que o token do servidor não pode abrir porque o
 * advogado da conta não é parte naquele processo — e o produto respondia com
 * uma aba de erro em vez de uma frase.
 *
 * Por isso o clique passa por aqui primeiro: busca o documento, e só abre uma
 * aba nova se a resposta vier `ok`. Se vier erro, a MENSAGEM do backend
 * substitui o link, sem navegar a lugar nenhum — `documentoPeloLink`,
 * `documentoPublicoPjeCp` e `documentoPdpjComoArquivo` (backend) já escrevem
 * essas mensagens em português para exatamente este uso.
 *
 * Progressivo: sem JavaScript, o `href` continua ali e o clique navega —
 * pior do que com JS, mas nunca pior que o link cru de antes.
 */
export function DocumentoLink({
  url,
  className,
  title,
  children,
}: {
  url: string;
  className?: string;
  /** Aviso no hover — hoje o "pode não abrir" das chaves que já voltaram 404. */
  title?: string;
  children: React.ReactNode;
}) {
  const [estado, setEstado] = useState<{ erro: string; permanente: boolean } | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function abrir(e: React.MouseEvent) {
    e.preventDefault();
    if (carregando) return;
    setCarregando(true);
    setEstado(null);
    // A aba abre AQUI, síncrono com o clique — é o que convence o bloqueador
    // de pop-up de que é o usuário abrindo, não o script. Abrir depois do
    // `await fetch` (mesmo que só para escrever nela) chega tarde demais para
    // alguns navegadores, e a aba nunca aparece — sem aviso nenhum de que
    // falhou.
    //
    // **`noopener` aqui quebrava tudo.** Passado como feature do `window.open`,
    // ele faz o navegador devolver `null` DE PROPÓSITO — é a definição da
    // flag, não bug do browser. Sem a referência, `aba.location.href =
    // blobUrl` nunca rodava (o `if (aba)` sempre caía no `else`), e o
    // `window.open` de reserva vinha DEPOIS do `await fetch` — tarde demais
    // para o bloqueador de pop-up, que o barrava calado. Resultado: a aba em
    // branco da linha acima ficava em branco para sempre, e nada mais abria.
    // O conteúdo é sempre um blob nosso (o arquivo já filtrado pelo backend),
    // nunca a URL de terceiro que `noopener` existe para proteger — manter a
    // referência aqui não reabre o risco que a flag evita.
    const aba = window.open('', '_blank');
    try {
      const res = await fetch(url);
      if (!res.ok) {
        aba?.close();
        const corpo = await res.json().catch(() => null) as { error?: string; code?: string } | null;
        setEstado({
          erro: corpo?.error ?? 'Não foi possível abrir o documento agora.',
          // `TRIBUNAL_NAO_SERVIU` é a sessão do tribunal recusando ESTA
          // tentativa — a próxima costuma servir. Os demais códigos
          // (`DOCUMENTO_INDISPONIVEL`, `SEM_DOCUMENTO`) não mudam ao repetir.
          permanente: corpo?.code !== 'TRIBUNAL_NAO_SERVIU',
        });
        return;
      }
      // O arquivo já veio no corpo desta resposta — redirecionar a aba para a
      // URL de novo pediria ao tribunal pela segunda vez o mesmo documento.
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (aba) aba.location.href = blobUrl;
      else window.open(blobUrl, '_blank', 'noopener,noreferrer'); // bloqueado na 1ª tentativa; último recurso
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      aba?.close();
      setEstado({ erro: 'Falha de conexão ao buscar o documento.', permanente: false });
    } finally {
      setCarregando(false);
    }
  }

  if (estado) {
    return (
      <span className={styles.erro} role="alert">
        {estado.permanente ? <Lock size={13} aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
        <span>
          {estado.erro}
          {!estado.permanente && (
            <>
              {' '}
              <button type="button" onClick={abrir} className={styles.tentar}>Tentar de novo</button>
            </>
          )}
        </span>
      </span>
    );
  }

  return (
    <a
      href={url}
      onClick={abrir}
      className={className}
      title={title}
      aria-busy={carregando}
      // Sem JS, isto é o comportamento de antes: navega para a URL do proxy,
      // que devolve o arquivo (sucesso) ou o JSON cru do erro (antes deste
      // componente existir). Com JS, `abrir` intercepta e nunca deixa chegar
      // aqui.
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
