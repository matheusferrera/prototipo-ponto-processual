import Link from 'next/link';
import { ChevronRight, Info } from 'lucide-react';
import type { MovimentacaoDetail } from '@/lib/api.server';
import type { PrazoDoAto, PrazoEmCurso } from '@/types';
import {
  CadeiaDoPrazo,
  DocumentosDoAto,
  TeorDoAto,
} from '@/components/movimentacoes/AtoDetalhe/AtoDetalhe';
import { LeituraDoAto } from '@/components/movimentacoes/AtoDetalhe/LeituraDoAto';
import { BaixarPrazo } from '@/components/prazos/BaixarPrazo/BaixarPrazo';
import { LembrarPrazo } from '@/components/prazos/LembrarPrazo/LembrarPrazo';
import { trechoDeAbertura } from '@/lib/abertura-do-ato';
import { blocosDoAto } from '@/lib/ato-texto';
import { fracaoDoPrazo, mexeComOPrazo } from '@/lib/fio-do-prazo';
import {
  comoTitulo,
  diaComSemana,
  pedeConferencia,
  resumoMovimentacao,
  temLeituraIa,
  vencimentoDoAto,
} from '@/lib/movimentacao';
import { partesCurtas } from '@/lib/pje-text';
import { nomeLegivel } from '@/lib/processo-apresentacao';
import { deQuemDoAto, distancia, ehSoCiencia, tomDosDias, type TomDaSituacao } from '@/lib/situacao-do-ato';
import { dataWallClock } from '@/lib/wall-clock';
import { prazoAbertoDoAto } from '@/components/movimentacoes/CardDoAto/identidade';
import { ChecklistDoAto } from './ChecklistDoAto';
import styles from './CorpoDoCard.module.css';

/**
 * O CORPO DO ATO — a resposta primeiro, o contexto depois.
 *
 * ```
 * 0  a situação            "é com você" · a peça · quantos dias · a conta · os verbos
 * 1  o que aconteceu       sempre
 * 2  o que fazer           só com leitura da IA
 * 3  o texto do ato        fechado acima de 800 caracteres
 * 4  processo              sempre — com as saídas e todos os arquivos
 * ```
 *
 * ## Por que a ordem mudou em 17/09/2026
 *
 * Até aqui o card abria por "o que aconteceu", e o vencimento subia para a
 * barra em um chip porque o resumo da IA (619 caracteres no maior do acervo)
 * empurrava o bloco "Até quando" para baixo da dobra. O desenho novo resolve
 * pela raiz: **a primeira coisa do card é a resposta** — de quem é, o que
 * produzir, até quando — e o resumo vem depois, como contexto. O chip da barra
 * saiu, porque o prazo agora nunca está abaixo da dobra.
 *
 * É a ordem do DOM, do Tab e do leitor de tela, igual no celular, no card do
 * desktop e no painel ao lado da lista.
 *
 * ## Bloco sem dado não vira moldura vazia
 *
 * Sem situação a dizer, o bloco 0 não existe. Sem leitura, o 2 não existe. Uma
 * caixa com "nenhuma providência identificada" é lida como *não há nada a
 * fazer* — a leitura errada no lugar mais caro do produto.
 */
export function CorpoDoCard({ mov }: { mov: MovimentacaoDetail }) {
  return (
    <div className={styles.corpo}>
      <Situacao mov={mov} />
      <OQueAconteceu mov={mov} />
      <OQueFazer mov={mov} />
      <section className={styles.bloco}>
        <TeorDoAto mov={mov} abrirAte={CHARS_ABERTO} />
      </section>
      <ProcessoDoAto mov={mov} />
    </div>
  );
}

/**
 * Acima disto o teor abre FECHADO — o corte do celular: a 390px, 800
 * caracteres já são ~20 linhas, e o ato do diário tem 8 KB de média.
 */
const CHARS_ABERTO = 800;

/* ── 0 · A situação ──────────────────────────────────────────────────────── */

