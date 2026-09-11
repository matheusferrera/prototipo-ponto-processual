import Link from 'next/link';
import { Clock3, Lock } from 'lucide-react';
import type { MovimentacaoDetail } from '@/lib/api.server';
import { grauLabel } from '@/lib/grau';
import { destinatariosDoAto, pedeConferencia, vencimentoDoAto } from '@/lib/movimentacao';
import { blocosDoAto } from '@/lib/ato-texto';
import { dataWallClock } from '@/lib/wall-clock';
import { DocumentoLink } from '../DocumentoLink/DocumentoLink';
import { CONFIANCA, LeituraIaDoAto } from './LeituraIaDoAto';
import { LeituraDoAto } from './LeituraDoAto';
import styles from './AtoDetalhe.module.css';

/* Reexportado porque `PrazoRow` mostra a leitura do ato dentro do collapse do
   PRAZO, onde não há o que pedir — o botão de lá é o do prazo. Quem quer o
   bloco COM o botão usa `LeituraDoAto`. */
export { LeituraIaDoAto };

/**
 * O ato por inteiro — os blocos que a página `/movimentacoes/[id]` e a linha
 * expandida do feed (`?aberta=<id>`) mostram.
 *
 * No celular, os blocos seguem o fluxo de leitura. Com inteiro teor, o
 * desktop separa texto e ficha em duas colunas. Sem texto, a mesma caixa
 * do inteiro teor explica a indisponibilidade.
 *
 * Nada aqui repete a linha que está logo acima no feed (ato, cliente, órgão,
 * tribunal, CNJ, categoria, selo e o chip de prazo). O painel é o que a linha
 * NÃO conseguiu dizer: a procedência do prazo, a leitura da IA com data e
 * confiança, de que fontes o ato veio, e o texto.
 */

/**
 * Acima disto o inteiro teor abre FECHADO.
 *
 * O corte é do CELULAR, não do monitor: a 396px, 800 caracteres já são ~20
 * linhas, e um ato de 8 KB (a média da origem `djen`) empurraria os arquivos e
 * a ficha para 1.500px abaixo do polegar. A página usa um teto maior porque
 * lá o texto é o conteúdo principal, não um bloco dentro de uma lista.
 */
const CHARS_ATO_ABERTO_PAINEL = 800;
const CHARS_ATO_ABERTO_PAGINA = 2_400;

/* ── Até quando ─────────────────────────────────────────────────────────── */

const NATUREZA: Record<string, string> = {
  ciencia: 'ciência',
  manifestacao: 'manifestação',
};

const CANAL: Record<string, string> = {
  diario: 'pelo diário',
  portal: 'pelo portal',
};

const DE_QUEM: Record<string, string> = {
  destinatario: 'do destinatário',
  parteContraria: 'da parte contrária',
  indefinido: 'de quem, a confirmar',
};

/**
 * Até quando — a data e, embaixo dela, a qualificação curta e os
 * destinatários. O grid tem duas linhas: `prazoPrecisa` (esquerda) e
 * `prazoResumo` (direita) formam a primeira, lado a lado; `prazoLeitura`
 * ocupa a segunda em largura total — a leitura é o bloco mais rico (resumo,
 * checklist, documentos) e ganha o espaço das duas colunas em vez de ficar
 * espremida numa só.
 */
