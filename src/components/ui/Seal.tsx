interface SealProps {
  variant?: 'nova' | 'erro' | 'outline';
  label?: string;
}

const variantStyle: Record<string, React.CSSProperties> = {
  nova:    { background: 'var(--brick)', color: 'var(--paper)', border: 'none' },
  erro:    { background: 'var(--alert)', color: 'var(--paper)', border: 'none' },
  outline: { background: 'transparent', color: 'var(--brick)', border: '1px solid var(--brick)' },
};

export function Seal({ variant = 'nova', label }: SealProps) {
  const text = label ?? (variant === 'erro' ? 'ERRO' : 'NOVA');
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        padding: '3px 8px',
        borderRadius: 0,
        flexShrink: 0,
        fontFamily: 'var(--ui)',
        ...variantStyle[variant],
      }}
    >
      {text}
    </span>
  );
}
