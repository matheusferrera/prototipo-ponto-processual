import type { ReactNode } from 'react';
import Link from 'next/link';
import { Clock3, FileText, Lock } from 'lucide-react';
import type { Movimentacao } from '@/types';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { DocumentoLink } from '../DocumentoLink/DocumentoLink';
import { FaixaDoPrazo } from '../FaixaDoPrazo/FaixaDoPrazo';
import { faixaDoPrazo } from '@/lib/fio-do-prazo';
import { categoriaCurta } from '@/lib/categoria-movimentacao';
import {
  clienteMovimentacao,
  resumoMovimentacao,
  vencimentoDoAto,
} from '@/lib/movimentacao';
import styles from './MovimentacaoRow.module.css';

/**
 * Uma movimentação como LINHA — a mesma em todo o produto.
 *
 * Existia em três implementações diferentes do mesmo objeto: o feed
 * (`PageContent`, 140px por linha, cartão com borda), o painel (JSX com estilo
 * inline dentro de `painel/page.tsx`, 48px) e a pauta de prazos. A do painel
 * era a mais legível e a mais barata, e era a que não tinha componente.
 *
 * A gramática é a de `ProcessList`: corpo e prazo à esquerda, identificação
 * numa calha à direita, filete embaixo, sem caixa. Duas telas com a mesma
 * gramática valem mais que duas telas com o ótimo local de cada uma.
 *
 * ### O que a linha responde, nesta ordem
 *
 * 1. **o que aconteceu** — o título, porque o eixo desta lista é o ato;
 * 2. **de quem** — o cliente, na segunda linha;
 * 3. **até quando** — o aviso de prazo, acima do título, quando existe.
 *
 * ### "Nova" é opt-in, e o padrão é não mostrar
 *
 * O selo e o fundo tingido saíram do feed e da linha do tempo do processo. Nos
 * dois lugares a marca era ruído: no feed, `atoRecemPublicado` acende TODA a
 * linha do dia mais recente — cinco de cinco, na primeira tela; na timeline do
 * processo o critério era `detectedAt` dentro de 48 h, ou seja, quando NÓS
 * capturamos, não quando o ato aconteceu — e como o acervo é varrido de uma
 * vez, 50 de 50 linhas vinham verdes, movimentação de 2020 inclusive. É o que
 * o comentário de `.nova` no CSS já dizia: vinte molduras verdes empilhadas
 * deixam de significar "novo" e passam a significar "lista".
 *
 * Onde a novidade É a pergunta da tela — o painel, que existe para dizer o que
 * mudou —, `selo` a liga de volta.
 *
 * Até 06/09/2026 a ordem era outra: o cliente era o maior texto (15px/700) e o
 * ato vinha em 13px cinza. Num feed cronológico o cliente é o endereço e o ato
 * é a notícia — e como metade das linhas de um acervo repete "Juntada de
 * petição", o que diferencia uma da outra estava justamente no tipo menor.
 */
export interface MovimentacaoRowProps {
  m: Movimentacao;
  /**
   * `compacta` (painel): uma linha, sem resumo nem providência.
   * `confortavel` (feed): duas linhas, com o resumo e a providência do
   * destinatário.
   */
  densidade?: 'compacta' | 'confortavel';
  /** Mostra a hora do ato à esquerda. O DJEN publica em data, não em hora. */
  comHora?: boolean;
  /**
   * Mostra também o DIA, acima da hora — `hoje` · `ontem` · `27 ago`.
   *
   * Só quem não tem cabeçalho de dia precisa disto. O feed agrupa as linhas sob
   * `DateGroupHeader` e a timeline do processo também; o FIO não agrupa (ele é
   * uma janela só, do ato que abriu até hoje), e ali uma linha marcada apenas
   * "16:08" não responde quando aconteceu — que é a pergunta da tela.
   */
  comData?: boolean;
  /**
   * Para onde a linha leva. O padrão é a página do ato; o feed passa
   * `?aberta=<id>` para abrir no lugar — e, quando já está aberta, o href que
   * fecha. **Continua sendo um link**, então o botão voltar fecha o painel, o
   * endereço é compartilhável e nada disso custa JavaScript.
   */
  href?: string;
  /**
   * A leitura do ato, renderizada abaixo da linha. Quando presente, a linha se
   * declara expandida.
   *
   * Fica FORA da âncora de propósito: o painel tem links e um `<details>`, e
   * conteúdo interativo dentro de `<a>` é HTML inválido — o navegador desfaz a
   * árvore e o clique passa a cair no lugar errado.
   */
  painel?: ReactNode;
  /** No processo, a identificação da capa já está visível. */
  noProcesso?: boolean;
  /** Expansão local para listas que acumulam páginas no navegador. */
  onToggle?: () => void;
  /**
   * Mostra o selo "Nova" quando `state: 'signal'`. **Desligado por padrão** —
   * ver o comentário do componente.
   */
  selo?: boolean;
  /**
   * No FIO, o prazo é o cabeçalho da tela — repetir "contestação" em cada uma
   * das linhas seria escrever a mesma palavra cinco vezes na mesma tela.
   */
  semNomeDoPrazo?: boolean;
}