export function PrazoDoAto({ mov }: { mov: MovimentacaoDetail }) {
  const vencimento = vencimentoDoAto(mov);
  if (!vencimento) return null;

  const p = mov.prazo;
  // Prazo ENCERRADO sai da escala de urgência. Ele passou a chegar aqui em
  // 08/09/2026 (antes o mapeador o descartava), e pintá-lo de vermelho faria o
  // detalhe cobrar em tom de alarme algo que já acabou.
  const tom = vencimento.encerrado ? styles.prazoEncerrado
    : vencimento.emDias <= 7 ? styles.prazoVencido
    : vencimento.emDias <= 14 ? styles.prazoUrgente
    : styles.prazoCalmo;

  /* Os campos que o backend manda e que até 06/09/2026 morriam no mapeador do
     front — natureza, canal, dobra e de quem é o prazo. São eles que dizem se
     a contagem começou na publicação ou na expedição, e se há dobra. */
  const qualificacao = [
    vencimento.dias && `prazo de ${vencimento.dias}`,
    p?.natureza && NATUREZA[p.natureza],
    p?.canal && CANAL[p.canal],
    p?.emDobro === true && 'em dobro',
    p?.emDobro === false && 'sem dobra',
    p?.deQuem && DE_QUEM[p.deQuem],
  ].filter(Boolean) as string[];

  const { nomes: destinatarios, ocultos } = destinatariosDoAto(mov);

  return (
    <section className={`${styles.prazo} ${tom}`}>
      {/* "Você precisa" vem primeiro — é a providência, a pergunta que se
          responde ao abrir o card. Data e qualificação do prazo (o "porquê")
          ficam na coluna AO LADO no desktop, e a leitura do ato fecha o card
          embaixo das duas, em largura total. No celular a grade tem uma
          coluna e as três voltam a empilhar nesta mesma ordem. */}
      <div className={styles.prazoPrecisa}>
        <ProvidenciaDoAto mov={mov} />
      </div>

      <div className={styles.prazoResumo}>
        <div className={styles.prazoTopo}>
          <span className={styles.prazoRotulo}>
            <Clock3 size={14} aria-hidden="true" />
            {vencimento.encerrado ? 'Prazo encerrado' : vencimento.estimado ? 'Prazo estimado' : 'Prazo'}
          </span>
          <span className={styles.prazoQuando}>{vencimento.quando}</span>
        </div>
        <p className={styles.prazoData}>
          <span className={styles.prazoDataRotulo}>
            {vencimento.emDias < 0 ? 'Venceu em' : 'Vencimento'}
          </span>
          {vencimento.extenso}
        </p>

        {qualificacao.length > 0 && (
          <p className={styles.prazoQualificacao}>{qualificacao.join(' · ')}</p>
        )}

        {destinatarios.length > 0 && (
          <p className={styles.prazoDestinatarios}>
            {destinatarios.join(', ')}{ocultos > 0 && ` +${ocultos}`}
          </p>
        )}
      </div>

      <div className={styles.prazoLeitura}>
        <LeituraDoAto mov={mov} />
      </div>
    </section>
  );
}

/* ── O que fazer ────────────────────────────────────────────────────────── */

/**
 * A providência, em destaque — em TODO ato que a IA leu.
 *
 * O gate é `oQueFazer`, e mudou duas vezes. Era `mov.ia.acao` (`null` = mera
 * ciência); virou `mov.ia.peca` na fusão ato+prazo, quando `oQueFazer` passou
 * a vir sempre — o medo era a maioria (mera ciência) ganhar um "você precisa"
 * que não precisa de nada. O medo era errado na direção contrária: em mera
 * ciência `oQueFazer` descreve o que CONFERIR ("não havendo pendências os
 * autos serão arquivados após 5 dias"), e esconder isso deixava a página do
 * ato sem nenhuma resposta para "e eu, faço o quê?" justamente nos 46% de
 * atos que não abrem prazo. Agora `oQueFazer` é o gate: `null` só quando a IA
 * ainda não leu, e aí o bloco não existe — `:empty` some com a linha do grid.
 *
 * A linha FECHADA do feed continua com o gate antigo (`acaoMovimentacao`, em
 * `movimentacao.ts`, exige `peca`): cinquenta linhas de pauta com um parágrafo
 * de providência em cada é o ruído que este bloco existe para evitar. Aqui a
 * pessoa já abriu o ato — ela pediu para saber.
 *
 * ### "De quem" indefinido conta como MINHA
 *
 * `deQuem` chega `null` ou `'indefinido'` com frequência, e o `else` de um
 * booleano jogava esses casos em "providência de outra parte" — uma AFIRMAÇÃO
 * que ninguém mediu, na direção que dá folga. É o inverso do erro que
 * `acaoMovimentacao` documenta (a citação da União lida como prazo do
 * cliente): ali o risco é cobrar o que não é seu, aqui é dispensar o que é.
 * Só `parteContraria` e `terceiro` — os dois que o modelo afirma — saem como
 * de outra parte; o resto sai como sua, com a ressalva de que falta confirmar.
 */
