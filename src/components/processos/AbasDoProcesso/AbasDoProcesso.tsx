import Link from 'next/link';
import styles from './AbasDoProcesso.module.css';

export type AbaDoProcesso = 'movimentacoes' | 'ficha';

/**
 * AS DUAS PERGUNTAS da tela do processo — o que aconteceu × o que o processo é.
 *
 * | aba | URL | o que responde |
 * |---|---|---|
 * | **Movimentações** (padrão) | `/processos/<cnj>` | o prazo que corre, o que mudou o caso, a lista |
 * | **Ficha** | `?aba=ficha` | onde está, o mapa do caso no tempo, as peças que abrem |
 *
 * ## Por que a calha da direita virou aba
 *
 * A ficha morava numa coluna de 352px à direita, e isso tinha três
 * consequências que só apareceram com a tela em uso: no celular ela não era
 * calha nenhuma — as três seções caíam empilhadas ENTRE o prazo e a lista,
 * empurrando a primeira movimentação para baixo da dobra; no desktop ela comia
 * a largura de justamente a coluna que tem texto longo; e o mapa do ano, que é
 * uma grade de 53 colunas, ficava espremido em 352px. Numa aba, cada uma das
 * duas perguntas recebe a tela inteira. **Pedido do dono do produto em
 * 17/09/2026.**
 *
 * Server Component: cada aba é um `<Link>` que troca `?aba=`, como todo estado
 * desta tela. O voltar alterna, o endereço é compartilhável e nada custa
 * JavaScript. `scroll={false}` porque trocar de aba não é chegar numa página
 * nova — quem troca está olhando o cabeçalho, e ele não se move.
 */
export function AbasDoProcesso({ aba, href, movimentacoes }: {
  aba: AbaDoProcesso;
  href: (proxima: AbaDoProcesso) => string;
  /** Quantas movimentações o processo tem, no total — não o da página. */
  movimentacoes: number;
}) {
  const abas: { chave: AbaDoProcesso; rotulo: string; conta?: number }[] = [
    { chave: 'movimentacoes', rotulo: 'Movimentações', conta: movimentacoes },
    { chave: 'ficha', rotulo: 'Ficha do processo' },
  ];

  return (
    <nav className={styles.abas} aria-label="O que ver do processo">
      {abas.map(item => (
        <Link
          key={item.chave}
          href={href(item.chave)}
          scroll={false}
          className={styles.aba}
          aria-current={item.chave === aba ? 'page' : undefined}
        >
          {item.rotulo}
          {/* O número só aparece quando há o que contar: "Movimentações 0"
              ocuparia a largura para não dizer nada. `999+` porque o acervo tem
              processo de 4.900 — o valor exato dessa grandeza não é informação. */}
          {item.conta ? (
            <span className={styles.conta}>
              {item.conta > 999 ? '999+' : item.conta}
              <span className="sr-only"> movimentações</span>
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
