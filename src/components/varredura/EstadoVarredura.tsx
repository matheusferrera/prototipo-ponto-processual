'use client';

import { useEffect, useState } from 'react';
import styles from './Varredura.module.css';

/**
 * A linha de estado da busca do onboarding.
 *
 * Aqui não há job para consultar: `GET /scraper/preview-djen` é uma requisição
 * síncrona, e o único fato que temos enquanto ela não volta é **há quanto
 * tempo** estamos esperando. Então é isso que a linha diz. Uma barra de
 * progresso inventada preencheria o mesmo espaço e mentiria; o custo dela
 * aparece exatamente no caso ruim, quando trava em 90% e a pessoa entende que
 * o número nunca significou nada.
 *
 * O que a espera longa precisa comunicar é uma coisa só: **não está travado, e
 * você não precisa recarregar** — recarregar é justamente o que faz a pessoa
 * perder a consulta e recomeçar do zero.
 */
export function EstadoVarredura({ lentoAposMs = 9000 }: { lentoAposMs?: number }) {
  const [lento, setLento] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLento(true), lentoAposMs);
    return () => clearTimeout(t);
  }, [lentoAposMs]);

  if (lento) {
    return (
      <p className={`${styles.estado} ${styles.estadoLongo}`} role="status">
        O diário está respondendo devagar agora. Seguimos esperando — não precisa recarregar.
      </p>
    );
  }

  return (
    <p className={styles.estado} role="status">
      Varrendo os tribunais
      <span className={styles.reticencias} aria-hidden="true" />
    </p>
  );
}