export function ProvidenciaDoAto({ mov }: { mov: Pick<MovimentacaoDetail, 'ia'> }) {
  if (!mov.ia.oQueFazer) return null;
  const deQuem = mov.ia.deQuem;
  const deOutro = deQuem === 'parteContraria' || deQuem === 'terceiro';

  return (
    <section className={`${styles.acao} ${deOutro ? styles.acaoOutra : styles.acaoMinha}`}>
      <span className={styles.acaoRotulo}>
        {deOutro ? 'providência de outra parte' : 'você precisa'}
      </span>
      <span className={styles.acaoTexto}>{mov.ia.oQueFazer}</span>
      {!deOutro && deQuem !== 'destinatario' && (
        <span className={styles.acaoRessalva}>de quem é a providência: a confirmar no ato</span>
      )}
      {pedeConferencia(mov) && (
        <span className={styles.acaoConferir}>leitura de confiança baixa — confira o texto</span>
      )}
    </section>
  );
}

/* ── O texto ────────────────────────────────────────────────────────────── */

export function TeorDoAto({
  mov,
  abrirAte = CHARS_ATO_ABERTO_PAGINA,
}: {
  mov: MovimentacaoDetail;
  abrirAte?: number;
}) {
  const texto = mov.textoOriginal;

  if (!texto?.trim()) {
    return (
      <section className={styles.ato} aria-label="Inteiro teor do ato indisponível">
        <div className={styles.atoIndisponivelCabecalho}>
          <span className={styles.atoSummaryTexto}>Inteiro teor do ato</span>
          <span className={styles.atoTamanho}>Indisponível</span>
        </div>
        <div className={styles.atoTexto}>
          <p className={styles.atoBloco}>O inteiro teor não foi disponibilizado pela fonte neste registro.</p>
          <p className={styles.atoBloco}>Consulte os documentos disponíveis ou o processo para obter mais informações.</p>
        </div>
      </section>
    );
  }

  return (
    <details open={texto.length <= abrirAte} className={styles.ato}>
      <summary className={styles.atoSummary}>
        <span className={styles.atoSummaryTexto}>Inteiro teor do ato</span>
        <span className={styles.atoTamanho}>{texto.length.toLocaleString('pt-BR')} caracteres</span>
      </summary>
      <div className={styles.atoTexto}>
        {/* Blocos, e não um `{texto}` corrido: o DJEN entrega o ato como UM
            parágrafo — 0 de 1.145 atos do acervo têm quebra de linha, com
            média de 5.598 caracteres. `blocosDoAto` só encontra os rótulos que
            o próprio PJe imprime e quebra ali, sem alterar uma vírgula. */}
        {blocosDoAto(texto).map((bloco, i) => {
          const corpo = bloco.corpo.trim();
          /* Rótulo sem corpo é CABEÇALHO, não bloco vazio: no original o
             `Destinatários:` vem colado no `APELADO:` seguinte. */
          return (
            <p key={i} className={corpo ? styles.atoBloco : styles.atoCabecalho}>
              {bloco.rotulo && <span className={styles.atoRotulo}>{bloco.rotulo}</span>}
              {corpo}
            </p>
          );
        })}
      </div>
    </details>
  );
}

/* ── A ficha ────────────────────────────────────────────────────────────── */

const ORIGEM: Record<string, string> = {
  djen: 'diário oficial (DJEN)',
  pdpj: 'portal do CNJ (PDPJ)',
  tribunalPublico: 'consulta pública do tribunal',
  scraper: 'painel do tribunal',
  datajud: 'base do CNJ (DataJud)',
};

const FONTE_CURTA: Record<string, string> = {
  djen: 'diário',
  pdpj: 'PDPJ',
  tribunalPublico: 'consulta pública',
  datajud: 'DataJud',
  scraper: 'painel',
};

