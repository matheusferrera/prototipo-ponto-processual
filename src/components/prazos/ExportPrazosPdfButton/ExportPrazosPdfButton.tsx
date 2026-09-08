'use client';

import { useState } from 'react';
import { Download, FileDown, LoaderCircle } from 'lucide-react';
import type { Prazo } from '@/types';
import { Button } from '@/components/ui/button';
import filterStyles from '@/components/filters/FilterPanel.module.css';
import styles from './ExportPrazosPdfButton.module.css';

/**
 * Uma linha por prazo, colunas para leitura de planilha.
 * `compact` é a versão só-ícone que mora no header, com a mesma cara do botão de filtro.
 */
export function ExportPrazosPdfButton({ prazos, compact = false }: { prazos: Prazo[]; compact?: boolean }) {
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
        size={compact ? 'icon' : 'sm'}
        className={compact ? filterStyles.iconButton : styles.button}
        title={compact ? 'Exportar PDF — tabela de prazos, uma linha por expediente' : 'Tabela de prazos, uma linha por expediente'}
        aria-label={compact ? (isGenerating ? 'Gerando PDF' : 'Exportar PDF') : undefined}
        disabled={prazos.length === 0 || isGenerating}
        aria-busy={isGenerating}
        onClick={handleExport}
      >
        {isGenerating ? (
          <LoaderCircle aria-hidden="true" className={styles.spinner} />
        ) : compact ? (
          <FileDown aria-hidden="true" />
        ) : (
          <Download aria-hidden="true" />
        )}
        {!compact && (isGenerating ? 'Gerando PDF…' : 'Exportar PDF')}
      </Button>
    </div>
  );
}
