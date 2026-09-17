import Link from 'next/link';
import { Check, ChevronRight, Clock3, FileText } from 'lucide-react';
import type { Movimentacao, PrazoEmCurso } from '@/types';
import { montarNovidades, type GrupoDoProcesso } from '@/lib/novidades';
import { colapsavelNoFeed, fracaoDoPrazo } from '@/lib/fio-do-prazo';
import {
  deQuemDoAto,
  diasAte,
  distancia,
  pedeAcao,
  situacaoDaLinha,
  tomDosDias,
} from '@/lib/situacao-do-ato';
import {
  clienteMovimentacao,
  comoTitulo,
  desdeQuando,
  descricaoMovimentacao,
  diaComSemana,
  quandoComHora,
  resumoMovimentacao,
  vencimentoDoAto,
} from '@/lib/movimentacao';
import { nomeLegivel } from '@/lib/processo-apresentacao';
import { DocumentoLink } from '../DocumentoLink/DocumentoLink';
import { DocumentoDaLinha, viaDoDocumento } from '../DocumentoDaLinha/DocumentoDaLinha';
import { BlocoDeCartorio } from '../BlocoDeCartorio/BlocoDeCartorio';
import { Etiqueta } from '../Etiqueta/Etiqueta';
import { LinkDoAto } from '../LinkDoAto/LinkDoAto';
import { DesfazerVistas, MarcarVistas } from '../MarcarVistas/MarcarVistas';
import styles from './Novidades.module.css';

/**
 * A ABA NOVAS — ver `lib/novidades.ts` para o porquê dos três blocos.
 *
 * Serve às duas larguras com o MESMO DOM. No celular (e até 1199px) é a coluna
 * única do desenho: cartões com a faixa do prazo em cima e as saídas embaixo.
 * A partir de 1200px vira a coluna da esquerda de uma tela dividida — o cartão
 * troca a faixa pelo bloco de dias à esquerda e o clique troca o ato no painel
 * da direita (`LinkDoAto`), em vez de abrir o card por cima.
 */