interface Veredito {
  tom: TomDaSituacao;
  chip: string;
  /** `cheio` = é com você; `contorno` = seu, a confirmar; `neutro` = nada a fazer. */
  chipTipo: 'cheio' | 'contorno' | 'neutro';
  titulo: string;
  prazo: { distancia: string; data: string | null; estimado: boolean; fracao: number | null } | null;
  /** "prazo de 15 dias · manifestação · pelo diário · intimado: Fulano". */
  detalhe: string | null;
  nota: string | null;
  /** A nota é uma ressalva sobre a data — sai em âmbar. */
  notaAlerta: boolean;
  conta: boolean;
  verbos: boolean;
}

const NATUREZA: Record<string, string> = { manifestacao: 'Manifestação', ciencia: 'Ciência' };

function nomeDoPrazoEmCurso(p: PrazoEmCurso): string {
  return p.peca?.trim()
    || (p.natureza === 'manifestacao' ? 'manifestação' : p.natureza === 'ciencia' ? 'ciência' : 'prazo');
}

/**
 * "O seu prazo de manifestação neste processo continua correndo: faltam 15
 * dias (sex, 2 out ≈)." — o que desfaz a contradição que a tela antiga tinha:
 * o ato é da outra parte, e ainda assim há um prazo SEU correndo no caso.
 */
function seuPrazoCorre(p: PrazoEmCurso | null): string | null {
  if (!p || p.abriuEsteAto || p.restam === null) return null;
  const data = diaComSemana(p.dataLimite);
  const quando = distancia(p.restam);
  return `O seu prazo de ${nomeDoPrazoEmCurso(p)} neste processo continua correndo: ${quando}${
    data ? ` (${data}${p.metodoPrazo !== 'textoExplicito' ? ' ≈' : ''})` : ''
  }.`;
}

/**
 * DE ONDE A DATA SAIU, numa frase — a conta inteira fica logo abaixo.
 *
 * Só `textoExplicito` é o ato dizendo os dias; mesmo assim a DATA é contagem
 * nossa a partir da publicação. `painel`/`grid` é a data que o tribunal
 * publicou. O resto é regra legal aplicada por nós, e pede conferência.
 */
function notaDaData(p: PrazoDoAto, estimado: boolean): string {
  if (p.origem === 'painel' || p.origem === 'grid') return 'Data informada pelo próprio tribunal.';
  if (estimado) {
    return `Data calculada por nós${p.dias ? `: ${p.dias} dias a partir da publicação` : ''}. Confira no tribunal antes de protocolar.`;
  }
  return `${p.dias ? `Os ${p.dias} dias estão escritos no ato` : 'O prazo está escrito no ato'}; a data é a contagem a partir da publicação.`;
}

function detalheDoPrazo(p: PrazoDoAto): string | null {
  const partes = [
    p.dias ? `prazo de ${p.dias} ${p.dias === 1 ? 'dia' : 'dias'}` : null,
    p.natureza === 'manifestacao' ? 'manifestação' : p.natureza === 'ciencia' ? 'ciência' : null,
    p.canal === 'diario' ? 'pelo diário' : p.canal === 'portal' ? 'pelo portal' : null,
    p.emDobro === true ? 'em dobro' : null,
    p.parte?.trim() ? `intimado: ${partesCurtas(p.parte, 3)}` : null,
    p.cienciaFicta ? 'ciência automática (ficta)' : null,
  ].filter(Boolean);
  return partes.length ? partes.join(' · ') : null;
}

