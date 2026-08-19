'use client';

import { useState } from 'react';
import styles from './CustoRonda.module.css';

const DIAS_UTEIS_MES = 22;

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

function formatarHoras(horas: number) {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Calculadora do custo da ronda manual.
 *
 * Quantificar a dor faz o leitor parar e mexer — é o elemento de maior tempo
 * de permanência da página. Os dois controles são estimativas do próprio
 * visitante de propósito: número que ele mesmo escolheu é número em que ele
 * acredita.
 */
export function CustoRonda() {
  const [minutos, setMinutos] = useState(40);
  const [valorHora, setValorHora] = useState(250);

  const horasMes = (minutos * DIAS_UTEIS_MES) / 60;
  const custoMes = horasMes * valorHora;

  return (
    <div className={styles.wrap}>
      <div className={styles.controles}>
        <label className={styles.controle}>
          <span className={styles.controleLabel}>
            Minutos por dia abrindo sistema de tribunal
            <strong className={styles.controleValor}>{minutos} min</strong>
          </span>
          <input
            type="range"
            className={styles.range}
            min={10}
            max={120}
            step={5}
            value={minutos}
            onChange={e => setMinutos(Number(e.target.value))}
          />
        </label>

        <label className={styles.controle}>
          <span className={styles.controleLabel}>
            Quanto vale a sua hora
            <strong className={styles.controleValor}>{brl.format(valorHora)}</strong>
          </span>
          <input
            type="range"
            className={styles.range}
            min={50}
            max={1000}
            step={25}
            value={valorHora}
            onChange={e => setValorHora(Number(e.target.value))}
          />
        </label>
      </div>

      <div className={styles.saida}>
        <div className={styles.saidaItem}>
          <span className={styles.saidaNumero}>{formatarHoras(horasMes)}</span>
          <span className={styles.saidaLabel}>por mês na ronda</span>
        </div>
        <div className={styles.saidaDivisor} aria-hidden="true" />
        <div className={styles.saidaItem}>
          <span className={styles.saidaNumero}>{brl.format(custoMes)}</span>
          <span className={styles.saidaLabel}>que você não faturou</span>
        </div>
      </div>

      <p className={styles.rodape}>
        Isso é login, token e Ctrl+C. Não entra em nenhuma hora faturável.
        <br />
        E o tribunal continua publicando nas horas em que ninguém está olhando.
      </p>
    </div>
  );
}
