import type { MovimentacaoDetail } from '@/lib/api.server';
import { cabecalhoDoAto } from '../CardDoAto/identidade';
import { AcoesDoDocumento } from '../AcoesDoDocumento/AcoesDoDocumento';
import { CorpoDoCard } from '../CorpoDoCard/CorpoDoCard';
import styles from './PainelDoAto.module.css';

/**
 * O ATO AO LADO DA LISTA — a aba Novas a partir de 1200px.
 *
 * Com a largura do desktop, cobrir a lista com um card para ler um ato de cada
 * vez desperdiça a tela: a lista fica à esquerda e o ato escolhido aqui,
 * trocado por `?ato=` (ver `LinkDoAto`). O corpo é o MESMO do card
 * (`CorpoDoCard`) e a barra usa o mesmo cabeçalho (`cabecalhoDoAto`) — uma
 * movimentação tem uma aparência só, venha de onde vier.
 *
 * Abaixo de 1200px o painel não existe (CSS), e o clique abre o card.
 */
export function PainelDoAto({ mov }: { mov: MovimentacaoDetail | null }) {
  if (!mov) {
    return (
      <aside className={styles.painel} aria-label="Ato selecionado">
        <p className={styles.vazio}>Escolha uma movimentação para ver o que ela pede.</p>
      </aside>
    );
  }

  const { tipo, onde } = cabecalhoDoAto(mov);

  return (
    <aside className={styles.painel} aria-labelledby="painel-do-ato">
      <div className={styles.barra}>
        <div className={styles.identidade}>
          <h2 id="painel-do-ato" className={styles.tipo}>{tipo}</h2>
          <p className={styles.onde}>{onde}</p>
        </div>
        <AcoesDoDocumento mov={mov} />
      </div>
      <div className={styles.corpo}>
        <CorpoDoCard mov={mov} />
      </div>
    </aside>
  );
}