function vereditoDoAto(mov: MovimentacaoDetail): Veredito | null {
  const p = mov.prazo;
  const v = vencimentoDoAto(mov);
  const quem = deQuemDoAto(mov);
  const emCurso = mov.prazoEmCurso;
  const peca = mov.ia.peca?.trim() || null;
  const corre = seuPrazoCorre(emCurso);
  const base = { detalhe: null, nota: null, notaAlerta: false, conta: false, verbos: false, prazo: null };

  /* 1 · O PRAZO QUE ESTE ATO ABRIU. */
  if (p && v && !ehSoCiencia(mov)) {
    const verbos = !p.fechado;
    if (v.encerrado) {
      return {
        ...base,
        tom: 'neutro', chip: 'Prazo encerrado', chipTipo: 'neutro',
        titulo: peca ?? NATUREZA[p.natureza ?? ''] ?? mov.tipo,
        nota: `Este ato abriu um prazo que já foi baixado — ele venceria em ${v.extenso}.`,
      };
    }
    if (quem === 'outra') {
      return {
        ...base,
        tom: 'neutro', chip: 'Prazo da outra parte', chipTipo: 'neutro',
        titulo: 'Nada a fazer agora',
        nota: [`O prazo que este ato abriu, até ${v.extenso}, é da outra parte.`, corre].filter(Boolean).join(' '),
        verbos,
      };
    }
    return {
      tom: v.emDias < 0 ? 'tinto' : tomDosDias(v.emDias),
      chip: quem === 'minha' ? 'É com você' : 'Confirme se é com você',
      chipTipo: quem === 'minha' ? 'cheio' : 'contorno',
      titulo: peca ?? NATUREZA[p.natureza ?? ''] ?? mov.tipo,
      prazo: {
        distancia: distancia(v.emDias),
        data: diaComSemana(p.dataLimite),
        estimado: v.estimado,
        fracao: emCurso?.abriuEsteAto ? fracaoDoPrazo(emCurso) : null,
      },
      detalhe: detalheDoPrazo(p),
      nota: notaDaData(p, v.estimado),
      notaAlerta: v.estimado,
      conta: Boolean(p.cadeia || p.fundamento?.trim()),
      verbos,
    };
  }

  /* 2 · MERA CIÊNCIA — o "prazo" é o dia em que a intimação se operou. */
  if (ehSoCiencia(mov)) {
    const dia = diaComSemana(p?.dataLimite);
    return {
      ...base,
      tom: 'neutro', chip: 'Só ciência', chipTipo: 'neutro',
      titulo: 'Nada a fazer',
      nota: [
        `Intimação de mera ciência${dia ? `, operada em ${dia}` : ''}. Não abre prazo para você.`,
        corre,
      ].filter(Boolean).join(' '),
      verbos: Boolean(p && !p.fechado),
    };
  }

  /* 3 · CARIMBO DE CARTÓRIO — 63% do feed, e quem o abre pergunta "isso me atinge?". */
  if (!mexeComOPrazo(mov.categoria)) {
    return {
      ...base,
      tom: 'neutro', chip: 'Cartório', chipTipo: 'neutro',
      titulo: 'Isto não cobra nada de você',
      nota: [
        mov.categoria === 'publicacao'
          ? 'É o carimbo de que um ato saiu no diário. O ato em si — e o prazo que ele abre, se abrir — está na linha dele.'
          : 'Movimento interno do cartório: os autos mudaram de estado ou de setor. Não abre prazo e não pede petição.',
        corre,
      ].filter(Boolean).join(' '),
    };
  }

  /* 4 · A LEITURA AFIRMA QUE A PROVIDÊNCIA É DE OUTRO. */
  if (quem === 'outra') {
    return {
      ...base,
      tom: 'neutro', chip: 'Providência de outra parte', chipTipo: 'neutro',
      titulo: 'Nada a fazer agora',
      nota: corre,
    };
  }

  /* 5 · CHEGOU COM UM PRAZO SEU CORRENDO — o caso caro e silencioso: a outra
     parte protocola no dia 13 dos seus 15. */
  if (emCurso && !emCurso.abriuEsteAto) {
    const r = emCurso.restam;
    const tom: TomDaSituacao = r === null ? 'prazo' : r < 0 ? 'tinto' : tomDosDias(r) === 'voce' ? 'prazo' : tomDosDias(r);
    return {
      ...base,
      tom, chip: 'No seu prazo', chipTipo: 'contorno',
      titulo: `Chegou com o seu prazo de ${nomeDoPrazoEmCurso(emCurso)} correndo`,
      prazo: r === null ? null : {
        distancia: distancia(r),
        data: diaComSemana(emCurso.dataLimite),
        estimado: emCurso.metodoPrazo !== 'textoExplicito',
        fracao: fracaoDoPrazo(emCurso),
      },
      nota: 'Confira se este ato muda o que você vai protocolar.',
    };
  }

  /* 6 · A LEITURA DIZ QUE É COM VOCÊ, mas não há data registrada. */
  if (quem === 'minha' && peca) {
    return {
      ...base,
      tom: 'voce', chip: 'É com você', chipTipo: 'cheio',
      titulo: peca,
      nota: 'Não há data-limite registrada para este ato. Confira o prazo no texto.',
      notaAlerta: true,
    };
  }

  return null;
}

