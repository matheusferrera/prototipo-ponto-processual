'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import styles from './ProcessoPanorama.module.css';

export function CopiarCnj({ cnj }: { cnj: string }) {
  const [estado, setEstado] = useState<'idle' | 'ok' | 'erro'>('idle');
  return <span className={styles.copyGroup}>
    <button type="button" className={styles.copy} aria-label={`Copiar número ${cnj}`} onClick={async () => {
      try { await navigator.clipboard.writeText(cnj); setEstado('ok'); }
      catch { setEstado('erro'); }
    }}>
      <span>{cnj}</span>
      {estado === 'ok' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    </button>
    <span className={styles.small} role="status">{estado === 'ok' ? 'Copiado' : estado === 'erro' ? 'Selecione o número para copiar manualmente.' : ''}</span>
  </span>;
}

export function RevisarProvidencia() {
  const [revisada, setRevisada] = useState(false);
  return <div className={styles.review}>
    <label><input type="checkbox" checked={revisada} onChange={e => setRevisada(e.target.checked)} />
      {revisada ? 'Revisada nesta visualização' : 'Marcar como revisada'}
    </label>
    <span className={styles.small}>Demonstração · marcação temporária, sem encerrar o prazo.</span>
  </div>;
}
