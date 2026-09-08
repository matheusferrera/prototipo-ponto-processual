import Link from 'next/link';
import { Clock3, Lock, Sparkles } from 'lucide-react';
import type { MovimentacaoDetail } from '@/lib/api.server';
import { grauLabel } from '@/lib/grau';
import { pedeConferencia, vencimentoDoAto } from '@/lib/movimentacao';
import { blocosDoAto } from '@/lib/ato-texto';
import { dataWallClock } from '@/lib/wall-clock';
import { DocumentoLink } from '../DocumentoLink/DocumentoLink';
import styles from './AtoDetalhe.module.css';

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
 * Como a data foi obtida, em uma frase — e a diferença entre o vencimento que
 * o tribunal publicou e o que nós calculamos.
 */
function procedenciaDoPrazo(mov: MovimentacaoDetail): string {
  const p = mov.prazo;
  const oficial = p?.origem === 'painel' || p?.origem === 'grid';
  if (oficial) return 'prazo publicado pelo tribunal';
  switch (p?.metodoPrazo) {
    case 'textoExplicito':   return 'os dias vieram escritos no ato';
    case 'prazoLegal':       return 'prazo legal do recurso, calculado por nós';
    case 'padraoCpc218':     return 'padrão de 5 dias do art. 218, § 3º, do CPC';
    case 'cienciaPublicacao':return 'mera ciência — a data é a da publicação';
    case 'analiseIa':        return 'derivado da leitura do ato';
    default:                 return 'calculado por nós';
  }
}

/** Até quando — denso, porque a linha logo acima já deu a data curta. */
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

  /* A segunda linha do bloco: os campos que o backend manda e que até
     06/09/2026 morriam no mapeador do front — natureza, canal, dobra e de quem
     é o prazo. São eles que dizem se a contagem começou na publicação ou na
     expedição, e se há dobra. */
  const qualificacao = [
    vencimento.dias && `prazo de ${vencimento.dias}`,
    p?.natureza && NATUREZA[p.natureza],
    p?.canal && CANAL[p.canal],
    p?.emDobro === true && 'em dobro',
    p?.emDobro === false && 'sem dobra',
    p?.deQuem && DE_QUEM[p.deQuem],
  ].filter(Boolean) as string[];

  const fundamento = p?.fundamento || mov.ia.fundamento;

  return (
    <section className={`${styles.prazo} ${tom}`}>
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
      </div>

      <div className={styles.prazoDetalhes}>
        {qualificacao.length > 0 && (
          <p className={styles.prazoQualificacao}>{qualificacao.join(' · ')}</p>
        )}

        <p className={styles.prazoProcedencia}>
          {fundamento ? `${fundamento} — ` : ''}{procedenciaDoPrazo(mov)}
          {vencimento.estimado && '. Não considera feriado local nem suspensão por portaria.'}
        </p>

        {p?.publicadoEm && (
          <p className={styles.prazoProcedencia}>
            Conta da publicação de {dataWallClock(new Date(p.publicadoEm))}
            {p.parte ? ` · intimado: ${p.parte}` : ''}
          </p>
        )}
      </div>
    </section>
  );
}

/* ── O que fazer ────────────────────────────────────────────────────────── */

export function ProvidenciaDoAto({ mov }: { mov: Pick<MovimentacaoDetail, 'ia'> }) {
  if (!mov.ia.acao) return null;
  const minha = mov.ia.deQuem === 'destinatario';

  return (
    <section className={`${styles.acao} ${minha ? styles.acaoMinha : styles.acaoOutra}`}>
      <span className={styles.acaoRotulo}>
        {minha ? 'você precisa' : 'providência de outra parte'}
      </span>
      <span className={styles.acaoTexto}>{mov.ia.acao}</span>
      {pedeConferencia(mov) && (
        <span className={styles.acaoConferir}>leitura de confiança baixa — confira o texto</span>
      )}
    </section>
  );
}

const CONFIANCA: Record<string, string> = {
  alta: 'confiança alta',
  media: 'confiança média',
  baixa: 'confiança baixa',
};

/* ── A leitura da IA ────────────────────────────────────────────────────── */

/**
 * O que a IA leu no ato — ao lado do teor, e não dentro dele.
 *
 * O par é deliberado: `TeorDoAto` é o que o tribunal escreveu, este é o que
 * entendemos disso. Até 07/09/2026 a leitura não existia como bloco — ela vinha
 * espalhada em três lugares condicionais: `ia.acao` só aparece com providência,
 * `ia.fundamento` só aparece pendurado no bloco de prazo, e `confianca` e
 * `analisadoEm` viravam uma linha discreta na ficha. Num ato de mera ciência —
 * sem prazo e sem ação, que é a maioria — a análise ficava INVISÍVEL, mesmo
 * tendo rodado.
 *
 * `analisadoEm` é o gate, e não `resumo`: é ele que distingue "a IA não leu" de
 * "a IA leu e concluiu que não há nada a fazer". Sem análise o bloco não existe
 * — nunca uma caixa vazia dizendo que não há leitura.
 */
export function LeituraIaDoAto({ mov }: { mov: Pick<MovimentacaoDetail, 'ia'> }) {
  const ia = mov.ia;
  if (!ia.analisadoEm && !ia.resumo) return null;

  /* O rodapé do bloco: quando foi lido e com que confiança. `confianca: baixa`
     não vai aqui — ela vira o aviso destacado abaixo, porque pedir conferência
     em letra miúda ao lado da data é escondê-la. */
  const carimbo = [
    ia.analisadoEm && `lido em ${dataWallClock(new Date(ia.analisadoEm))}`,
    ia.confianca && ia.confianca !== 'baixa' && CONFIANCA[ia.confianca],
  ].filter(Boolean) as string[];

  return (
    <section className={styles.leitura} aria-label="Leitura do ato pela IA">
      <div className={styles.leituraCabecalho}>
        <span className={styles.leituraRotulo}>
          <Sparkles size={13} aria-hidden="true" />
          Leitura do ato
        </span>
        {carimbo.length > 0 && <span className={styles.leituraCarimbo}>{carimbo.join(' · ')}</span>}
      </div>

      {/* O resumo REPETE o título da linha logo acima, e aqui isso é correto:
          na linha ele é a manchete, sem dizer que é leitura de máquina. É este
          bloco que o qualifica — e sem ele o advogado não tem como saber que o
          título não é o rótulo do tribunal. */}
      {ia.resumo && <p className={styles.leituraResumo}>{ia.resumo}</p>}

      {/* O fundamento só aparecia dentro do bloco de prazo. Ato lido que não
          abriu prazo perdia a única frase que explica o porquê da conclusão. */}
      {ia.fundamento && <p className={styles.leituraFundamento}>{ia.fundamento}</p>}

      {pedeConferencia(mov) && (
        <p className={styles.leituraConferir}>
          leitura de confiança baixa — confira o texto do ato antes de decidir
        </p>
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

  return (
    <div className={styles.painel}>
      <PrazoDoAto mov={mov} />
      <ProvidenciaDoAto mov={mov} />
      <div className={styles.conteudo}>
        <div className={styles.areaTexto}>
          <LeituraIaDoAto mov={mov} />
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
