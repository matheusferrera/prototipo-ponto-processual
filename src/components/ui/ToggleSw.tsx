'use client';
import { useState } from 'react';
import type React from 'react';

interface ToggleSwProps {
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
}

export function ToggleSw({ defaultOn = true, onChange }: ToggleSwProps) {
  const [on, setOn] = useState(defaultOn);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !on;
    setOn(next);
    onChange?.(next);
  }

  return (
    <span
      onClick={toggle}
      style={{
        width: 32,
        height: 18,
        borderRadius: 999,
        background: on ? 'var(--quiet)' : 'var(--ink-4)',
        position: 'relative',
        display: 'inline-block',
        flexShrink: 0,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: 'var(--paper)',
          position: 'absolute',
          top: 2,
          left: on ? 16 : 2,
          transition: 'left 0.15s',
        }}
      />
    </span>
  );
}
