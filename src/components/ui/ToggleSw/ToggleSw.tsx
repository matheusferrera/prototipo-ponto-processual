'use client';
import { Switch } from '@/components/ui/switch';

interface ToggleSwProps {
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
}

export function ToggleSw({ defaultOn = true, onChange }: ToggleSwProps) {
  return (
    <span onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
      <Switch
        defaultChecked={defaultOn}
        onCheckedChange={onChange ? (checked: boolean) => onChange(checked) : undefined}
      />
    </span>
  );
}