/** O que cada estado da peça quer dizer — o texto que o leitor de tela ouve. */
const DOC_TITULO: Record<string, string> = {
  nenhum: 'Sem documento anexado',
  disponivel: 'Documento disponível para abrir',
  provavelIndisponivel: 'O portal cita um documento, mas já respondeu que não o serve',
  trancado: 'Documento pendente de liberação pelo tribunal',
};

export function MovimentacaoRow({
  m, densidade = 'confortavel', comHora = false, comData = false, href, painel, noProcesso = false, onToggle, selo = false,
  semNomeDoPrazo = false,
}: MovimentacaoRowProps) {
  const compacta = densidade === 'compacta';
  const cliente = clienteMovimentacao(m);
  const resumo = resumoMovimentacao(m);
  const categoria = categoriaCurta(m.categoria);
  const vencimento = vencimentoDoAto(m);
  // O estado da PEÇA, que é outro fato — ver `Movimentacao.documentoEstado`.
  const doc = m.documentoEstado ?? 'nenhum';

  /**
   * O CHIP É A SEGUNDA VIA DA FAIXA, não o par dela.
   *
   * No ato que abre prazo os dois diziam o mesmo: "Prazo 7 out · vence em 22
   * dias" no topo e "Abriu este prazo … faltam 22 dias" embaixo. A faixa é a
   * que sobrevive — ela nomeia a peça, desenha a régua e agora traz a data.
   *
   * **Mas o chip não pôde simplesmente sair**, e a razão é de dado: a faixa
   * nasce de `prazoEmCurso`, que o backend monta com `deadline.fechado: false`
   * (`prazosEmCursoPorProcesso`). Prazo ENCERRADO — cumprido, ou expirado e
   * recolhido por `fecharPrazosDjenExpirados` — não produz faixa nenhuma,
   * enquanto `m.prazo` continua lá. Sem esta guarda, o ato que cobrou algo e
   * teve o prazo fechado perderia a única marca de que cobrou, que é o que
   * `vencimentoDoAto` já anota: esconder faz o ato parecer que nunca pediu
   * nada. Mesma história na densidade `compacta`, que não desenha faixa.
   *
   * Medido no feed (50 linhas, todas as categorias): 4 com chip, 6 com faixa,
   * 4 com as duas e **zero só com chip** — a guarda quase nunca acende, e é
   * exatamente por isso que ela é barata.
   */
  const temFaixa = !compacta && Boolean(faixaDoPrazo({ prazoEmCurso: m.prazoEmCurso, categoria: m.categoria }));

  const aberta = Boolean(painel);
  const idPainel = `ato-${m.id}`;
  const idTitulo = `ato-titulo-${m.id}`;

  const classeLinha = `${styles.row} ${noProcesso ? styles.noProcesso : ''} ${compacta ? styles.compacta : ''} ${aberta ? styles.aberta : ''}`;
  const conteudo = (
    <>
      {comHora && (
        <span className={styles.hora} aria-hidden={m.time || (comData && m.quandoCurto) ? undefined : true}>
          {comData && m.quandoCurto && <span className={styles.dia}>{m.quandoCurto}</span>}
          {m.time ?? ''}
        </span>
      )}

      <span className={styles.corpo}>
        {vencimento && !temFaixa && (
          <span
            className={`${styles.prazo} ${
              // Encerrado nunca pinta de urgência: a cor é o que chama a
              // atenção, e chamar atenção para o que já acabou é ruído em cima
              // do que ainda corre.
              vencimento.encerrado ? styles.prazoEncerrado :
              vencimento.emDias <= 7 ? styles.prazoVencido :
              vencimento.emDias <= 14 ? styles.prazoUrgente : styles.prazoCalmo
            }`}
            title={`${vencimento.quando}${vencimento.dias ? ` · prazo de ${vencimento.dias}` : ''}${
              vencimento.estimado ? ' · data calculada, não publicada pelo tribunal' : ''
            }`}
          >
            <Clock3 size={14} aria-hidden="true" />
            <span>{vencimento.encerrado ? 'Encerrado' : 'Prazo'}</span>
            {/* "≈" quando a data é cálculo nosso. Em `--ink-2`, não no
                `--ink-4` de antes: medido, `--ink-4` dá 2,3:1 — o caractere
                que impede uma estimativa de passar por vencimento oficial era
                o menos visível da linha. */}
            {vencimento.estimado && <span className={styles.estimado}>≈</span>}
            {vencimento.curto}
            {/* A string certa é `quando` ("vence em 3 dias"). A linha mostrava
                `dias`, que é o TAMANHO do prazo ("15 dias") — lido embaixo de
                "VENCE 24 set", dizia "faltam 15 dias". Errava tarde, no campo
                em que errar tarde custa o prazo. */}
            {/* Encerrado já se diz no rótulo; repetir em `quando` seria
                "Encerrado … Encerrado". */}
            {!vencimento.encerrado && <span className={styles.quando}>{vencimento.quando}</span>}
          </span>
        )}
        <span className={styles.ato} title={resumo}>{resumo}</span>

        {!noProcesso && (
          <span className={styles.linha2}>
            <span className={styles.cliente} title={cliente}>{cliente}</span>
            {m.orgaoJulgador && m.orgaoJulgador !== '—' && (
              <span className={styles.orgao} title={m.orgaoJulgador}>{m.orgaoJulgador}</span>
            )}
            {/* NÚMERO E TRIBUNAL FECHAM A LINHA — ver `.linha2` no CSS. Os dois
                moravam na calha da direita e eram eles que fixavam a largura
                dela (24 dígitos em mono), estreitando o resumo do ato em toda
                linha da lista. */}
            {!compacta && <span className={styles.cnj}>{m.cnj}</span>}
            <span className={styles.trib}><TribTag label={m.tribunal} /></span>
          </span>
        )}

        {/* ── O ELO COM O PRAZO QUE CORRE ────────────────────────────────
            Que prazo esta movimentação toca, e quanto dele já passou. É a
            única coisa na linha que responde "no decorrer do prazo" — ver
            `FaixaDoPrazo`. Só aparece em processo com prazo aberto: 11 dos 180
            medidos.

            **Fora da linha COMPACTA de propósito.** Aquela linha tem 48px e
            uma linha de texto; a faixa dobraria a altura do painel e da pauta,
            que são justamente as telas onde o prazo já é o eixo e o chip já o
            diz.

            **E ela é o ÚLTIMO bloco do corpo desde 15/09/2026.** Embaixo dela
            vinha a providência do destinatário (`acaoMovimentacao`), um
            parágrafo livre de três ou quatro linhas que explicava o prazo pela
            terceira vez na mesma linha: o chip já dá a data, a faixa já nomeia
            a peça e o que falta. Era o bloco mais alto da lista, e repetia. A
            providência continua inteira onde ela é a pergunta da tela —
            `ProvidenciaDoAto`, na página do ato, no painel expandido e na
            pauta de prazos. */}
        {!compacta && (
          <FaixaDoPrazo prazoEmCurso={m.prazoEmCurso} categoria={m.categoria} semNome={semNomeDoPrazo} />
        )}
      </span>

      <span className={styles.calha}>

        <span className={styles.ident}>
          {/* O TIPO DO ATO, e só ele — uma etiqueta, com a peça do lado. Decisão,
              cartório, petição é o que classifica a linha, e é o mesmo eixo da
              faixa de filtros do topo da página. Identificação (número,
              tribunal) desceu para a linha da parte; a procedência
              (diário × portal) saiu da lista e continua na ficha do ato, em
              "Origem" e "Confirmado por".

              O chevron saiu daqui em 15/09/2026: ele aparecia em TODA linha,
              aberta ou fechada, e era a única coisa que a calha tinha a dizer
              nas 29 de 50 linhas sem tipo. Quem diz que a linha está aberta
              continua dizendo — o fundo tingido do item e o peso do título. */}
          {categoria && <span className={styles.categoria}>{categoria}</span>}
          {selo && m.state === 'signal' && <span className={styles.selo}>Nova</span>}
        </span>
      </span>
    </>
  );

  const linha = onToggle ? (
    <button type="button" onClick={onToggle} id={idTitulo}
      aria-expanded={aberta} aria-controls={aberta ? idPainel : undefined}
      className={classeLinha}>
      {conteudo}
    </button>
  ) : (
    /* `aria-expanded` só quando ESTA linha tem painel para expandir. Com o ato
       abrindo no card por cima da lista, `painel` deixou de existir nos quatro
       consumidores — e um link que navega anunciando "recolhido" mente para o
       leitor de tela sobre o que o clique faz. */
    <Link href={href ?? `/movimentacoes/${m.id}`} scroll={href ? false : undefined}
      id={idTitulo} aria-expanded={painel === undefined ? undefined : aberta}
      aria-controls={aberta ? idPainel : undefined} className={classeLinha}>
      {conteudo}
    </Link>
  );

  /**
   * A PEÇA — **um ícone só**: o documento, ou o cadeado.
   *
   * Aqui havia dois ícones lado a lado, e eles competiam sem se completar: o
   * da esquerda dizia se havia TEXTO para ler, o da direita se havia ARQUIVO.
   * Numa lista de cinquenta linhas isso são cem ícones cinzentos, e o que a
   * pessoa quer saber é uma coisa só — dá para abrir o documento?
   *
   * O ícone de teor saiu inteiro. O que sobrou abre de verdade: quando há
   * peça, ela; senão a certidão de publicação, que 100% dos atos do diário
   * têm. Sem nenhuma das duas e com bloqueio, é cadeado — sem clique, porque
   * não há o que abrir.
   *
   * > **Peça na frente da certidão quando as duas existem.** São documentos
   * > diferentes (a peça é o ato; a certidão é a prova de que ele foi
   * > publicado), e com um ícone só a peça ganha por ser o que se lê. A
   * > certidão continua inteira na página do ato.
   *
   * Fica FORA de `linha` de propósito: a linha inteira é um `<a>` (ou um
   * `<button>`, quando ela expande), e âncora dentro de âncora é HTML inválido
   * — o navegador desmonta o aninhamento e o clique cai no elemento errado.
   *
   * `DocumentoLink` busca antes de abrir: quando a rota devolve o JSON de erro
   * (peça que o token do serviço não alcança, chave que já respondeu 404), ele
   * troca o link pela mensagem em vez de jogar o JSON numa aba.
   */
  const abre = doc === 'disponivel' || Boolean(m.temDocumentoDoAto);
  // `trancado` é bloqueio DECLARADO pelo tribunal; `provavelIndisponivel` é
  // medição nossa — a chave já foi pedida ao portal e voltou 404. Nenhum dos
  // dois abre, então os dois viram cadeado; o motivo distingue no `title`.
  const sigiloso = !abre && !m.temCertidao && (doc === 'trancado' || doc === 'provavelIndisponivel');
  const urlDoDocumento = abre
    ? `/api/movimentacoes/${m.id}/documento`
    : m.temCertidao ? `/api/movimentacoes/${m.id}/certidao` : null;

  /**
   * A calha da peça é RESERVADA, mesmo vazia.
   *
   * Ela nasceu como irmã solta com `margin-top` negativo, e o resultado era o
   * ícone caindo ABAIXO do filete — num vão só dele, colado na linha seguinte,
   * que é justamente a linha a que ele não pertence. Como coluna do `.item`, o
   * ícone divide a linha com o ato e o filete passa por baixo dos dois.
   *
   * Reservar a coluna em toda linha é o que mantém a calha da direita (chips,
   * CNJ) parada: com a coluna aparecendo só onde há peça, cada linha calculava
   * a própria margem e a lista inteira dançava.
   */
  const docs = (
    <span className={styles.docs}>
      {urlDoDocumento ? (
        <DocumentoLink
          url={urlDoDocumento}
          className={styles.docLink}
          title={abre ? 'Abrir o documento do ato' : 'Abrir a certidão de publicação (PDF oficial do CNJ)'}
        >
          <FileText size={15} aria-hidden="true" />
          <span className="sr-only">{abre ? 'Abrir documento' : 'Abrir certidão de publicação'}</span>
        </DocumentoLink>
      ) : sigiloso ? (
        <span className={styles.docTrancado} title={DOC_TITULO[doc]}>
          <Lock size={15} aria-hidden="true" />
          <span className="sr-only">{DOC_TITULO[doc]}</span>
        </span>
      ) : null}
    </span>
  );

  return (
    /* AINDA NÃO VISTA — o marcador que liga esta linha ao divisor do topo.
       Atributo de dado e não classe: o estado vem do servidor e é lido pelo
       CSS, sem custar uma segunda árvore de estilos. */
    <div className={styles.item} data-nao-vista={m.naoVista ? '' : undefined}>
      {linha}
      {docs}
      {painel && (
        <section id={idPainel} aria-labelledby={idTitulo}>
          {painel}
        </section>
      )}
    </div>
  );
}
