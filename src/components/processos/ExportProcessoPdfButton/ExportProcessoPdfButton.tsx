'use client';

import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import type { Prazo, Processo, TimelineEvent } from '@/types';
import styles from './ExportProcessoPdfButton.module.css';

interface Props {
  processo: Processo;
  prazos: Prazo[];
  /**
   * A classe do botão vem da PÁGINA, não daqui.
   *
   * Ele mora na barra de breadcrumb ao lado de "Ver no PJe", e os dois têm que
   * ser o mesmo botão. Esse estilo é `styles.actionButton` do CSS Module da
   * página — que um componente noutra pasta não alcança. Duplicar as regras
   * aqui garantiria que os dois divergissem no primeiro ajuste de altura.
   */
  className?: string;
}

/**
 * Baixa o dossiê do processo em PDF — capa, partes, prazos, movimentações e
 * documentos.
 *
 * As movimentações **não** vêm por prop: a página carrega 20 por padrão e o
 * dossiê leva até 100, então elas são buscadas no clique
 * (`/api/processos/{id}/movimentacoes`). Passá-las por prop obrigaria a página
 * a buscar 100 sempre e a serializar as 100 no payload do RSC para um botão que
 * quase ninguém clica.
 *
 * `processo` e `prazos` vêm por prop porque a página já os tem inteiros e são
 * pequenos — pedi-los de novo seria uma requisição paga por nada.
 */
export function ExportProcessoPdfButton({ processo, prazos, className }: Props) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function exportar() {
    setGerando(true);
    setErro(null);

    try {
      // Em paralelo: o jsPDF (~350 KB, lazy) baixa enquanto o backend responde.
      const [resposta, { downloadProcessoPdf }] = await Promise.all([
        fetch(`/api/processos/${encodeURIComponent(processo.id)}/movimentacoes`, {
          cache: 'no-store',
        }),
        import('@/lib/processo-pdf'),
      ]);

      if (!resposta.ok) throw new Error(`Movimentações indisponíveis (${resposta.status})`);
      const { events, total } = (await resposta.json()) as {
        events: TimelineEvent[];
        total: number;
      };

      await downloadProcessoPdf({
        processo,
        prazos,
        timeline: events,
        totalMovimentacoes: total,
      });
    } catch (falha) {
      console.error('Não foi possível gerar o PDF do processo.', falha);
      setErro('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setGerando(false);
    }
  }

  return (
    <>
      {erro && (
        <span className={styles.erro} role="alert">
          {erro}
        </span>
      )}
      <button
        type="button"
        className={className}
        title="Capa, partes, prazos, movimentações e documentos deste processo"
        disabled={gerando}
        aria-busy={gerando}
        onClick={exportar}
      >
        {gerando ? (
          <LoaderCircle aria-hidden="true" size={16} strokeWidth={2} className={styles.spinner} />
        ) : (
          <Download aria-hidden="true" size={16} strokeWidth={2} />
        )}
        {gerando ? 'Gerando PDF…' : 'Exportar PDF'}
      </button>
    </>
  );
}
