import type { Metadata } from 'next';
import Link from 'next/link';
import { dataWallClock } from '@/lib/wall-clock';
import { notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { getMovimentacao, grauLabel } from '@/lib/api.server';
import { vencimentoDoAto, pedeConferencia } from '@/lib/movimentacao';
import { getAbsoluteUrl } from '@/lib/site-url';
import styles from './page.module.css';
import { blocosDoAto } from '@/lib/ato-texto';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const mov = await getMovimentacao(id);

  if (!mov) return { title: 'Movimentação não encontrada' };

  const proc = mov.processData;
  const tribunal = proc?.tribunal.replace(/G[12]$/, '') ?? '—';
  const partes = proc?.summary?.partes?.split(';')[0].trim() ?? '—';
  const description = proc ? `${tribunal} · CNJ ${proc.numero}` : 'Movimentação';
  const imageUrl = getAbsoluteUrl('/opengraph-image');

  return {
    title: `Movimentação — ${partes}`,
    description,
    openGraph: {
      title: `Movimentação — ${partes}`,
      description,
      type: 'article',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: 'Ponto Processual — Movimentação' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Movimentação — ${partes}`,
      description,
      images: [imageUrl],
    },
  };
}

/**
 * Acima disto o inteiro teor abre FECHADO, atrás de um `<details>`.
 *
 * O corte de 20.000 caracteres na gravação caiu em 03/09/2026, então o campo
 * guarda o ato inteiro: média de 3,8 KB, 288 KB no maior medido — editais de
 * massa com centenas de intimados. Despejar isso aberto empurraria tudo o mais
 * da página para fora da tela, e é justamente o caso em que ninguém quer ler o
 * texto todo. Abaixo do limite o ato aparece aberto, que é o caso comum.
 */
const CHARS_ATO_ABERTO = 2_400;

export default async function MovimentacaoDetailPage({ params }: Props) {
  const { id } = await params;
  const mov = await getMovimentacao(id);
  if (!mov) notFound();

  const proc = mov.processData;
  const tribunal = proc?.tribunal.replace(/G[12]$/, '') ?? '—';
  const cnj = proc?.numero ?? '—';
  const partes = proc?.summary?.partes?.split(';')[0].trim() ?? '—';
  const vara = proc?.summary?.vara ?? '—';
  const grau = grauLabel(proc?.grau);
  const distribuicao = proc?.summary?.distribuicao ?? '—';

  const detectedAt = new Date(mov.detectedAt);
  const isNew = mov.novo;

  // A data que a página exibe é a da PUBLICAÇÃO, não a da detecção: é ela que
  // faz a intimação correr e de quem o prazo é contado. `detectedAt` responde
  // "quando nós vimos", que é operação nossa, e vive no rodapé.
  const publicadoEm = dataWallClock(new Date(mov.ocorridoEm));
  const detectadoEm = dataWallClock(detectedAt);

  const vencimento = vencimentoDoAto(mov);
  const conferir = pedeConferencia(mov);
  const acaoMinha = mov.ia.deQuem === 'destinatario';
  const texto = mov.textoOriginal;
  const atoLongo = (texto?.length ?? 0) > CHARS_ATO_ABERTO;

  return (
    <AppLayout active="Movimentações">
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* Breadcrumb — Movimentações / CNJ / rótulo do ato. O CNJ no meio é o
            degrau que faltava: sem ele o caminho pulava do feed direto para o
            ato e não havia volta para o processo daqui de cima. Sem o cuid da
            movimentação, que aparecia aqui e de novo dentro do card — ninguém
            procura um ato por `cmtm3v7mq000v…`. */}
        <div
          className={styles.breadcrumb}
          style={{ borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}
        >
          <Link href="/movimentacoes" style={{ fontSize: 11, color: 'var(--ink-3)', textDecoration: 'none' }}>← Movimentações</Link>
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>/</span>
          {proc ? (
            <Link
              href={`/processos/${encodeURIComponent(cnj)}`}
              style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              {cnj}
            </Link>
          ) : (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>{cnj}</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>/</span>
          <span
            className={styles.breadcrumbCurrent}
            style={{ fontSize: 11, color: 'var(--ink-3)' }}
            title={mov.descricao}
          >
            {mov.descricao}
          </span>
          <div style={{ flex: 1 }} />
          {proc?.summary?.link && (
            <a
              href={proc.summary.link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.pillBtn}
              style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 0, cursor: 'pointer', textDecoration: 'none' }}
            >
              Abrir no tribunal ↗
            </a>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            HERO — O QUE ACONTECEU.

            Antes o maior tipo da página era o nome do cliente e o segundo era
            o CNJ; a leitura do ato ficava em corpo 14 no meio de um card, e a
            providência, em cinza, abaixo dela. Mas quem abre esta página já
            sabe de que processo veio — clicou nele no feed. A pergunta que
            trouxe a pessoa aqui é "o que o juiz decidiu e o que eu faço com
            isso", e é ela que o hero passa a responder.
            ───────────────────────────────────────────────────────────────── */}
        <div
          className={styles.hero}
          style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <TribTag label={tribunal} />
            {/* O rótulo só vem para cá quando o TÍTULO é a leitura da IA. Sem
                análise o título já É o rótulo, e repeti-lo aqui escreveria
                "Pauta de Julgamento — 3ª Turma Criminal" duas vezes, uma sobre
                a outra. Mesma regra do feed. */}
            {mov.ia.resumo && (
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>
                {mov.descricao}
              </span>
            )}
            {isNew && <Seal variant="nova" />}
            {mov.origem === 'djen' && <Seal variant="outline" label="diário" />}
          </div>

          {/* A leitura do ato é o título. Quando a IA não rodou, o rótulo sobe
              para cá — nunca fica sem manchete. */}
          <h1 className={styles.title} style={{ fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em', textWrap: 'balance', maxWidth: '68ch' }}>
            {mov.ia.resumo || mov.descricao}
          </h1>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <Link
              href={`/processos/${encodeURIComponent(cnj)}`}
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none', borderBottom: '1px solid var(--line)' }}
            >
              {partes}
            </Link>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>{cnj}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>publicado em {publicadoEm}</span>
          </div>
        </div>

        <div className={styles.main} style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div className={styles.timeline} style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>

            {/* ───────────────────────────────────────────────────────────
                ATÉ QUANDO. Segundo bloco, e em destaque, porque é a decisão
                que o advogado toma nesta tela. O `Deadline` está no banco
                ligado ao ato desde 03/09/2026 e nenhuma tela o mostrava: o
                feed dizia "apresentar contrarrazões… 15 dias úteis" e a pessoa
                contava de cabeça.
                ─────────────────────────────────────────────────────────── */}
            {vencimento && (
              <section
                style={{
                  border: `1px solid ${vencimento.emDias < 0 ? 'var(--alert)' : vencimento.urgente ? 'var(--signal)' : 'var(--brick)'}`,
                  background: vencimento.emDias < 0 ? 'var(--alert-soft)' : vencimento.urgente ? 'var(--signal-soft)' : 'var(--brick-soft)',
                  padding: '18px 20px',
                  marginBottom: 28,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-2)' }}>
                    {vencimento.emDias < 0 ? 'prazo vencido' : 'prazo em aberto'}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, lineHeight: 1.1, color: 'var(--ink)' }}>
                    {vencimento.extenso}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{vencimento.quando}</span>
                  {vencimento.dias && (
                    <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>· {vencimento.dias} declarados no ato</span>
                  )}
                </div>

                {/* De onde saiu o número de dias. Sem isto o prazo é um número
                    sem procedência, e conferir custa uma ida ao tribunal. */}
                {mov.ia.fundamento && (
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)', marginTop: 10, maxWidth: '70ch' }}>
                    {mov.ia.fundamento}
                  </p>
                )}

                {/* A ressalva que o "≈" do feed abrevia. Só `textoExplicito` é
                    o ato dizendo os dias; o resto é cálculo nosso sobre a regra
                    do art. 4º da Lei 11.419, e o cálculo não conhece feriado
                    estadual, prazo em dobro nem suspensão por portaria local. */}
                {vencimento.estimado && (
                  <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)', marginTop: 10, maxWidth: '70ch' }}>
                    Data <strong style={{ fontWeight: 600 }}>calculada por nós</strong> a partir da publicação — o tribunal não a
                    publicou. Não considera feriado local, prazo em dobro nem suspensão por portaria.
                  </p>
                )}
              </section>
            )}

            {/* A providência. Fora do card do ato: é a única coisa acionável da
                página e estava em cinza no meio de um bloco verde. */}
            {mov.ia.acao && (
              <section
                style={{
                  border: `1px solid ${acaoMinha ? 'var(--brick)' : 'var(--line)'}`,
                  background: acaoMinha ? 'var(--paper)' : 'var(--paper-2)',
                  padding: '16px 20px',
                  marginBottom: 28,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: acaoMinha ? 'var(--brick)' : 'var(--ink-3)', marginBottom: 6 }}>
                  {acaoMinha ? 'você precisa' : 'providência de outra parte'}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.5, color: acaoMinha ? 'var(--ink)' : 'var(--ink-2)', maxWidth: '70ch' }}>
                  {mov.ia.acao}
                </div>
                {conferir && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--alert)', marginTop: 10 }}>
                    leitura de confiança baixa — confira o texto abaixo
                  </div>
                )}
              </section>
            )}

            {/* ───────────────────────────────────────────────────────────
                O TEXTO. A íntegra do ato, como o diário publicou.

                Estava no banco (`Movement.textoOriginal`) e não aparecia em
                tela nenhuma: o advogado lia um resumo de IA e, para conferir,
                abria o PJe — o que anula boa parte do valor de ter lido.
                ─────────────────────────────────────────────────────────── */}
            {texto ? (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--brick)', letterSpacing: '0.05em' }}>
                    § ÍNTEGRA DO ATO
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                    {texto.length.toLocaleString('pt-BR')} caracteres
                  </span>
                </div>

                {/* `<details>` nativo, sem JavaScript: a página é Server
                    Component e um edital de 288 KB não pode abrir empurrando o
                    resto para fora da tela. Abaixo do limite abre sozinho. */}
                <details open={!atoLongo} className={styles.ato}>
                  <summary className={styles.atoSummary}>
                    {atoLongo ? 'Ler o ato na íntegra' : 'Texto publicado'}
                  </summary>
                  <div className={styles.atoTexto}>
                    {/* Blocos, e não um `{texto}` corrido: o DJEN entrega o ato
                        como UM parágrafo — 0 de 1.145 atos do acervo têm uma
                        quebra de linha, com média de 5.598 caracteres. Ver
                        `blocosDoAto`, que só encontra os rótulos que o próprio
                        PJe imprime e quebra ali, sem alterar uma vírgula. */}
                    <div className={styles.atoLinhas}>
                      {blocosDoAto(texto).map((bloco, i) => {
                        const corpo = bloco.corpo.trim();
                        /* Rótulo sem corpo é CABEÇALHO, não bloco vazio: no
                           original o `Destinatários:` vem colado no `APELADO:`
                           seguinte. Sem esta distinção ele aparecia solto, com
                           um vão embaixo, e lia como falha de renderização. */
                        return (
                          <p key={i} className={corpo ? styles.atoBloco : styles.atoCabecalho}>
                            {bloco.rotulo && <span className={styles.atoRotulo}>{bloco.rotulo}</span>}
                            {corpo}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </details>
              </section>
            ) : (
              <section style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, maxWidth: '70ch' }}>
                Esta linha veio do painel do tribunal, que informa o rótulo do movimento e não o texto do
                ato. O inteiro teor só existe nas publicações do diário.
              </section>
            )}
          </div>

          {/* Sidebar — o processo, e só. "Sync: success" e a bolinha vermelha
              de "Não monitorado" saíram: são estado interno da varredura, e
              processo vindo da consulta pública é `monitored: false` por
              construção — a bolinha assustava sem informar nada. */}
          <aside className={styles.sidebar} style={{ background: 'var(--paper-2)', overflow: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginBottom: 12 }}>§ Processo</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{partes}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{cnj}</div>
            <div style={{ height: 1, background: 'var(--line-soft)', margin: '12px 0' }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>{vara}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{grau} grau · distribuído em {distribuicao}</div>

            <Link
              href={`/processos/${encodeURIComponent(cnj)}`}
              className={styles.pillBtn}
              style={{ display: 'inline-flex', alignItems: 'center', marginTop: 16, fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, border: '1px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 0, textDecoration: 'none' }}
            >
              Ver processo →
            </Link>

            {(mov.temCertidao || mov.link || mov.documentos.length > 0) && (
              <>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', marginTop: 28, marginBottom: 12 }}>§ Documento</div>

                {/* A PEÇA EM SI, quando o tribunal a serve: o PDF do despacho,
                    da decisão, da sentença. Vem antes da certidão porque é o
                    documento que o advogado abre para ler; a certidão prova a
                    publicação dele. `mov.link` é excluído aqui porque, quando
                    existe, ele já está nesta lista — seria o mesmo href duas
                    vezes com dois rótulos. */}
                {mov.documentos.map((doc, i) => (
                  <a
                    key={`${doc.url}-${i}`}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.pillBtn}
                    style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 8, fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, border: '1px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 0, textDecoration: 'none' }}
                  >
                    {doc.nome} ↗
                  </a>
                ))}

                {/* A CERTIDÃO DE PUBLICAÇÃO — o documento oficial do ato, e a
                    única via que o caminho público entrega. Vem do CNJ, sem
                    captcha, com cabeçalho do tribunal, capa, destinatário,
                    todos os advogados com OAB e o teor integral: é o que se
                    junta aos autos para demonstrar tempestividade. */}
                {mov.temCertidao && (
                  <a
                    href={`/api/movimentacoes/${encodeURIComponent(mov.id)}/certidao`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.pillBtn}
                    style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 0, textDecoration: 'none' }}
                  >
                    Certidão de publicação ↗
                  </a>
                )}

                {/* O link do PJe fica como saída SECUNDÁRIA e com o aviso: ele
                    serve uma página com hCaptcha, não o documento. Prometer
                    "baixar documento" e entregar um captcha é pior que não
                    oferecer. */}
                {mov.link && !mov.documentos.some(doc => doc.url === mov.link) && (
                  <>
                    <a
                      href={mov.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.pillBtn}
                      style={{ display: 'inline-flex', alignItems: 'center', marginTop: 8, fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink-2)', borderRadius: 0, textDecoration: 'none' }}
                    >
                      Ver no PJe ↗
                    </a>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.45 }}>
                      O tribunal pede captcha nesta página.
                    </div>
                  </>
                )}
              </>
            )}

            {/* Quando NÓS vimos — operação nossa, não fato do processo. Fica no
                rodapé da coluna, uma vez só: aparecia três vezes na página. */}
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 28, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
              detectada em {detectadoEm}
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