function Situacao({ mov }: { mov: MovimentacaoDetail }) {
  const v = vereditoDoAto(mov);
  if (!v) return null;
  const aberto = v.verbos ? prazoAbertoDoAto(mov) : null;

  return (
    <section className={styles.situacao} data-tom={v.tom} aria-label="Situação do ato">
      <span className={styles.chip} data-tipo={v.chipTipo}>{v.chip}</span>
      <h2 className={styles.situacaoTitulo}>{comoTitulo(v.titulo)}</h2>

      {v.prazo && (
        <div className={styles.situacaoPrazo}>
          <p className={styles.situacaoLinha}>
            <span className={styles.situacaoDistancia}>{v.prazo.distancia}</span>
            {v.prazo.data && (
              <span className={styles.situacaoData}>vence {v.prazo.data}{v.prazo.estimado ? ' ≈' : ''}</span>
            )}
          </p>
          {/* A RÉGUA é redundante de propósito — a proporção lida sem ler. Os
              números vêm do backend; sem régua (prazo sem data), nada. */}
          {v.prazo.fracao !== null && (
            <span className={styles.regua} aria-hidden="true">
              <span style={{ width: `${Math.round(v.prazo.fracao * 100)}%` }} />
            </span>
          )}
        </div>
      )}

      {v.detalhe && <p className={styles.situacaoDetalhe}>{v.detalhe}</p>}

      {v.nota && (
        <p className={styles.nota} data-alerta={v.notaAlerta || undefined}>
          <Info size={18} aria-hidden="true" />
          <span>{v.nota}</span>
        </p>
      )}

      {/* A CONTA DO VENCIMENTO — os quatro marcos que produzem a data, com o
          dispositivo de cada um. Troca um pedido de fé por uma conferência de
          quinze segundos. Nada é calculado aqui: os marcos vêm de
          `prazo.cadeia`, e sem eles a data fica sozinha.

          **Abre FECHADA** (pedido do dono do produto em 17/09/2026): aberta,
          ela empurrava "O que aconteceu" para baixo da dobra no celular, e a
          conta é conferência de quem quer, não leitura de todo ato. */}
      {v.conta && (
        <details className={styles.conta}>
          <summary className={styles.contaResumo}>
            <ChevronRight size={16} aria-hidden="true" className={styles.contaSeta} />
            <span className={styles.contaVer}>Ver como chegamos na data</span>
            <span className={styles.contaEsconder}>Esconder a conta</span>
          </summary>
          <div className={styles.contaCorpo}>
            <CadeiaDoPrazo prazo={mov.prazo} estimado={v.prazo?.estimado ?? false} />
          </div>
        </details>
      )}

      {/* OS VERBOS DO PRAZO — só com prazo ABERTO: num ato de mera ciência um
          "Protocolei" baixaria o prazo de OUTRO ato do mesmo processo. */}
      {aberto && (
        <div className={styles.verbos}>
          <BaixarPrazo prazoId={aberto.id} fechado={false} compacto />
          <LembrarPrazo prazoId={aberto.id} vencimentoISO={aberto.vencimentoISO} lembrarEm={aberto.lembrarEm} />
        </div>
      )}
    </section>
  );
}

/* ── 1 · O que aconteceu ─────────────────────────────────────────────────── */

/**
 * Prosa, não manchete: o resumo da IA é um parágrafo, e o elemento mais pesado
 * do card é a situação acima dele.
 *
 * Sem leitura (94% dos atos legíveis), o rótulo do cartório é o texto e **o
 * próprio ato fala** — o trecho de `FINALIDADE`, citado — e o pedido de
 * leitura aparece logo abaixo.
 */
