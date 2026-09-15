'use client';

import { useState } from 'react';
import { CalendarPlus, LoaderCircle } from 'lucide-react';
import type { Prazo } from '@/types';
import { Button } from '@/components/ui/button';
import filterStyles from '@/components/filters/FilterPanel.module.css';
import styles from './ExportPrazosIcsButton.module.css';

/**
 * Leva a pauta para a agenda do advogado — Google Calendar, Outlook, Apple.
 *
 * **O aviso de "não se atualiza" fica na TELA, não só dentro do arquivo.** Ele
 * é a única diferença que importa entre este botão e uma assinatura de
 * calendário, e é uma diferença que morde meses depois: o evento importado
 * hoje continua dizendo 24/09 mesmo que o prazo seja suspenso amanhã. Quem
 * clica precisa saber disso ANTES, e não descobrir no dia.
 *
 * Fica ao lado do PDF de propósito — são as duas saídas da mesma pauta, com o
 * mesmo recorte de filtros que a tela está mostrando.
 */
export function ExportPrazosIcsButton({ prazos, compact = false }: { prazos: Prazo[]; compact?: boolean }) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function exportar() {
    setGerando(true);
    setErro(null);
    setAviso(null);

    try {
      const { baixarPrazosIcs } = await import('@/lib/prazos-ics');
      const { eventos, semData } = baixarPrazosIcs(prazos);

      // O que ficou de fora precisa ser DITO. Expediente sem data é estado
      // legítimo e comum; se ele sumisse calado, a agenda pareceria completa
      // enquanto a pauta tinha mais linhas que ela.
      if (semData > 0) {
        setAviso(
          `${eventos} ${eventos === 1 ? 'prazo exportado' : 'prazos exportados'} · ${semData} sem data de vencimento ${semData === 1 ? 'ficou' : 'ficaram'} de fora`,
        );
      }
    } catch (falha) {
      console.error('Não foi possível gerar o arquivo de calendário.', falha);
      setErro('Não foi possível gerar o arquivo. Tente novamente.');
    } finally {
      setGerando(false);
    }
  }

  const titulo = 'Exportar para a agenda (.ics) — cópia da pauta de hoje; não se atualiza sozinha';

  return (
    <div className={styles.root}>
      {erro && <span className={styles.error} role="alert">{erro}</span>}
      {!erro && aviso && <span className={styles.aviso} role="status">{aviso}</span>}
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon' : 'sm'}
        className={compact ? filterStyles.iconButton : styles.button}
        title={titulo}
        aria-label={compact ? (gerando ? 'Gerando arquivo de calendário' : 'Exportar para a agenda') : undefined}
        disabled={prazos.length === 0 || gerando}
        aria-busy={gerando}
        onClick={exportar}
      >
        {gerando
          ? <LoaderCircle aria-hidden="true" className={styles.spinner} />
          : <CalendarPlus aria-hidden="true" />}
        {!compact && (gerando ? 'Gerando…' : 'Agenda (.ics)')}
      </Button>
    </div>
  );
}
