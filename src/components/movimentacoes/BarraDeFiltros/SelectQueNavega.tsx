'use client';

import { useRouter } from 'next/navigation';
import styles from './BarraDeFiltros.module.css';

export interface OpcaoQueNavega {
  valor: string;
  rotulo: string;
  href: string;
  desabilitada?: boolean;
}

/**
 * Um `<select>` cujas opções são ENDEREÇOS.
 *
 * A URL continua sendo a fonte da verdade — cada opção já chega com o href
 * montado no servidor, preservando os outros filtros —, e o único JavaScript é
 * o que um `<select>` exige para navegar ao mudar.
 */
export function SelectQueNavega({
  rotulo,
  valor,
  opcoes,
}: {
  rotulo: string;
  valor: string;
  opcoes: readonly OpcaoQueNavega[];
}) {
  const router = useRouter();

  return (
    <label className={styles.select}>
      <span className={styles.selectRotulo}>{rotulo}</span>
      <select
        value={valor}
        onChange={evento => {
          const opcao = opcoes.find(o => o.valor === evento.target.value);
          if (opcao) router.push(opcao.href, { scroll: false });
        }}
      >
        {opcoes.map(opcao => (
          <option key={opcao.valor} value={opcao.valor} disabled={opcao.desabilitada}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}