function OQueAconteceu({ mov }: { mov: MovimentacaoDetail }) {
  const leu = temLeituraIa(mov);
  const texto = resumoMovimentacao({ ia: mov.ia, detail: mov.descricao });
  const abertura = !leu && mov.textoOriginal?.trim()
    ? trechoDeAbertura(blocosDoAto(mov.textoOriginal))
    : null;

  return (
    <section className={styles.bloco}>
      <h3 className={styles.rotulo}>O que aconteceu</h3>
      <p className={styles.aconteceu} data-rotulo={leu ? undefined : ''}>{texto}</p>

      {/* O rótulo do cartório continua acessível — é por ele que se procura o
          ato no sistema do tribunal. Sem leitura ele JÁ É o texto acima. */}
      {leu && mov.descricao.trim() && texto !== mov.descricao.trim() && (
        <p className={styles.registro}>Como o tribunal registrou: “{mov.descricao}”</p>
      )}

      {abertura && (
        <figure className={styles.citacao}>
          <figcaption className={styles.citacaoRotulo}>
            {abertura.rotulo ? `o ato diz, em ${abertura.rotulo.toLowerCase()}:` : 'o ato diz:'}
          </figcaption>
          <blockquote className={styles.citacaoTexto}>
            {abertura.trecho}{abertura.truncado && '…'}
          </blockquote>
          {abertura.truncado && <p className={styles.citacaoMais}>o texto inteiro está abaixo ↓</p>}
        </figure>
      )}

      {!leu && <LeituraDoAto mov={mov} mostrarLeitura={false} />}
    </section>
  );
}

/* ── 2 · O que fazer ─────────────────────────────────────────────────────── */

const RISCO: Record<string, string> = {
  preclusao: 'preclusão',
  perdaDeDireito: 'perda de direito',
  revelia: 'revelia',
  multa: 'multa',
};

const CONFIANCA: Record<string, string> = { alta: 'confiança alta', media: 'confiança média', baixa: 'confiança baixa' };

/**
 * A providência, a lista de conferência e o que pode dar errado.
 *
 * **`oQueFazer` é o portão** — `null` só quando a IA ainda não leu. Em mera
 * ciência ele descreve o que CONFERIR, e esconder isso deixava a pergunta "e
 * eu, faço o quê?" sem resposta justamente nos atos que não abrem prazo.
 *
 * **"De quem" indefinido conta como SEU**: só `parteContraria` e `terceiro` —
 * os que o modelo afirma — saem como de outro. Dispensar o que é seu é o erro
 * caro.
 */
function OQueFazer({ mov }: { mov: MovimentacaoDetail }) {
  const ia = mov.ia;
  if (!ia.oQueFazer) return null;

  const deOutro = ia.deQuem === 'parteContraria' || ia.deQuem === 'terceiro';
  const antes = [...new Set([...(ia.checklist ?? []), ...(ia.documentosNecessarios ?? [])])];
  const tags = [
    ia.peca && `peça: ${ia.peca}`,
    ia.risco && ia.risco !== 'nenhum' && `risco se perder: ${RISCO[ia.risco] ?? ia.risco}`,
    ia.precisaDosAutos && 'precisa abrir os autos',
  ].filter(Boolean).join(' · ');

  return (
    <section className={styles.bloco} data-outro={deOutro || undefined}>
      <h3 className={styles.rotulo}>{deOutro ? 'Providência de outra parte' : 'O que fazer'}</h3>
      <p className={styles.fazerTexto}>{ia.oQueFazer}</p>

      {!deOutro && ia.deQuem !== 'destinatario' && (
        <p className={styles.fazerRessalva}>De quem é a providência: a confirmar no texto do ato.</p>
      )}

      {antes.length > 0 && <ChecklistDoAto atoId={mov.id} itens={antes} />}

      {tags && <p className={styles.fazerTags}>{tags}</p>}
      {ia.observacao && <p className={styles.fazerObs}>{ia.observacao}</p>}

      {pedeConferencia(mov) && (
        <p className={styles.fazerConferir}>
          Leitura de confiança baixa — confira no texto do ato antes de agir.
        </p>
      )}

      <p className={styles.fazerOrigem}>
        {['Leitura feita por IA', ia.confianca && CONFIANCA[ia.confianca], 'confira no documento'].filter(Boolean).join(' · ')}
      </p>
    </section>
  );
}

