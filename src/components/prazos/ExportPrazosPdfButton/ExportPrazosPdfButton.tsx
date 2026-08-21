'use client';

import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import type { Prazo } from '@/types';
import { Button } from '@/components/ui/button';
import styles from './ExportPrazosPdfButton.module.css';

/** Uma linha por prazo, colunas para leitura de planilha. */
export function ExportPrazosPdfButton({ prazos }: { prazos: Prazo[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setIsGenerating(true);
    setError(null);

    try {
      const { downloadPrazosPdf } = await import('@/lib/prazos-pdf');
      await downloadPrazosPdf(prazos);
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
        title="Tabela de prazos, uma linha por expediente"
        disabled={prazos.length === 0 || isGenerating}
        aria-busy={isGenerating}
        onClick={handleExport}
      >
        {isGenerating ? (
          <LoaderCircle aria-hidden="true" className={styles.spinner} />
        ) : (
          <Download aria-hidden="true" />
        )}
        {isGenerating ? 'Gerando PDF…' : 'Exportar PDF'}
      </Button>
    </div>
  );
}
