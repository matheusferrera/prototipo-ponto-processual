'use client';

import { useSyncExternalStore } from 'react';
import styles from './CorpoDoCard.module.css';

const ouvintes = new Set<() => void>();

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  window.addEventListener('storage', avisar);
  return () => {
    ouvintes.delete(avisar);
    window.removeEventListener('storage', avisar);
  };
}

function ler(chave: string): string {
  try {
    return window.localStorage.getItem(chave) ?? '[]';
  } catch {
    return '[]';
  }
}

function marcadosDe(bruto: string): string[] {
  try {
    const valor = JSON.parse(bruto);
    return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * A LISTA DE CONFERÊNCIA do ato — com caixas que marcam.
 *
 * Até 17/09/2026 as caixas eram desenho, e a razão estava escrita: "um checkbox
 * que esquece o que foi marcado é pior que nenhum". Por isso agora ele não
 * esquece — **guarda neste aparelho** (`localStorage`, por ato), e a tela diz
 * isso em vez de deixar a pessoa supor que a marcação viaja com a conta.
 *
 * `useSyncExternalStore` e não estado + efeito: o servidor desenha tudo
 * desmarcado, o navegador lê o que foi guardado, e duas abas do mesmo ato
 * ficam em acordo pelo evento `storage`.
 */
export function ChecklistDoAto({ atoId, itens }: { atoId: string; itens: readonly string[] }) {
  const chave = `ponto:checklist:${atoId}`;
  const marcados = marcadosDe(useSyncExternalStore(assinar, () => ler(chave), () => '[]'));

  function alternar(item: string) {
    const proximos = marcados.includes(item) ? marcados.filter(m => m !== item) : [...marcados, item];
    try {
      window.localStorage.setItem(chave, JSON.stringify(proximos));
    } catch {
      return;
    }
    ouvintes.forEach(avisar => avisar());
  }

  return (
    <div className={styles.checklist}>
      <ul className={styles.checklistLista}>
        {itens.map(item => (
          <li key={item}>
            <label className={styles.checklistItem}>
              <input type="checkbox" checked={marcados.includes(item)} onChange={() => alternar(item)} />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className={styles.checklistNota}>As marcações ficam só neste aparelho.</p>
    </div>
  );
}
