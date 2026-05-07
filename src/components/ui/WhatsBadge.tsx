interface WhatsBadgeProps {
  active?: boolean;
  count?: number;
}

export function WhatsBadge({ active = true, count }: WhatsBadgeProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: active ? 'var(--quiet-soft)' : 'var(--paper-2)',
        border: `1px solid ${active ? 'var(--quiet)' : 'var(--line)'}`,
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: active ? 'var(--quiet)' : 'var(--ink-4)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--paper)',
          fontSize: 9,
          fontWeight: 700,
          fontFamily: 'var(--ui)',
        }}
      >
        W
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--ink)' : 'var(--ink-3)' }}>
        {active ? 'WhatsApp ativo' : 'WhatsApp pausado'}
      </span>
      {count != null && (
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>· {count} envios hoje</span>
      )}
    </div>
  );
}
