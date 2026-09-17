'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, RotateCcw, UserPlus, X } from 'lucide-react';
import type { PoloManual } from '@/types';
import styles from './ConfirmarCliente.module.css';

/**
 * "É meu cliente / Não é meu" — a saída para o terço que a OAB não decide.
 *
 * ## Por que ela existe
 *
 * A derivação automática cruza a OAB da conta com os representantes de cada
 * parte e acerta 68–84% da carteira (medido em 15/09/2026). O resto é polo que
 * o tribunal publicou **sem representantes** — ali não há o que cruzar, e a
 * resposta honesta do sistema é `indefinido`.
 *
 * Um terço da carteira sem cliente é muito para deixar assim: é o que impede a
 * pauta de ser lida por cliente e o que faz a coluna "Cliente" do PDF cair no
 * nome que o ATO cita, que num processo de polo passivo é a parte contrária.
 *
 * Esta é a pergunta feita **uma vez por processo**, e a resposta vence a
 * derivação para sempre (`Process.meuPoloManual`).
 *
 * ## Por que três respostas e não duas
 *
 * "Não é meu" não é o contrário de "é meu": é um terceiro fato. O processo
 * entrou na carteira por homonímia, ou porque a OAB de um colega apareceu no
 * mesmo ato. Sem essa saída, a única forma de tirar o nome errado da pauta
 * seria arquivar o processo — o que pararia de monitorá-lo.
 *
 * `nenhum` **não arquiva e não esconde**: o processo continua sendo varrido. O
 * que muda é que nenhum nome dele aparece como cliente.
 */

export function ConfirmarCliente({
  processoId,
  /** O que o advogado já respondeu. `null` = ainda não perguntamos. */
  manual,
  /** Os polos, para o botão dizer o nome em vez de "ativo"/"passivo". */
  nomeAtivo,
  nomePassivo,
  /**
   * `inline` — a pergunta cabe numa linha, ao lado de outra coisa.
   * `bloco` — **a pergunta OCUPA O LUGAR DO NOME** no topo da tela do processo.
   *
   * O segundo existe porque `indefinido` é ~30% do acervo, e naquele lugar a
   * alternativa a perguntar não é uma etiqueta discreta: é um vazio onde
   * deveria estar o cliente, em um de cada três processos. Um bloco com a
   * pergunta em 20px e os dois nomes como alvos de 52px converte; uma linha
   * cinza dizendo "a confirmar" só informa que o produto não sabe.
   */
  variante = 'inline',
}: {
  processoId: string;
  manual: PoloManual | null;
  nomeAtivo: string | null;
  nomePassivo: string | null;
  variante?: 'inline' | 'bloco';
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<PoloManual | 'limpar' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciarRefresh] = useTransition();

  async function responder(valor: PoloManual | null) {
    setErro(null);
    setSalvando(valor ?? 'limpar');
    try {
      const res = await fetch(`/api/processos/${encodeURIComponent(processoId)}/polo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meuPoloManual: valor }),
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => ({}));
        throw new Error(dados?.error ?? 'Não foi possível salvar.');
      }
      iniciarRefresh(() => router.refresh());
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(null);
    }
  }

  /* Já respondeu "não é meu": a pergunta não volta. O que fica é a saída —
     sem ela, um clique errado seria permanente. */
  if (manual === 'nenhum') {
    return (
      <span className={styles.raiz}>
        <span className={styles.recusado}>Você marcou que este processo não é seu</span>
        <button type="button" className={styles.desfazer} disabled={salvando !== null}
          onClick={() => void responder(null)}>
          {salvando === 'limpar'
            ? <LoaderCircle size={13} aria-hidden="true" className={styles.girando} />
            : <RotateCcw size={13} aria-hidden="true" />}
          Desfazer
        </button>
      </span>
    );
  }

  /* Já respondeu qual polo: idem. O nome aparece no lugar certo (o hero), e
     aqui sobra só a correção. */
  if (manual === 'ativo' || manual === 'passivo') {
    return (
      <button type="button" className={styles.desfazer} disabled={salvando !== null}
        onClick={() => void responder(null)}>
        {salvando === 'limpar'
          ? <LoaderCircle size={13} aria-hidden="true" className={styles.girando} />
          : <RotateCcw size={13} aria-hidden="true" />}
        Não é esse o lado
      </button>
    );
  }

  if (variante === 'bloco') {
    return (
      <div className={styles.cartao}>
        <p className={styles.cartaoTitulo}>De que lado você está?</p>
        <p className={styles.cartaoTexto}>
          O tribunal não publicou os representantes deste processo, então não dá para cruzar
          a sua OAB com as partes. Acontece em cerca de <strong>30% do acervo</strong>.
        </p>

        {erro && <p className={styles.erro} role="alert">{erro}</p>}

        <div className={styles.escolhas}>
          {nomeAtivo && (
            <button type="button" className={styles.escolha} disabled={salvando !== null}
              onClick={() => void responder('ativo')}>
              <span className={styles.escolhaNome}>{nomeAtivo}</span>
              <span className={styles.escolhaPolo}>
                {salvando === 'ativo' ? <LoaderCircle size={13} aria-hidden="true" className={styles.girando} /> : 'polo ativo'}
              </span>
            </button>
          )}
          {nomePassivo && (
            <button type="button" className={styles.escolha} disabled={salvando !== null}
              onClick={() => void responder('passivo')}>
              <span className={styles.escolhaNome}>{nomePassivo}</span>
              <span className={styles.escolhaPolo}>
                {salvando === 'passivo' ? <LoaderCircle size={13} aria-hidden="true" className={styles.girando} /> : 'polo passivo'}
              </span>
            </button>
          )}
          <button type="button" className={styles.recusar} disabled={salvando !== null}
            onClick={() => void responder('nenhum')}>
            {salvando === 'nenhum' && <LoaderCircle size={13} aria-hidden="true" className={styles.girando} />}
            Não é meu processo
          </button>
        </div>

        <p className={styles.cartaoNota}>Sua resposta vence a derivação e não é perguntada de novo.</p>
      </div>
    );
  }

  return (
    <span className={styles.raiz}>
      {erro && <span className={styles.erro} role="alert">{erro}</span>}
      <span className={styles.pergunta}>Qual lado é o seu?</span>

      {nomeAtivo && (
        <button type="button" className={styles.opcao} disabled={salvando !== null}
          onClick={() => void responder('ativo')}>
          {salvando === 'ativo'
            ? <LoaderCircle size={13} aria-hidden="true" className={styles.girando} />
            : <UserPlus size={13} aria-hidden="true" />}
          {/* O NOME, não "polo ativo". Quem responde reconhece o cliente pelo
              nome; "ativo" é vocabulário de cartório e obriga a traduzir. */}
          <span className={styles.nome}>{nomeAtivo}</span>
        </button>
      )}

      {nomePassivo && (
        <button type="button" className={styles.opcao} disabled={salvando !== null}
          onClick={() => void responder('passivo')}>
          {salvando === 'passivo'
            ? <LoaderCircle size={13} aria-hidden="true" className={styles.girando} />
            : <UserPlus size={13} aria-hidden="true" />}
          <span className={styles.nome}>{nomePassivo}</span>
        </button>
      )}

      <button type="button" className={styles.nenhum} disabled={salvando !== null}
        onClick={() => void responder('nenhum')}>
        {salvando === 'nenhum'
          ? <LoaderCircle size={13} aria-hidden="true" className={styles.girando} />
          : <X size={13} aria-hidden="true" />}
        Nenhum dos dois
      </button>
    </span>
  );
}
