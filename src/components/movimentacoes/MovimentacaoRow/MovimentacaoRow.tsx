import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, Clock3, FileText, FileMinus, Lock, Paperclip } from 'lucide-react';
import type { Movimentacao } from '@/types';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { categoriaCurta } from '@/lib/categoria-movimentacao';
import {
  acaoMovimentacao,
  clienteMovimentacao,
  pedeConferencia,
  origemDaLinha,
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
}

/** O que cada estado da peça quer dizer — o texto que o leitor de tela ouve. */
const DOC_TITULO: Record<string, string> = {
  nenhum: 'Sem documento anexado',
  disponivel: 'Documento disponível para abrir',
  provavelIndisponivel: 'O portal cita um documento, mas já respondeu que não o serve',
  trancado: 'Documento pendente de liberação pelo tribunal',
};

export function MovimentacaoRow({
  m, densidade = 'confortavel', comHora = false, href, painel, noProcesso = false, onToggle, selo = false,
}: MovimentacaoRowProps) {
  const compacta = densidade === 'compacta';
  const cliente = clienteMovimentacao(m);
  const resumo = resumoMovimentacao(m);
  const origem = origemDaLinha(m);
  const categoria = categoriaCurta(m.categoria);
  const vencimento = vencimentoDoAto(m);
  const acao = acaoMovimentacao(m);
  const conferir = pedeConferencia(m);
  const temTeor = m.textoOriginal !== undefined ? Boolean(m.textoOriginal?.trim()) : m.temInteiroTeor;
  // O estado da PEÇA, que é outro fato — ver `Movimentacao.documentoEstado`.
  const doc = m.documentoEstado ?? 'nenhum';

  // Só a providência do DESTINATÁRIO sobrevive à varredura. A da parte
  // contrária não é tarefa de ninguém aqui e era o bloco mais alto da linha —
  // ela continua no detalhe. Omitir não reintroduz o erro do TRF1 (mostrar a
  // ação sem dizer de quem era): o que não aparece não pode ser lido como
  // prazo do cliente.
  const minhaAcao = acao?.minha ? acao : null;

  const aberta = Boolean(painel);
  const idPainel = `ato-${m.id}`;
  const idTitulo = `ato-titulo-${m.id}`;

  const classeLinha = `${styles.row} ${noProcesso ? styles.noProcesso : ''} ${compacta ? styles.compacta : ''} ${aberta ? styles.aberta : ''}`;
  const conteudo = (
    <>
      {comHora && (
        <span className={styles.hora} aria-hidden={m.time ? undefined : true}>
          {m.time ?? ''}
        </span>
      )}

      <span className={styles.corpo}>
        {vencimento && (
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
          </span>
        )}

        {/* A providência do destinatário acompanha o resumo, sem moldura. */}
        {!compacta && minhaAcao && (
          <span className={styles.acao}>
            <span className="sr-only">Você precisa: </span>
            {minhaAcao.texto}
            {conferir && <span className={styles.conferir}>confira o texto do ato</span>}
          </span>
        )}
      </span>

      <span className={styles.calha}>

        <span className={styles.ident}>
          {/* DE ONDE VEIO — em toda linha, aberta ou fechada. A lista mistura o
              ato do diário, a linha do cartório no portal e o que o painel
              autenticado trouxe; sem isto, nada distingue os três. */}
          {origem && (
            <span className={styles.origem} title={origem.titulo}>
              <span className="sr-only">Origem: </span>
              {origem.curto}
            </span>
          )}
          {categoria && <span className={styles.categoria}>{categoria}</span>}
          {selo && m.state === 'signal' && <span className={styles.selo}>Nova</span>}
          {!noProcesso && <TribTag label={m.tribunal} />}
          <ChevronRight className={styles.chevron} aria-hidden="true" />
        </span>

        {!compacta && !noProcesso && <span className={styles.cnj}>{m.cnj}</span>}
        {/* DOIS SINAIS, DOIS ÍCONES — e eles respondem perguntas diferentes.
            Até 08/09/2026 havia um rótulo só ("Com inteiro teor") que fundia
            texto com documento anexado: ato do PDPJ com um PDF sem texto
            extraído dizia "Com inteiro teor" e, ao abrir, "Indisponível".

            Esquerda, o TEXTO: dá para ler o ato agora?
            Direita, a PEÇA: há arquivo, e vale clicar? */}
        {temTeor !== undefined && (
          <span className={styles.sinais}>
            <span
              className={`${styles.sinal} ${temTeor ? styles.sinalAtivo : ''}`}
              title={temTeor ? 'Inteiro teor disponível' : 'Sem inteiro teor'}
            >
              {temTeor ? <FileText size={14} aria-hidden="true" /> : <FileMinus size={14} aria-hidden="true" />}
              <span className="sr-only">{temTeor ? 'Com inteiro teor' : 'Sem inteiro teor'}</span>
            </span>

            {/* O cadeado é o único que promete abertura futura: bloqueio que o
                TRIBUNAL declarou (pendente de ciência). `provavelIndisponivel`
                é medição nossa — o portal já respondeu 404 para essa chave —,
                e por isso vira clipe apagado, não cadeado. */}
            <span
              className={`${styles.sinal} ${doc === 'disponivel' ? styles.sinalAtivo : ''} ${doc === 'provavelIndisponivel' ? styles.sinalIncerto : ''}`}
              title={DOC_TITULO[doc]}
            >
              {doc === 'trancado'
                ? <Lock size={14} aria-hidden="true" />
                : <Paperclip size={14} aria-hidden="true" />}
              <span className="sr-only">{DOC_TITULO[doc]}</span>
            </span>
          </span>
        )}
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
    <Link href={href ?? `/movimentacoes/${m.id}`} scroll={href ? false : undefined}
      id={idTitulo} aria-expanded={href ? aberta : undefined}
      aria-controls={href && aberta ? idPainel : undefined} className={classeLinha}>
      {conteudo}
    </Link>
  );

  if (!painel) return linha;

  return (
    <>
      {linha}
      <section id={idPainel} aria-labelledby={idTitulo}>
        {painel}
      </section>
    </>
  );
}
