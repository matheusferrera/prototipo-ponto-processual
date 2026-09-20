'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LoaderCircle, RotateCcw } from 'lucide-react';
import styles from './BaixarPrazo.module.css';

/**
 * "Protocolei" — a primeira ação de escrita que o produto oferece sobre um
 * prazo.
 *
 * ## A linha NÃO some quando alguém clica
 *
 * Esta é a decisão que define o componente. Dar baixa é a ação que mais assusta
 * numa pauta de prazos: um clique errado tira da tela exatamente a coisa que o
 * produto existe para não deixar esquecer. O padrão comum — a linha desaparece
 * e um *snackbar* oferece "desfazer" por cinco segundos — falha nos dois casos
 * que importam: quem clicou sem querer talvez nem veja o aviso, e quem viu tem
 * cinco segundos para reagir.
 *
 * Aqui a linha FICA, riscada e em verde-sage, com o desfazer **nela**, até a
 * próxima carga da página. Quem errou vê o erro e o conserta no mesmo lugar.
 *
 * ## Otimista no botão, não na lista
 *
 * O estado muda na hora (`baixado`), mas a linha permanece no DOM e o
 * `router.refresh()` só acontece depois que o servidor confirmou. Isso evita o
 * pior da renderização otimista em lista: a linha sumir, a requisição falhar, e
 * a lista ter de reordenar de volta com o item reaparecendo num lugar diferente.
 *
 * ## Falha não é silêncio
 *
 * Erro volta para `repouso` com a mensagem ao lado. Um prazo que o advogado
 * acha que baixou e continua aberto é ruim; um que ele acha que baixou e o
 * servidor recusou em silêncio é pior.
 */

type Estado = 'repouso' | 'enviando' | 'baixado';

/**
 * O botão mora na linha de prazo, que é clicável inteira (abre o card do ato).
 * Até 17/09/2026 a linha era um `<details>` e o botão ficava DENTRO do
 * `<summary>`: sem isto, dar baixa abria o painel junto. Hoje os verbos ficam
 * fora do link, e a guarda continua pelo mesmo motivo em miniatura — nenhum
 * ancestral deve reagir a um clique que é do botão.
 *
 * Um `type="button"` não tem ação padrão própria, então `preventDefault` e
 * `stopPropagation` não custam nada a ele.
 */
function semAbrirOPainel(acao: () => void) {
  return (evento: React.MouseEvent) => {
    evento.preventDefault();
    evento.stopPropagation();
    acao();
  };
}

export function BaixarPrazo({
  prazoId,
  fechado,
  compacto = false,
  toolbar = false,
  atualizarPagina = true,
}: {
  prazoId: string;
  /** O estado que veio do servidor. */
  fechado: boolean;
  /** Variante do kanban e do celular: os dois verbos dividem a largura. */
  compacto?: boolean;
  /** Integra o verbo a uma barra de ações, sem virar um botão preenchido isolado. */
  toolbar?: boolean;
  /** No painel, o recibo precisa permanecer no cartão até a próxima visita. */
  atualizarPagina?: boolean;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>(fechado ? 'baixado' : 'repouso');
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciarRefresh] = useTransition();

  async function alternar(proximo: boolean) {
    setErro(null);
    setEstado('enviando');
    try {
      const res = await fetch(`/api/prazos/${encodeURIComponent(prazoId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechado: proximo }),
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => ({}));
        throw new Error(dados?.error ?? 'Não foi possível salvar.');
      }
      setEstado(proximo ? 'baixado' : 'repouso');
      /* O refresh vem DEPOIS da confirmação e dentro de uma transição: a linha
         não pisca, e os contadores do topo (que são Server Components) chegam
         atualizados na próxima pintura. */
      if (atualizarPagina) iniciarRefresh(() => router.refresh());
    } catch (falha) {
      setEstado('repouso');
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
    }
  }

  if (estado === 'baixado' && toolbar) {
    return (
      <span className={`${styles.raiz} ${styles.compacto} ${styles.toolbar}`}>
        <button
          type="button"
          className={styles.reciboAcao}
          aria-label="Baixado. Desfazer baixa"
          onClick={semAbrirOPainel(() => void alternar(false))}
        >
          <Check size={14} aria-hidden="true" />
          <span>
            <strong>Baixado</strong>
            <small>Desfazer</small>
          </span>
        </button>
      </span>
    );
  }

  if (estado === 'baixado') {
    return (
      <span className={`${styles.raiz} ${compacto ? styles.compacto : ''} ${toolbar ? styles.toolbar : ''}`}>
        <span className={styles.feito}>
          <Check size={14} aria-hidden="true" />
          Baixado
        </span>
        <button
          type="button"
          className={styles.desfazer}
          onClick={semAbrirOPainel(() => void alternar(false))}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Desfazer
        </button>
      </span>
    );
  }

  return (
    <span className={`${styles.raiz} ${compacto ? styles.compacto : ''} ${toolbar ? styles.toolbar : ''}`}>
      {erro && <span className={styles.erro} role="alert">{erro}</span>}
      <button
        type="button"
        className={styles.protocolei}
        disabled={estado === 'enviando'}
        aria-busy={estado === 'enviando'}
        onClick={semAbrirOPainel(() => void alternar(true))}
      >
        {estado === 'enviando'
          ? <LoaderCircle size={14} aria-hidden="true" className={styles.girando} />
          : <Check size={14} aria-hidden="true" />}
        {estado === 'enviando' ? 'Salvando…' : 'Protocolei'}
      </button>
    </span>
  );
}
