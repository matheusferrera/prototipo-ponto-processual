'use client';

import type { ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './AuthForm.module.css';

interface AuthFieldProps {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder: string;
  disabled?: boolean;
  /** string = mostra o texto do erro abaixo do campo; `true` = só destaca a borda. */
  error?: string | boolean;
  toggle?: { visible: boolean; onToggle: () => void };
  /** Ex.: link "Esqueceu a senha?" alinhado à direita do label. */
  labelRight?: ReactNode;
  /** Teclado do celular — `numeric` no número da OAB, que só aceita dígitos. */
  inputMode?: 'text' | 'numeric';
  /** Trava o tamanho no próprio campo (UF tem 2 letras), não só na validação. */
  maxLength?: number;
}

export function AuthField({
  id, label, type, autoComplete, value, onChange, onBlur, placeholder, disabled, error, toggle, labelRight,
  inputMode, maxLength,
}: AuthFieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>{label}</label>
        {labelRight}
      </div>
      <div className={styles.inputWrap}>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={inputMode}
          maxLength={maxLength}
          aria-invalid={!!error}
          className={`${styles.input}${error ? ` ${styles.inputError}` : ''}${toggle ? ` ${styles.inputWithToggle}` : ''}`}
        />
        {toggle && (
          <button
            type="button"
            onClick={toggle.onToggle}
            aria-label={toggle.visible ? 'Ocultar senha' : 'Mostrar senha'}
            className={styles.toggleBtn}
          >
            {toggle.visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {typeof error === 'string' && error && <span className={styles.fieldError}>{error}</span>}
    </div>
  );
}
