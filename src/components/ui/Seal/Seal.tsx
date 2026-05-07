import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SealProps {
  variant?: 'nova' | 'erro' | 'outline';
  label?: string;
}

const variantMap = {
  nova:    'default',
  erro:    'destructive',
  outline: 'outline',
} as const satisfies Record<'nova' | 'erro' | 'outline', 'default' | 'destructive' | 'outline'>;

export function Seal({ variant = 'nova', label }: SealProps) {
  const text = label ?? (variant === 'erro' ? 'ERRO' : 'NOVA');
  return (
    <Badge
      variant={variantMap[variant]}
      className={cn(
        'text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-[3px] h-auto',
        variant === 'erro'    && 'bg-[var(--alert)] text-[var(--paper)]',
        variant === 'outline' && 'border-[var(--brick)] text-[var(--brick)] bg-transparent',
      )}
    >
      {text}
    </Badge>
  );
}
