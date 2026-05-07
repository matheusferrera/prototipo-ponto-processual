interface TribTagProps {
  label: string;
  active?: boolean;
}

export function TribTag({ label, active }: TribTagProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.04em',
        padding: '2px 6px',
        border: '1px solid',
        borderColor: active ? 'var(--ink)' : 'var(--line)',
        background: active ? 'var(--ink)' : 'var(--paper)',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
        borderRadius: 0,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}
