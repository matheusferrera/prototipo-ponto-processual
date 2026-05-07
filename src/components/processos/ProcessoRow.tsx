import Link from 'next/link';
import type { Processo } from '@/types';
import { Seal } from '@/components/ui/Seal';
import { TribTag } from '@/components/ui/TribTag';
import { ToggleSw } from '@/components/ui/ToggleSw';

const COLS = '12px 70px 280px 1fr 110px 60px 90px 90px 60px';

interface ProcessoRowProps {
  p: Processo;
}

export function ProcessoRow({ p }: ProcessoRowProps) {
  const leftBg =
    p.state === 'signal' ? 'var(--brick)'
    : p.state === 'alert' ? 'var(--alert)'
    : 'transparent';

  const rowBg = p.state === 'signal' ? 'var(--paper-2)' : 'transparent';

  const dotColor =
    p.state === 'signal' ? 'var(--brick)'
    : p.state === 'alert' ? 'var(--alert)'
    : 'var(--quiet)';

  return (
    <Link
      href={`/processos/${p.id}`}
      style={{
        padding: '14px 32px',
        borderBottom: '1px solid var(--line-soft)',
        display: 'grid',
        gridTemplateColumns: COLS,
        gap: 16,
        alignItems: 'center',
        background: rowBg,
        position: 'relative',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      {/* Aba lateral colorida */}
      <div
        style={{
          width: 3,
          height: 28,
          background: leftBg,
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Status dot */}
      <span style={{ width: 6, height: 6, borderRadius: 999, background: dotColor, display: 'inline-block' }} />

      <TribTag label={p.tribunal} />

      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500 }}>{p.cnj}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{p.parte}</span>
      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.materia}</span>
      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.grau}</span>
      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.ultimaMov}</span>

      <div>
        {p.state === 'signal' && <Seal variant="nova" />}
        {p.state === 'alert' && <Seal variant="erro" />}
        {p.state === 'quiet' && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>—</span>}
      </div>

      <ToggleSw defaultOn={p.whatsEnabled} />
    </Link>
  );
}

export { COLS };
