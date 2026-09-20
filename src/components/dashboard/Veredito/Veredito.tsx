import { ChevronDown } from 'lucide-react';
import type { VereditoDaTriagem } from '@/lib/triagem';
import styles from './Veredito.module.css';

export function Veredito({ itens }: { itens: VereditoDaTriagem[] }) {
  return (
    <section className={styles.raiz} aria-labelledby="titulo-veredito">
      <div className={styles.cabecalho}>
        <p>Resumo da pauta</p>
        <h1 id="titulo-veredito">O que pede atenção agora</h1>
      </div>
      <ul>
        {itens.map(item => (
          <li key={item.href} data-tom={item.tom}>
            <a href={item.href}>
              <span className={styles.numero}>{item.quantidade}</span>
              <strong>{item.rotulo}</strong>
              <ChevronDown aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