export function Novidades({
  itens,
  total,
  vistasAte,
  selecionado,
  hrefPainel,
  voltar,
  emCurso,
}: {
  itens: readonly Movimentacao[];
  /** Quantas novas existem — pode passar das que vieram (teto de 100). */
  total: number;
  vistasAte: string | null;
  /** O ato aberto no painel da direita. */
  selecionado: string | null;
  hrefPainel: (id: string) => string;
  /**
   * A marca de antes do último "Marcar vistas" — `undefined` quando a tela não
   * veio desse clique. `null` é a conta que ainda não tinha marcado nada.
   */
  voltar: string | null | undefined;
  /** Prazos em curso — para a saída da tela vazia. */
  emCurso: number;
}) {
  if (itens.length === 0) {
    return <NadaNovo voltar={voltar} emCurso={emCurso} vistasAte={vistasAte} />;
  }

  const { pedemAcao, processos, soCartorio, totalProcessos } = novidadesDe(itens);
  const outras = itens.length - pedemAcao.length;

  return (
    <div className={styles.novidades}>
      <div className={styles.resumo}>
        <p className={styles.resumoTexto}>
          <FraseDasNovas total={total} processos={totalProcessos} vistasAte={vistasAte} />
        </p>
        <MarcarVistas vistasAte={vistasAte} />
      </div>

      {total > itens.length && (
        <p className={styles.teto}>
          Mostrando as {itens.length} mais recentes. <Link href="/movimentacoes?vista=todas">Ver todas</Link>
        </p>
      )}

      {pedemAcao.length > 0 && (
        <section aria-labelledby="novas-acao">
          <h2 id="novas-acao" className={styles.secao} data-tom="acao">
            <span>Pede sua ação</span>
            <span>{pedemAcao.length}</span>
          </h2>
          <div className={styles.pilha}>
            {pedemAcao.map(m => (
              <CartaoDeAcao key={m.id} m={m} selecionado={m.id === selecionado} hrefPainel={hrefPainel(m.id)} />
            ))}
          </div>
        </section>
      )}

      {outras > 0 && (
        <section aria-labelledby="novas-outras">
          <h2 id="novas-outras" className={styles.secao}>
            <span>{pedemAcao.length > 0 ? 'Outras novidades' : 'Novidades'}</span>
            <span>{outras}</span>
          </h2>
          <div className={styles.pilha}>
            {processos.map(grupo => (
              <Processo key={grupo.cnj} grupo={grupo} selecionado={selecionado} hrefPainel={hrefPainel} />
            ))}
            {soCartorio.length > 0 && (
              <SoCartorio itens={soCartorio} selecionado={selecionado} hrefPainel={hrefPainel} />
            )}
          </div>
        </section>
      )}

      <div className={styles.fim}>
        <p>Isso é tudo o que chegou {vistasAte ? `desde ${desdeQuando(vistasAte, ' às ')}` : 'nos últimos 7 dias'}.</p>
        <Link href="/movimentacoes?vista=todas" className={styles.fimLink}>
          Ver todas as movimentações
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/**
 * CARIMBO DE CARTÓRIO, na aba Novas.
 *
 * Diferente da lista de todas (`colapsavelNaLista`), aqui o que está dentro de
 * um prazo RECOLHE também: o cartão do processo já diz, no cabeçalho, que o
 * prazo corre — e "Expedição de outros documentos" repetido em três linhas
 * com a mesma etiqueta era o ruído que a aba existe para tirar.
 *
 * **A exceção é o carimbo que fala de prazo** ("Decorrido prazo do réu"): é
 * `tramite` pela categoria e é, com o relógio correndo, a linha mais
 * importante do dia. Ele nunca recolhe.
 */
function ehCartorio(m: Movimentacao): boolean {
  return colapsavelNoFeed(m.categoria) && !/prazo/i.test(m.detail);
}

/** Os três blocos, com os critérios da tela — um lugar só, para a página e a lista concordarem. */
export function novidadesDe(itens: readonly Movimentacao[]) {
  return montarNovidades(itens, {
    pedeAcao: m => pedeAcao(m),
    ehCartorio,
    diasAte: m => diasAte(m.prazo?.dataLimite),
  });
}

/**
 * O ato que o painel do desktop abre quando ninguém escolheu: o mais urgente
 * que pede ação; senão o primeiro ato de processo; senão o primeiro carimbo.
 * A mesma ordem em que a coluna da esquerda os desenha.
 */
export function primeiroDaAbaNovas(itens: readonly Movimentacao[]): string | null {
  const { pedemAcao, processos, soCartorio } = novidadesDe(itens);
  return pedemAcao[0]?.id ?? processos[0]?.atos[0]?.id ?? processos[0]?.cartorio[0]?.id ?? soCartorio[0]?.id ?? null;
}

/**
 * "8 novas em 6 processos, desde terça às 19:05".
 *
 * A referência importa: "8 novas" sem "desde quando" não é número, é adjetivo.
 * Conta que nunca marcou nada tem a última semana como régua (o backend decide
 * — `GET /movements?novas=`), e a frase diz isso em vez de inventar uma data.
 */
export function FraseDasNovas({ total, processos, vistasAte }: { total: number; processos?: number; vistasAte: string | null }) {
  return (
    <>
      <strong>{total} {total === 1 ? 'nova' : 'novas'}</strong>
      {processos ? ` em ${processos} ${processos === 1 ? 'processo' : 'processos'}` : ''}
      {vistasAte ? `, desde ${desdeQuando(vistasAte, ' às ')}` : ' nos últimos 7 dias'}
    </>
  );
}

/* ── Pede sua ação ───────────────────────────────────────────────────────── */

const NATUREZA: Record<string, string> = { manifestacao: 'Manifestação', ciencia: 'Ciência' };

function CartaoDeAcao({ m, selecionado, hrefPainel }: { m: Movimentacao; selecionado: boolean; hrefPainel: string }) {
  const dias = diasAte(m.prazo?.dataLimite) ?? 0;
  const vencimento = vencimentoDoAto(m);
  const data = diaComSemana(m.prazo?.dataLimite);
  /* A RÉGUA só quando este ato abriu o prazo que corre: `totalDias` e
     `decorridos` vêm do backend (ver `fio-do-prazo.ts`) e são a janela deste
     prazo. Sem régua, nada — inventar um denominador desenharia uma progressão
     que não existe. */
  const fracao = m.prazoEmCurso?.abriuEsteAto ? fracaoDoPrazo(m.prazoEmCurso as PrazoEmCurso) : null;
  /* A PEÇA é o título: é ela que diz o que produzir. Sem leitura, a natureza do
     prazo; sem as duas, o tipo do ato. */
  const titulo = comoTitulo(m.ia?.peca || (m.prazo?.natureza ? NATUREZA[m.prazo.natureza] : null) || m.tipo);
  const via = viaDoDocumento(m);
  const estimado = vencimento?.estimado ? (
    <abbr className={styles.estimado} title="Data calculada por nós — confira no tribunal">≈</abbr>
  ) : null;

  return (
    <article className={styles.cartao} data-tom={tomDosDias(dias)} data-selecionado={selecionado || undefined}>
      <div className={styles.faixa}>
        <p className={styles.faixaLinha}>
          <span className={styles.faixaDistancia}>{distancia(dias)}</span>
          {data && <span className={styles.faixaData}>vence {data}{estimado && <> {estimado}</>}</span>}
        </p>
        {fracao !== null && (
          <span className={styles.regua} aria-hidden="true">
            <span style={{ width: `${Math.round(fracao * 100)}%` }} />
          </span>
        )}
        <p className={styles.faixaBloco} aria-hidden="true">
          <span className={styles.blocoNumero} data-hoje={dias === 0 || undefined}>{dias === 0 ? 'hoje' : dias}</span>
          {dias > 0 && <span className={styles.blocoUnidade}>{dias === 1 ? 'dia' : 'dias'}</span>}
          {data && <span className={styles.blocoData}>{data}{vencimento?.estimado ? ' ≈' : ''}</span>}
        </p>
      </div>

      <LinkDoAto id={m.id} hrefPainel={hrefPainel} selecionado={selecionado} className={styles.corpo}>
        <span className={styles.meta}>
          <span>{m.tipo}</span>
          <span aria-hidden="true">·</span>
          <span>{m.tribunal}</span>
          {m.quandoCurto && <><span aria-hidden="true">·</span><span>{quandoComHora(m)}</span></>}
        </span>
        <span className={styles.titulo}>{titulo}</span>
        {deQuemDoAto(m) === 'aConfirmar' && (
          <span className={styles.confirmar}>Confirme no ato se o prazo é seu</span>
        )}
        <span className={styles.resumoAto}>{resumoMovimentacao(m)}</span>
        <span className={styles.cliente}>
          <span className={styles.clienteNome}>{nomeLegivel(clienteMovimentacao(m))}</span>
          {m.cnj !== '—' && <span className={styles.cnj}>{m.cnj}</span>}
        </span>
      </LinkDoAto>

      <div className={styles.rodape}>
        <LinkDoAto id={m.id} hrefPainel={hrefPainel} className={styles.verOQueFazer}>
          Ver o que fazer
          <ChevronRight size={16} aria-hidden="true" />
        </LinkDoAto>
        {via && via !== 'trancado' && (
          <DocumentoLink url={via.url} className={styles.botaoDoc}>
            <FileText size={18} aria-hidden="true" />
            {via.peca ? 'Documento' : 'Certidão'}
          </DocumentoLink>
        )}
      </div>
    </article>
  );
}

/* ── Um processo ─────────────────────────────────────────────────────────── */

function Processo({
  grupo,
  selecionado,
  hrefPainel,
}: {
  grupo: GrupoDoProcesso<Movimentacao>;
  selecionado: string | null;
  hrefPainel: (id: string) => string;
}) {
  const { primeiro, cartorio } = grupo;
  /* Corrida de UM carimbo não recolhe: um "mostrar" para revelar uma linha que
     tem a altura da linha recolhida não ganha nada e esconde algo. */
  const atos = cartorio.length === 1 ? [...grupo.atos, ...cartorio] : grupo.atos;
  const recolhidos = cartorio.length > 1 ? cartorio : [];
  const cliente = nomeLegivel(clienteMovimentacao(primeiro));
  /* O PRAZO QUE CORRE, uma vez, no cabeçalho do caso — ele se repetia em cada
     linha do mesmo processo. Vem do ato mais recente que o conhece. */
  const corre = [...grupo.atos, ...cartorio].map(m => m.prazoEmCurso).find(Boolean) ?? null;
  const temNumero = primeiro.cnj !== '—';

  return (
    <section className={styles.processo} aria-label={cliente}>
      <div className={styles.processoCabeca}>
        {temNumero ? (
          <Link href={`/processos/${encodeURIComponent(primeiro.cnj)}`} className={styles.processoNome}>
            <span className={styles.processoCliente}>{cliente}</span>
            <span className={styles.processoTrib}>{primeiro.tribunal}</span>
          </Link>
        ) : (
          <span className={styles.processoNome}>
            <span className={styles.processoCliente}>{cliente}</span>
            <span className={styles.processoTrib}>{primeiro.tribunal}</span>
          </span>
        )}
        {temNumero && <span className={styles.cnj}>{primeiro.cnj}</span>}
        {corre && <PrazoQueCorre p={corre} />}
      </div>

      {atos.map(m => {
        const situacao = situacaoDaLinha(m, { longo: true, semPrazoQueCorre: Boolean(corre) });
        return (
          <div key={m.id} className={styles.ato} data-selecionado={m.id === selecionado || undefined}>
            <LinkDoAto id={m.id} hrefPainel={hrefPainel(m.id)} selecionado={m.id === selecionado} className={styles.atoLink}>
              <span className={styles.meta}>
                <span>{ehCartorio(m) ? 'Cartório' : m.tipo}</span>
                {m.quandoCurto && <><span aria-hidden="true">·</span><span>{quandoComHora(m)}</span></>}
              </span>
              <span className={styles.atoTexto}>
                {ehCartorio(m) ? descricaoMovimentacao(m) : resumoMovimentacao(m)}
              </span>
              {situacao && <Etiqueta rotulo={situacao.rotulo} tom={situacao.tom} />}
            </LinkDoAto>
            <DocumentoDaLinha m={m} />
          </div>
        );
      })}

      {recolhidos.length > 0 && <BlocoDeCartorio itens={recolhidos} variante="grupo" />}
    </section>
  );
}

/**
 * "Seu prazo corre: manifestação, faltam 15 dias · sex, 2 out ≈".
 *
 * A distância e a régua vêm prontas do backend (`restam`) — nunca recalculadas
 * aqui, porque o relógio que vale é o de Brasília.
 */
function PrazoQueCorre({ p }: { p: PrazoEmCurso }) {
  const nome = p.peca?.trim()
    || (p.natureza === 'manifestacao' ? 'manifestação' : p.natureza === 'ciencia' ? 'ciência' : 'prazo');
  const vencido = p.restam !== null && p.restam < 0;
  const data = diaComSemana(p.dataLimite);

  return (
    <p className={styles.corre} data-tom={p.restam !== null && p.restam <= 3 ? 'tinto' : undefined}>
      <Clock3 size={16} aria-hidden="true" />
      <span className={styles.correTexto}>
        <strong>{vencido ? 'Seu prazo venceu e segue aberto:' : 'Seu prazo corre:'}</strong>{' '}
        {nome}{p.restam !== null && `, ${distancia(p.restam)}`}
      </span>
      {data && <span className={styles.correData}>{data}{p.metodoPrazo !== 'textoExplicito' ? ' ≈' : ''}</span>}
    </p>
  );
}

/* ── Só cartório ─────────────────────────────────────────────────────────── */

function SoCartorio({
  itens,
  selecionado,
  hrefPainel,
}: {
  itens: readonly Movimentacao[];
  selecionado: string | null;
  hrefPainel: (id: string) => string;
}) {
  const processos = new Set(itens.map(m => m.cnj)).size;

  return (
    <section className={styles.soCartorio} aria-labelledby="novas-cartorio">
      <h3 id="novas-cartorio" className={styles.soCartorioTitulo}>
        Só cartório · {processos} {processos === 1 ? 'processo' : 'processos'}
      </h3>
      <ul className={styles.soCartorioLista}>
        {itens.map(m => (
          <li key={m.id} className={styles.cartorioLinha} data-selecionado={m.id === selecionado || undefined}>
            <LinkDoAto id={m.id} hrefPainel={hrefPainel(m.id)} selecionado={m.id === selecionado} className={styles.cartorioLink}>
              <span className={styles.cartorioTexto}>{descricaoMovimentacao(m)}</span>
              <span className={styles.cartorioCliente}>
                {nomeLegivel(clienteMovimentacao(m))}{m.quandoCurto ? ` · ${quandoComHora(m)}` : ''}
              </span>
              {m.cnj !== '—' && <span className={styles.cnj}>{m.cnj} · {m.tribunal}</span>}
            </LinkDoAto>
            <DocumentoDaLinha m={m} variante="rotulo" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Nada novo ───────────────────────────────────────────────────────────── */

function NadaNovo({
  voltar,
  emCurso,
  vistasAte,
}: {
  voltar: string | null | undefined;
  emCurso: number;
  vistasAte: string | null;
}) {
  const acabouDeMarcar = voltar !== undefined;

  return (
    <div className={styles.vazio}>
      <span className={styles.vazioMarca} aria-hidden="true">
        <Check size={28} />
      </span>
      <p className={styles.vazioTitulo}>{acabouDeMarcar || vistasAte ? 'Tudo visto' : 'Nada chegou nesta semana'}</p>
      <p className={styles.vazioTexto}>
        Quando chegar algo novo nos seus processos, aparece aqui.
        {emCurso > 0 && ` ${emCurso === 1 ? 'O prazo correndo continua' : `Os ${emCurso} prazos correndo continuam`} em “Com prazo”.`}
      </p>
      {emCurso > 0 && (
        <Link href="/movimentacoes?vista=fios" className={styles.vazioBotao}>Ver prazos correndo</Link>
      )}
      {acabouDeMarcar && <DesfazerVistas voltarPara={voltar} />}
    </div>
  );
}
