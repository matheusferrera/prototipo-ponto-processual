'use client';

import { useEffect, useId, useRef, useState } from 'react';
import styles from './PageHeader.module.css';

interface SearchControlProps {
  basePath: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchValue?: string;
  /** params atuais (exceto q e page) preservados no submit */
  preservedParams?: [string, string][];
}

export function SearchControl({
  basePath,
  searchLabel,
  searchPlaceholder,
  searchValue = '',
  preservedParams = [],
}: SearchControlProps) {
  // já começa aberto quando há uma busca ativa
  const [open, setOpen] = useState(Boolean(searchValue));
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        className={styles.iconControl}
        aria-label={searchLabel}
        aria-expanded={false}
        title={searchLabel}
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
        <span className="sr-only">{searchLabel}</span>
      </button>
    );
  }

  return (
    <form className={`${styles.search} ${styles.searchOpen}`} role="search" method="get" action={basePath} data-search-open>
      <label className="sr-only" htmlFor={inputId}>{searchLabel}</label>
      <button type="submit" className={styles.searchSubmit} aria-label={searchLabel}>
        <SearchIcon />
      </button>
      <input
        ref={inputRef}
        id={inputId}
        name="q"
        type="search"
        defaultValue={searchValue}
        placeholder={searchPlaceholder}
        aria-label={searchLabel}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
        }}
        onBlur={e => {
          // recolhe ao sair se o campo estiver vazio
          if (e.currentTarget.value.trim() === '') setOpen(false);
        }}
      />
      {preservedParams.map(([key, value]) => (
        <input key={key} type="hidden" name={key} defaultValue={value} />
      ))}
    </form>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
