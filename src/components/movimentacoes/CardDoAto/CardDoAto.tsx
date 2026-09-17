'use client';

import { useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@base-ui/react/dialog';
import { ArrowLeft } from 'lucide-react';
import styles from './CardDoAto.module.css';

/**
 * O ATO COMO CARD — em cima da lista, não dentro dela.
 *
 * ## O que ele substitui, e por quê
 *
 * Até 15/09/2026 abrir uma movimentação expandia a linha no lugar
 * (`?aberta=<id>`). Aquilo tinha três defeitos que só o uso mostra:
 *
 *  - **duas coisas na mesma superfície.** A lista continuava debaixo do painel,
 *    com o filete, a marca de não vista e o cabeçalho de dia grudado no topo —
 *    tudo de outro contexto;
 *  - **a lista saltava.** Abrir empurrava tudo para baixo; fechar puxava de
 *    volta. Quem abria a terceira linha perdia onde estava. O ato do diário tem
 *    **8 KB de média** e 151 KB no maior deste acervo: a 390px isso são
 *    centenas de pixels de deslocamento;
 *  - **não cabia o que importa.** A cadeia de contagem do prazo —
 *    disponibilização, publicação, início, vencimento — nunca entrou, porque o
 *    painel já estava alto demais. E é ela o único ganho de CONTEÚDO desta
 *    mudança: tela cheia por si só não resolve nada, `/movimentacoes/{id}` já
 *    era tela cheia.
 *
 * ## É uma ROTA, não um estado de cliente
 *
 * `app/movimentacoes/@card/(.)[id]` intercepta a navegação da lista para o ato.
 * A consequência é que a URL é **a do ato** — o mesmo endereço que se manda
 * para um colega e que, aberto direto ou depois de um F5, renderiza a página
 * inteira sem lista atrás. O `?aberta=` morreu junto, e foi uma boa morte: ele
 * só valia para uma linha DAQUELA página com AQUELE filtro, e o mesmo link
 * aberto de outro recorte não abria nada.
 *
 * `router.back()` fecha porque quem abriu o card foi uma navegação. Voltar
 * devolve a lista com o filtro, a página e o **ponto de rolagem** exatos — ela
 * nunca saiu do DOM.
 *
 * ## O custo, declarado
 *
 * O painel de hoje não usa uma linha de JavaScript. Este card usa: véu, `Esc`,
 * armadilha de foco e devolução do foco à linha ao fechar. Nada disso é
 * escrito à mão — vem do `Dialog` do Base UI, que o projeto já carrega para o
 * drawer do menu. O conteúdo continua sendo Server Component: ele chega por
 * `children`, renderizado no servidor.
 */
export function CardDoAto({
  titulo,
  tipo,
  onde,
  children,
  acoes,
  fecharPara,
}: {
  /** O nome acessível do diálogo. Não é exibido: a barra já diz o tipo. */
  titulo: string;
  /** "Acórdão" — o título da barra. */
  tipo: string;
  /** "STJ · Segunda Seção · disponibilizado hoje" — ver `cabecalhoDoAto`. */
  onde: string;
  children: ReactNode;
  /**
   * A barra grudada do rodapé — os DOCUMENTOS do ato desde 17/09/2026. Os
   * verbos do prazo ("Protocolei", "Lembrar") subiram para o bloco da situação,
   * no topo do corpo, junto do prazo a que se referem.
   */
  acoes?: ReactNode;
  /**
   * Para onde o voltar leva quando o card NÃO foi aberto por navegação — o caso
   * do link compartilhado, do favorito e do F5.
   *
   * Sem isto, `router.back()` num card aberto direto sairia do produto (a
   * entrada anterior do histórico é de onde a pessoa veio, que pode ser o
   * e-mail em que recebeu o link). Com `href`, o voltar vira um destino.
   */
  fecharPara?: string;
}) {
  const router = useRouter();
  const painel = useRef<HTMLDivElement>(null);

  return (
    <Dialog.Root
      open
      /**
       * `trap-focus` em vez do modal cheio, e a razão é MEDIDA.
       *
       * O modal padrão do Base UI trava a rolagem da página, e travar rolagem
       * é aplicar `overflow: hidden` — o que **zera o `scrollTop` de todo
       * container rolável**, sem restaurá-lo depois. O feed rola numa área
       * própria (`.scrollArea`), então abrir o card mandava a lista de volta
       * ao topo: conferido em 15/09/2026 com a lista em 500px de rolagem, ela
       * voltava a 0 no instante em que o card montava.
       *
       * Isso destruiria exatamente a razão de o card existir. O painel antigo
       * fazia a lista saltar ao expandir; um card que a manda para o topo é a
       * mesma perda com outra roupa.
       *
       * `trap-focus` mantém o que importa — foco preso, `Esc`, o resto da
       * página inerte — e não toca em rolagem. O que se perde é a página de
       * trás não rolar com a roda do mouse por cima do véu: no celular o card
       * ocupa tudo e a questão não existe, e no desktop rolar a lista que está
       * apagada atrás do véu não é um gesto que alguém faça de propósito.
       */
      modal="trap-focus"
      /* `onOpenChange(false)` cobre as três saídas de uma vez — o ×, o `Esc` e
         o clique no véu —, e todas as três fazem a mesma coisa: desfazer a
         navegação que abriu o card. */
      onOpenChange={aberto => {
        if (aberto) return;
        /* Interceptado: `back()` desfaz a navegação que abriu o card e devolve
           a lista com filtro, página e rolagem exatos. Autônomo: não há
           navegação a desfazer — vai para o destino declarado. */
        if (fecharPara) router.push(fecharPara); else router.back();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.veu} />
        <Dialog.Popup
          ref={painel}
          className={styles.card}
          aria-label={titulo}
          /**
           * O FOCO VAI PARA O PAINEL, não para o botão de fechar — e isso é
           * uma correção, não estilo.
           *
           * O padrão do Base UI é focar o primeiro focável de dentro, que aqui
           * é o ×. E `focus()` sem `preventScroll` faz o navegador rolar os
           * containers para trazer o elemento à vista — **zerando o
           * `scrollTop` do feed**. Medido em 15/09/2026: a lista em 500px de
           * rolagem voltava a 0 no instante em que o card montava, e o
           * navegador não a devolve ao fechar.
           *
           * Isso destruiria a razão de o card existir. O painel é
           * `position: fixed` e já tem `tabindex="-1"`: focá-lo não move
           * rolagem nenhuma, e ainda é o que o leitor de tela espera — ele
           * anuncia o rótulo do diálogo antes de qualquer controle.
           */
          initialFocus={painel}
        >

          {/* A BARRA: voltar à esquerda, o tipo do ato e onde ele saiu.
              O chip do vencimento que morava aqui saiu em 17/09/2026: ele
              existia porque o prazo caía abaixo da dobra, e o prazo agora é a
              primeira coisa do corpo. */}
          <header className={styles.barra}>
            <Dialog.Close className={styles.fechar} aria-label="Voltar">
              <ArrowLeft size={22} aria-hidden="true" />
            </Dialog.Close>
            <span className={styles.identidade}>
              <Dialog.Title className={styles.tipo}>{tipo}</Dialog.Title>
              <span className={styles.onde}>{onde}</span>
            </span>
          </header>

          {/* A rolagem é DESTE painel, não da página: o corpo da página está
              travado enquanto o card está aberto (o Base UI cuida disso), e
              sem uma área rolável própria o conteúdo longo ficaria inalcançável
              no celular. */}
          <div className={styles.corpo}>{children}</div>

          {acoes && <div className={styles.rodape}>{acoes}</div>}

        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
