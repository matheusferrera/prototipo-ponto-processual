import styles from './loading.module.css';

/* Siglas reais, para o varrimento parecer o que é: uma consulta nacional.
   Puramente decorativas — nenhuma delas afirma ter resultado. */
const SIGLAS = [
  'TJDFT', 'TRF1', 'STJ', 'TJSP', 'TRT10', 'TJMG', 'TJRJ', 'TJBA',
  'TJPI', 'TJGO', 'TJRN', 'TRF3', 'TJAM', 'TJMS', 'TJPR', 'TJRS',
];

/**
 * Estado de carregamento da consulta por OAB.
 *
 * O DJEN leva de centenas de milissegundos a alguns segundos, e essa espera é
 * o primeiro contato do visitante com o produto — então ela mostra o trabalho
 * sendo feito (varredura nacional) em vez de um spinner.
 *
 * `loading.tsx` não recebe `params`, então nada aqui é específico da OAB.
 * Tudo é CSS: sem JS, sem timers, nada que possa dessincronizar do Suspense.
 */
export default function Carregando() {
  return (
    <main className={styles.palco} aria-busy="true">
      <div className={styles.centro}>
        <p className={styles.eyebrow}>Diário de Justiça Eletrônico Nacional</p>

        <div className={styles.scanner} aria-hidden="true">
          <div className={styles.trilha}>
            {/* Duas voltas da mesma lista: a segunda entra por baixo enquanto a
                primeira sai por cima, o que faz o laço não ter emenda visível. */}
            {[...SIGLAS, ...SIGLAS].map((sigla, i) => (
              <span key={i} className={styles.sigla}>
                {sigla}
              </span>
            ))}
          </div>
          <span className={styles.linha} />
        </div>

        <p className={styles.status} role="status">
          Varrendo os tribunais<span className={styles.reticencias} aria-hidden="true" />
        </p>
        <p className={styles.micro}>
          Consulta em base pública, janela de seis meses. Não pedimos senha de tribunal.
        </p>
      </div>
    </main>
  );
}