/* ── 4 · Processo ────────────────────────────────────────────────────────── */

const ORIGEM: Record<string, string> = {
  djen: 'Diário de Justiça Eletrônico Nacional',
  pdpj: 'Portal de Serviços do PDPJ (CNJ)',
  tribunalPublico: 'Consulta pública do tribunal',
  scraper: 'Painel autenticado do tribunal',
  datajud: 'Base pública do DataJud (CNJ)',
};

const FONTE_CURTA: Record<string, string> = {
  djen: 'diário',
  pdpj: 'portal',
  tribunalPublico: 'tribunal',
  scraper: 'painel',
  datajud: 'DataJud',
};

/**
 * DE QUE CASO É, e para onde ir a partir daqui.
 *
 * Absorve a ficha que ficava no fim do card: o que se copia (o número), o que
 * se confere (origem, datas, quem confirmou) e as duas saídas — o fio do prazo
 * e o processo. Os arquivos que não couberam na barra de baixo ficam aqui,
 * recolhidos.
 */
function ProcessoDoAto({ mov }: { mov: MovimentacaoDetail }) {
  const proc = mov.processData;
  const tribunal = proc?.tribunal.replace(/G[12]$/, '');
  const cliente = proc?.summary?.partes && proc.summary.partes !== '—' ? nomeLegivel(proc.summary.partes) : null;
  const fontes = mov.fontes.filter(f => f !== 'nenhuma' && FONTE_CURTA[f]);

  const linhas: { rotulo: string; valor: string; mono?: boolean }[] = [
    ...(cliente ? [{ rotulo: 'Cliente', valor: cliente }] : []),
    ...(proc?.numero ? [{ rotulo: 'Número', valor: proc.numero, mono: true }] : []),
    ...(proc?.orgaoJulgador?.trim() || tribunal
      ? [{ rotulo: 'Órgão', valor: [proc?.orgaoJulgador?.trim(), tribunal].filter(Boolean).join(' · ') }]
      : []),
    { rotulo: 'Origem', valor: ORIGEM[mov.origem] ?? mov.origem },
    { rotulo: mov.origem === 'djen' ? 'Publicado' : 'Movimentado', valor: dataWallClock(new Date(mov.ocorridoEm)) },
    { rotulo: 'Detectado', valor: dataWallClock(new Date(mov.detectedAt)) },
    ...(fontes.length > 1 ? [{ rotulo: 'Confirmado por', valor: fontes.map(f => FONTE_CURTA[f]).join(' + ') }] : []),
    ...(mov.nMovimento ? [{ rotulo: 'Movimento', valor: `nº ${mov.nMovimento}` }] : []),
  ];

  /* A barra de baixo mostra a peça principal e a certidão. Mais que isso — ou
     peça trancada, que precisa dizer por quê — vai para a lista completa. */
  const arquivosExtras = mov.documentos.length > 1 || mov.documentos.some(doc => !doc.url);

  return (
    <section className={`${styles.bloco} ${styles.blocoProcesso}`}>
      <h3 className={styles.rotulo}>Processo</h3>
      <dl className={styles.processo}>
        {linhas.map(linha => (
          <div key={linha.rotulo} className={styles.processoPar}>
            <dt>{linha.rotulo}</dt>
            <dd className={linha.mono ? styles.mono : undefined}>{linha.valor}</dd>
          </div>
        ))}
      </dl>

      <div className={styles.saidas}>
        {mov.prazoEmCurso && (
          <Link href={`/movimentacoes/fio/${encodeURIComponent(mov.prazoEmCurso.id)}`} className={styles.saida}>
            Tudo o que aconteceu neste prazo
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        )}
        {proc?.numero && (
          <Link href={`/processos/${encodeURIComponent(proc.numero)}`} className={styles.saida}>
            Abrir o processo
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        )}
      </div>

      {arquivosExtras && (
        <details className={styles.arquivos}>
          <summary className={styles.arquivosResumo}>
            <ChevronRight size={16} aria-hidden="true" className={styles.contaSeta} />
            Todos os arquivos deste ato
          </summary>
          <DocumentosDoAto mov={mov} />
        </details>
      )}
    </section>
  );
}
