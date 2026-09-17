import Link from 'next/link';
import type { Movimentacao } from '@/types';
import { colapsavelNaLista } from '@/lib/fio-do-prazo';
import { clienteMovimentacao, descricaoMovimentacao, horaDoAto, resumoMovimentacao, semHoraMotivo } from '@/lib/movimentacao';
import { nomeLegivel } from '@/lib/processo-apresentacao';
import { situacaoDaLinha } from '@/lib/situacao-do-ato';
import { DocumentoDaLinha } from '../DocumentoDaLinha/DocumentoDaLinha';
import { Etiqueta } from '../Etiqueta/Etiqueta';
import styles from './ListaCompleta.module.css';

/**
 * Uma movimentação na lista de TODAS.
 *
 * **O que ela responde, nesta ordem:** que tipo de ato é, o que aconteceu, de
 * quem é o caso e — a pergunta que a linha antiga deixava para a pessoa
 * deduzir — **se é com você** (`situacaoDaLinha`).
 *
 * O mesmo DOM serve às duas larguras: empilhado no celular, colunas a partir
 * de 1024px — hora · tipo (com a etiqueta de situação embaixo) · tribunal ·
 * parte (com o número do processo embaixo) · o que aconteceu, na ordem pedida
 * pelo dono do produto em 17/09/2026: quem varre a lista procura o caso antes
 * de ler o ato, e o texto é a coluna que cresce. `display: contents` no
 * cabeçalho e no rodapé é o que devolve cada pedaço à sua célula. Sem hooks, para servir à página (servidor) e ao "carregar
 * dias anteriores" (cliente).
 *
 * > **Não é `MovimentacaoRow`**, e o desvio é deliberado: aquela linha continua
 * > sendo a do painel, da timeline do processo e do fio. Esta é a gramática da
 * > tela de movimentações de 17/09/2026 — tipo em cima, etiqueta de situação
 * > embaixo, sem faixa de prazo — e trocá-la lá mudaria três telas que não
 * > entraram no desenho.
 */
export function LinhaDaLista({ m }: { m: Movimentacao }) {
  const cartorio = colapsavelNaLista(m);
  const situacao = situacaoDaLinha(m);

  return (
    <li className={styles.linha}>
      {/* A ORDEM DO DOM é a das colunas do desktop até onde dá — tipo,
          tribunal, e só então o texto: no celular o tribunal divide a linha de
          cima com o tipo, e a parte desce para junto da etiqueta. */}
      <span className={styles.cabeca}>
        {/* A HORA em toda linha. Sem hora na fonte (o ato do diário), vale
            00:00 — decisão do dono do produto em 17/09/2026; o motivo fica no
            `title` para quem passar o mouse. */}
        <span className={styles.hora} title={m.time ? undefined : semHoraMotivo(m)}>{horaDoAto(m)}</span>
        <span className={styles.tipo} title={cartorio ? undefined : m.tipo}>{cartorio ? 'Cartório' : m.tipo}</span>
      </span>
      <span className={styles.trib}>{m.tribunal}</span>
      <Link href={`/movimentacoes/${encodeURIComponent(m.id)}`} className={styles.texto}>
        {cartorio ? descricaoMovimentacao(m) : resumoMovimentacao(m)}
      </Link>
      <span className={styles.rodape}>
        <span className={styles.parte} title={clienteMovimentacao(m)}>{nomeLegivel(clienteMovimentacao(m))}</span>
        {/* O NÚMERO embaixo da parte, menor: é o que se copia, não o que se lê. */}
        {m.cnj !== '—' && <span className={styles.cnj}>{m.cnj}</span>}
        {/* No desktop a etiqueta sobe para baixo do TIPO — pedido do dono do
            produto em 17/09/2026: a coluna própria roubava largura do texto. */}
        <span className={styles.situacao}>
          {situacao && <Etiqueta rotulo={situacao.rotulo} curto={situacao.curto} tom={situacao.tom} />}
        </span>
      </span>
      <span className={styles.doc}><DocumentoDaLinha m={m} /></span>
    </li>
  );
}
