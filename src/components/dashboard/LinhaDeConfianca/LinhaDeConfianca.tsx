import Link from 'next/link';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import type { TribunalStatusItem } from '@/types';
import styles from './LinhaDeConfianca.module.css';

const hora = (iso: string | null) => iso
  ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso))
  : null;

const dia = (iso: string | null) => iso
  ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(iso))
  : null;

export function LinhaDeConfianca({ tribunais, djenSyncedUntil }: { tribunais: TribunalStatusItem[]; djenSyncedUntil: string | null }) {
  const total = tribunais.reduce((soma, tribunal) => soma + tribunal.activeProcessesCount, 0);
  const saudaveis = tribunais.filter(tribunal => tribunal.status === 'operacional' || tribunal.status === 'sincronizando');
  const verificados = saudaveis.reduce((soma, tribunal) => soma + tribunal.activeProcessesCount, 0);
  const ultimo = tribunais.map(t => t.lastSyncAt).filter((valor): valor is string => Boolean(valor)).sort().at(-1) ?? null;
  const falha = tribunais.find(t => t.status === 'erro' || t.status === 'atencao');

  return (
    <Link href="/status" className={styles.raiz}>
      {falha ? <TriangleAlert aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
      <span>
        <strong>{ultimo ? `Verificado hoje às ${hora(ultimo)}` : 'Varredura em acompanhamento'}</strong>
        <small>{verificados} de {total} processos{djenSyncedUntil ? ` · DJEN lido até ${dia(djenSyncedUntil)}` : ''}</small>
        {falha && <small className={styles.falha}>{falha.codigo} sem resposta — confira o status</small>}
      </span>
      <b aria-hidden="true">›</b>
    </Link>
  );
}
