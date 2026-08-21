import styles from './Varredura.module.css';

/* Siglas reais, para o varrimento parecer o que é: uma consulta nacional.
   Mesma lista de `/oab/[slug]/loading.tsx` — quem veio da consulta pública
   reconhece a tela e entende que é o mesmo trabalho continuando. */
const SIGLAS = [
  'TJDFT', 'TRF1', 'STJ', 'TJSP', 'TRT10', 'TJMG', 'TJRJ', 'TJBA',
  'TJPI', 'TJGO', 'TJRN', 'TRF3', 'TJAM', 'TJMS', 'TJPR', 'TJRS',
];

/**
 * O scanner da espera.
 *
 * Por padrão as siglas são **decorativas**: nenhuma delas afirma ter
 * resultado. Quando a varredura já devolveu processos, as siglas onde eles
 * apareceram entram na lista e acendem (`siglaAchada`) — aí, e só aí, a
 * animação passa a afirmar um fato.
 */
export function ScannerTribunais({ achados = [] }: { achados?: string[] }) {
  /* Os achados vão para o começo: é o que a pessoa quer ver, e a trilha rola
     de cima para baixo. O resto completa até ter volume suficiente para o
     laço não parecer uma lista de três itens. */
  const lista = [...achados, ...SIGLAS.filter(s => !achados.includes(s))];
  const achadosSet = new Set(achados);

  return (
    <div className={styles.scanner} aria-hidden="true">
      <div className={styles.trilha}>
        {/* Duas voltas da mesma lista: a segunda entra por baixo enquanto a
            primeira sai por cima, o que faz o laço não ter emenda visível. */}
        {[...lista, ...lista].map((sigla, i) => (
          <span
            key={`${sigla}-${i}`}
            className={`${styles.sigla}${achadosSet.has(sigla) ? ` ${styles.siglaAchada}` : ''}`}
          >
            {sigla}
          </span>
        ))}
      </div>
      <span className={styles.linha} />
    </div>
  );
}