/**
 * A procedência do registro — o que nenhuma tela mostrava.
 *
 * `<dl>` e não uma tabela: são pares rótulo/valor, é o elemento que os
 * descreve, e no celular ele lê como um recibo (rótulo à esquerda, valor à
 * direita) sem precisar de grade.
 */
export function FichaDoAto({ mov }: { mov: MovimentacaoDetail }) {
  const proc = mov.processData;
  // `grauLabel` devolve 'DJEN' quando o processo veio do diário, que NÃO é um
  // grau — escrito na ficha, virava "DJEN grau". Sem grau conhecido, a linha
  // fica só com a distribuição.
  const rotuloGrau = grauLabel(proc?.grau);
  const grau = rotuloGrau === '1º' || rotuloGrau === '2º' ? rotuloGrau : '';
  // A distribuição é uma DATA. `formatOcorridoEm` anexa a hora quando existe, e
  // "distribuído em 28/05/2007 03:00" dá precisão de relógio a um fato de
  // calendário — além de a hora ser, ali, o carimbo de importação.
  const distribuicao = proc?.summary?.distribuicao?.split(' ')[0] ?? null;
  const fontes = mov.fontes.filter(f => f !== 'nenhuma');

  const linhas: { rotulo: string; valor: string }[] = [
    { rotulo: mov.origem === 'djen' ? 'Publicado' : 'Movimentado', valor: dataWallClock(new Date(mov.ocorridoEm)) },
    { rotulo: 'Detectado', valor: dataWallClock(new Date(mov.detectedAt)) },
    { rotulo: 'Origem', valor: ORIGEM[mov.origem] ?? mov.origem },
    // Duas fontes independentes que trouxeram o MESMO ato valem mais que uma —
    // e a tela não tinha como dizer isso. Só aparece quando há mais de uma:
    // "confirmado por 1 fonte" não é informação.
    ...(fontes.length > 1
      ? [{ rotulo: 'Confirmado por', valor: fontes.map(f => FONTE_CURTA[f] ?? f).join(' + ') }]
      : []),
    ...(mov.ia.analisadoEm
      ? [{
          rotulo: 'Lido pela IA',
          valor: [
            dataWallClock(new Date(mov.ia.analisadoEm)),
            mov.ia.confianca && CONFIANCA[mov.ia.confianca],
          ].filter(Boolean).join(' · '),
        }]
      : []),
    ...(mov.nMovimento ? [{ rotulo: 'Movimento', valor: `nº ${mov.nMovimento}` }] : []),
    ...(proc?.summary?.vara ? [{ rotulo: 'Órgão', valor: proc.summary.vara }] : []),
    ...(grau || distribuicao
      ? [{
          rotulo: grau ? 'Instância' : 'Distribuído',
          valor: [grau && `${grau} grau`, distribuicao && (grau ? `distribuído em ${distribuicao}` : distribuicao)]
            .filter(Boolean).join(' · '),
        }]
      : []),
  ];

  return (
    <dl className={styles.ficha}>
      {linhas.map(linha => (
        <div key={linha.rotulo} className={styles.fichaLinha}>
          <dt className={styles.fichaRotulo}>{linha.rotulo}</dt>
          <dd className={styles.fichaValor}>{linha.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Os arquivos ────────────────────────────────────────────────────────── */

export function DocumentosDoAto({ mov }: { mov: Pick<MovimentacaoDetail, 'id' | 'documentos' | 'temCertidao' | 'link'> }) {
  const temAlgum = mov.temCertidao || mov.link || mov.documentos.length > 0;
  if (!temAlgum) return null;

  // O link do PJe só aparece quando NÃO está na lista de peças: senão seria o
  // mesmo href duas vezes, com dois rótulos.
  const linkAvulso = mov.link && !mov.documentos.some(doc => doc.url === mov.link) ? mov.link : null;

  return (
    <div className={styles.docs}>
      {/* A PEÇA EM SI, quando o tribunal a serve: o PDF do despacho, da
          decisão, da sentença. Vem antes da certidão porque é o documento que
          o advogado abre para ler; a certidão prova a publicação dele. */}
      {mov.documentos.map((doc, i) => (
        doc.url ? (
          <DocumentoLink
            key={`${doc.url}-${i}`}
            url={doc.url}
            className={styles.botao}
            /* **O aviso vem de medição, e por isso é `title` e não bloqueio.**
               O PDPJ referencia mais peça do que serve: 195 de 309 pedidos de
               arquivo voltaram 404 (08/09/2026), e o backend marca as chaves
               que já falharam. O botão continua clicável — a peça pode abrir
               se a conta for parte no processo —, mas quem clica sabe antes
               que a chance é baixa, em vez de descobrir com uma aba vazia. */
            title={doc.provavelIndisponivel
              ? 'O tribunal costuma não servir este arquivo — o portal referencia a peça, mas o download volta vazio na maioria das vezes.'
              : undefined}
          >
            {doc.nome}{doc.provavelIndisponivel ? ' (pode não abrir)' : ''} ↗
          </DocumentoLink>
        ) : (
          // Documento TRANCADO: existe, mas o tribunal ainda não libera a
          // visualização (ex.: pendente de ciência no PJe) — o cadeado marca
          // essa diferença de um documento que simplesmente não existe.
          <p key={`indisponivel-${i}`} className={styles.docIndisponivel}>
            <Lock aria-hidden="true" size={13} strokeWidth={2} />
            <strong>{doc.nome}</strong><br />{doc.indisponibilidade}
          </p>
        )
      ))}

      {/* A CERTIDÃO DE PUBLICAÇÃO — o documento oficial do ato, e a única via
          que o caminho público entrega: vem do CNJ, sem captcha, com cabeçalho
          do tribunal, capa, destinatário, advogados com OAB e o teor integral.
          É o que se junta aos autos para demonstrar tempestividade. */}
      {mov.temCertidao && (
        <a
          href={`/api/movimentacoes/${encodeURIComponent(mov.id)}/certidao`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.botao} ${styles.botaoForte}`}
        >
          Certidão de publicação ↗
        </a>
      )}

      {/* Saída SECUNDÁRIA, e com o aviso: o link do PJe serve uma página com
          hCaptcha, não o documento. Prometer "baixar documento" e entregar um
          captcha é pior que não oferecer. */}
      {linkAvulso && (
        <>
          <a href={linkAvulso} target="_blank" rel="noopener noreferrer" className={`${styles.botao} ${styles.botaoFraco}`}>
            Ver no PJe ↗
          </a>
          <p className={styles.pjeAviso}>O tribunal pede captcha nesta página.</p>
        </>
      )}
    </div>
  );
}

/* ── O painel do feed ───────────────────────────────────────────────────── */

/** O painel se adapta ao conteúdo recebido, independentemente da fonte. */
export function AtoDetalhe({ mov }: { mov: MovimentacaoDetail }) {
  const cnj = mov.processData?.numero;
  // Com vencimento, a providência E a leitura do ato já moram dentro do card
  // do prazo (ver `PrazoDoAto`) — mostrá-las de novo aqui duplicaria as duas.
  // Sem vencimento (`Deadline.dataLimite` nulo, ou o ato nunca abriu prazo),
  // este é o único lugar onde elas aparecem.
  const temVencimento = Boolean(vencimentoDoAto(mov));

  return (
    <div className={styles.painel}>
      <PrazoDoAto mov={mov} />
      {!temVencimento && <ProvidenciaDoAto mov={mov} />}
      <div className={styles.conteudo}>
        <div className={styles.areaTexto}>
          {!temVencimento && <LeituraDoAto mov={mov} />}
          <TeorDoAto mov={mov} abrirAte={CHARS_ATO_ABERTO_PAINEL} />
        </div>
        <div className={styles.areaFicha}>
          <FichaDoAto mov={mov} />
          <DocumentosDoAto mov={mov} />
        </div>
      </div>
      <div className={styles.rodape}>
        <div className={styles.saidas}>
          <Link href={`/movimentacoes/${encodeURIComponent(mov.id)}`} className={styles.saida}>
            Abrir a página do ato →
          </Link>
          {cnj && (
            <Link href={`/processos/${encodeURIComponent(cnj)}`} className={styles.saida}>
              Ver o processo →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
