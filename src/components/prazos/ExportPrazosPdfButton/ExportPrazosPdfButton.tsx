'use client';

import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import type { Prazo } from '@/types';
import { Button } from '@/components/ui/button';
import styles from './ExportPrazosPdfButton.module.css';

/**
 * `tabela` — uma linha por prazo, colunas para leitura de planilha.
 * `pauta`  — texto corrido no formato do e-mail de prazos do escritório.
 */
export type PrazoPdfFormat = 'tabela' | 'pauta';

const FORMATOS: Record<PrazoPdfFormat, {
  label: string;
  labelGerando: string;
  title: string;
  gerar: (prazos: Prazo[]) => Promise<void>;
}> = {
  tabela: {
    label: 'Exportar PDF',
    labelGerando: 'Gerando PDF…',
    title: 'Tabela de prazos, uma linha por expediente',
    gerar: async prazos => {
      const { downloadPrazosPdf } = await import('@/lib/prazos-pdf');
      await downloadPrazosPdf(prazos);
    },
  },
  pauta: {
    label: 'Exportar pauta',
    labelGerando: 'Gerando pauta…',
    title: 'Pauta em texto corrido, no formato do e-mail de prazos',
    gerar: async prazos => {
      const { downloadPautaPdf } = await import('@/lib/prazos-pauta-pdf');
      await downloadPautaPdf(prazos);
    },
  },
};

export function ExportPrazosPdfButton({
  prazos,
  format = 'tabela',
}: {
  prazos: Prazo[];
  format?: PrazoPdfFormat;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formato = FORMATOS[format];

  async function handleExport() {
    setIsGenerating(true);
    setError(null);

    try {
      await formato.gerar(prazos);
    } catch (exportError) {
      console.error('Não foi possível gerar o PDF de prazos.', exportError);
      setError('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className={styles.root}>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={styles.button}
        title={formato.title}
        disabled={prazos.length === 0 || isGenerating}
        aria-busy={isGenerating}
        onClick={handleExport}
      >
        {isGenerating ? (
          <LoaderCircle aria-hidden="true" className={styles.spinner} />
        ) : (
          <Download aria-hidden="true" />
        )}
        {isGenerating ? formato.labelGerando : formato.label}
      </Button>
    </div>
  );
}
