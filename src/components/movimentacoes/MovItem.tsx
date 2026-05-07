import type { Movimentacao } from '@/types';
import { Seal } from '@/components/ui/Seal';
import { TribTag } from '@/components/ui/TribTag';

interface MovItemProps {
  m: Movimentacao;
}

export function MovItem({ m }: MovItemProps) {
  const leftBorder =
    m.state === 'signal' ? 'var(--brick)'
    : m.state === 'alert' ? 'var(--alert)'
    : 'var(--line)';

  return (
    <div
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderLeft: `3px solid ${leftBorder}`,
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Hora */}
        <div style={{ padding: '18px 20px', borderRight: '1px solid var(--line-soft)', minWidth: 86 }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: '-0.02em',
              color: m.state === 'signal' ? 'var(--brick)' : 'var(--ink)',
            }}
          >
            {m.time}
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '18px 20px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <TribTag label={m.tribunal} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: m.state === 'signal' ? 'var(--brick)' : 'var(--ink-3)',
              }}
            >
              {m.tipo}
            </span>
            {m.state === 'signal' && <Seal variant="nova" />}
            {m.state === 'alert' && <Seal variant="erro" />}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{m.parte}</div>
          <div style={{ fontSize: 13, marginTop: 2, color: 'var(--ink-2)' }}>{m.detail}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, marginTop: 6, color: 'var(--ink-3)' }}>{m.cnj}</div>
        </div>

        {/* Status WhatsApp */}
        <div
          className="mov-item-whats"
          style={{
            padding: '18px 20px',
            borderLeft: '1px solid var(--line-soft)',
            minWidth: 200,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: m.whats.sent ? 'var(--quiet)' : 'var(--ink-4)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--paper)',
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              W
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: m.whats.sent ? 'var(--ink)' : 'var(--ink-3)' }}>
              {m.whats.sent ? 'Enviado' : 'Não enviado'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
            {m.whats.sent ? `às ${m.whats.time} · entregue ✓✓` : m.whats.reason}
          </div>
        </div>

        {/* Ação */}
        <div className="mov-item-action" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center' }}>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontFamily: 'var(--ui)',
              fontWeight: 600,
              fontSize: 12,
              padding: '6px 10px',
              border: '1px solid var(--ink)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            Abrir →
          </button>
        </div>
      </div>
    </div>
  );
}
