import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { StatusDot } from '@/components/ui/StatusDot/StatusDot';
import { ExportProcessoPdfButton } from '@/components/processos/ExportProcessoPdfButton/ExportProcessoPdfButton';
import { getProcesso, getProcessoMovements, getProcessoPrazos } from '@/lib/api.server';
import { getAbsoluteUrl } from '@/lib/site-url';
import { buildQuery } from '@/lib/utils';
import type { Prazo, Processo, ProcessoParte, TimelineEvent } from '@/types';
import styles from './page.module.css';

const ABAS = ['movimentacoes', 'prazos', 'documentos'] as const;
type Aba = (typeof ABAS)[number];

const MOVS_PAGE = 20;
const MOVS_MAX = 100;

interface Props {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ aba?: string; movs?: string }>;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function displayDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

/** Distância humana até agora — "há 2h", "há 3d". */
function timeAgo(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  return `há ${Math.floor(days / 30)}mes`;
}



function prazoLabel(dias: number): string {
  if (dias < 0) return 'vencido';
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return `${dias} dias`;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  archived: 'Arquivado',
  suspended: 'Suspenso',
};

/** Título do processo: o confronto entre os polos, que é como o advogado o identifica. */
function confronto(processo: Processo): string {
  const ativo = processo.poloAtivo[0]?.nome ?? processo.parte;
  const passivo = processo.poloPassivo[0]?.nome;
  return passivo ? `${ativo} × ${passivo}` : ativo;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { numero } = await params;
  const processo = await getProcesso(decodeURIComponent(numero));

  if (!processo) {
    return { title: 'Processo não encontrado' };
  }

  const titulo = confronto(processo);
  const description = `${processo.materia} · ${processo.tribunal} · CNJ ${processo.cnj}`;
  const imageUrl = getAbsoluteUrl(`/processos/${numero}/opengraph-image`);

  return {
    title: titulo,
    description,
    openGraph: {
      title: titulo,
      description,
      type: 'article',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${titulo} — ${processo.cnj}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description,
      images: [imageUrl],
    },
  };
}

function TimelineItem({ e, isLast }: { e: TimelineEvent; isLast: boolean }) {
  const isNew = e.state === 'signal';
  // `e.title` é o RÓTULO do ato desde que a movimentação virou a unidade de
  // análise no backend; a leitura da IA é o que tem conteúdo. Mesmas regras da
  // lista de movimentações — as duas telas mostram o mesmo dado.
  const corpo = e.ia?.resumo || e.title;
  const rotulo = e.ia?.resumo ? e.title : null;
  const acao = e.ia?.acao ? { texto: e.ia.acao, minha: e.ia.deQuem === 'destinatario' } : null;
  const selo = e.origem === 'djen' ? 'diário' : null;
  return (
    <article className={`${styles.timelineItem}${isLast ? ` ${styles.timelineItemLast}` : ''}`}>
      {/* O item inteiro abre o ato. Camada esticada, e não um <Link> em volta
          de tudo, porque os links de documento moram aqui dentro e <a> dentro
          de <a> é HTML inválido — o React quebra na hidratação. Mesmo padrão
          do card de prazo (`PrazosView`), com o bônus de o texto do ato
          continuar selecionável. */}
      <Link
        href={`/movimentacoes/${e.id}`}
        className={styles.itemLink}
        aria-label={`Abrir o ato § ${e.n} — ${corpo}`}
      />

      <div className={styles.timelineDate}>
        <div className={isNew ? styles.timelineDateNew : undefined}>{e.date}</div>
        {/* O ano numa linha própria: a timeline de um processo atravessa anos
            — esta carteira tem ato de 2023 ao lado de ato de 2026 — e "4 set"
            sozinho obriga a deduzir de qual deles se trata pela posição na
            lista. Fica abaixo, e não colado no dia, para não roubar o peso da
            data que a pessoa procura primeiro. */}
        <div className={styles.timelineAno}>{e.ano}</div>
        {e.time && <div className={styles.timelineTime}>{e.time}</div>}
      </div>

      <div className={styles.timelineRail} aria-hidden="true">
        <div className={`${styles.timelineMarker}${isNew ? ` ${styles.timelineMarkerNew}` : ''}`} />
        {!isLast && <div className={styles.timelineLine} />}
      </div>

      <div className={styles.timelineContent}>
        <div className={styles.timelineMeta}>
          <span className={styles.timelineCode}>§ {e.n}</span>
          {e.label && <Seal variant="nova" />}
          {/* A publicação no diário não é um movimento do tribunal: é o aviso de
              que ele aconteceu, e sai dias depois. Sem o selo, ela e a linha do
              DataJud sobre o mesmo ato leem como duplicata na timeline. */}
          {selo && <Seal variant="outline" label={selo} />}
        </div>
        {/* O que aconteceu: a leitura da IA quando existe, o rótulo quando não */}
        <h3 className={styles.timelineTitle}>{corpo}</h3>
        {/* Só quando o título acima é o resumo — senão seria a frase repetida */}
        {rotulo && <p className={styles.timelineRotulo}>{rotulo}</p>}
        {acao && (
          <p className={acao.minha ? styles.timelineAcaoMinha : styles.timelineAcao}>
            <span className={styles.timelineAcaoLabel}>
              {acao.minha ? 'você precisa' : 'providência de outra parte'}
            </span>
            {acao.texto}
          </p>
        )}
        {e.documentos.length > 0 && (
          <ul className={styles.docList}>
            {e.documentos.map((doc, i) => (
              <li key={`${doc.url}-${i}`}>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.docLink}
                  title={`Abrir ${doc.nome} no PJe`}
                >
                  <FileText aria-hidden="true" size={13} strokeWidth={2} />
                  {doc.nome}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function PoloBlock({ titulo, partes }: { titulo: string; partes: ProcessoParte[] }) {
  return (
    <div className={styles.polo}>
      <h3 className={styles.capaLabel}>{titulo}</h3>
      {partes.length === 0 ? (
        <p className={styles.capaMuted}>Não extraído</p>
      ) : (
        <ul className={styles.poloList}>
          {partes.map((parte, i) => (
            <li key={`${parte.nome}-${i}`} className={styles.poloItem}>
              <span className={styles.poloNome}>{parte.nome}</span>
              <span className={styles.poloDoc}>
                {[parte.tipo, parte.documento].filter(Boolean).join(' · ')}
              </span>
              {parte.representantes.length > 0 && (
                <span className={styles.poloRepresentantes}>{parte.representantes.join(' · ')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CapaItem({ label, value }: { label: string; value: string }) {
  const muted = value === '—' || value === 'Não extraído';
  return (
    <div className={styles.capaItem}>
      <dt className={styles.capaLabel}>{label}</dt>
      <dd className={muted ? styles.capaMuted : styles.capaValue}>{value}</dd>
    </div>
  );
}

function PrazoItem({ prazo }: { prazo: Prazo }) {
  const tone = prazo.diasRestantes !== null && prazo.diasRestantes <= 2
    ? styles.prazoUrgente
    : prazo.diasRestantes !== null && prazo.diasRestantes <= 7 ? styles.prazoProximo : styles.prazoCalmo;

  return (
    <li className={styles.prazoItem}>
      <span className={`${styles.prazoChip} ${tone}`}>
        {prazo.diasRestantes === null ? 'Sem data' : prazoLabel(prazo.diasRestantes)}
      </span>
      <div className={styles.prazoBody}>
        <span className={styles.prazoTipo}>{prazo.tipo}</span>
        <span className={styles.prazoMeta}>
          {prazo.vencimento ? `vence em ${prazo.vencimento}` : 'PJe ainda não informou a data limite'}
          {prazo.parte && ` · ${prazo.parte}`}
        </span>
      </div>
    </li>
  );
}

export default async function ProcessoDetailPage({ params, searchParams }: Props) {
  const { numero } = await params;
  const sp = await searchParams;
  const decodedNumero = decodeURIComponent(numero);

  const processo = await getProcesso(decodedNumero);
  if (!processo) notFound();

  const aba: Aba = (ABAS as readonly string[]).includes(sp.aba ?? '') ? sp.aba as Aba : 'movimentacoes';
  const requestedMovs = Number(sp.movs);
  const movsLimit = Number.isInteger(requestedMovs) && requestedMovs > 0
    ? Math.min(requestedMovs, MOVS_MAX)
    : MOVS_PAGE;

  // a aba de documentos precisa varrer todas as movimentações, não só a página atual
  const [{ events: timeline, total: totalMovs }, prazos] = await Promise.all([
    getProcessoMovements(processo.id, aba === 'documentos' ? MOVS_MAX : movsLimit),
    getProcessoPrazos(processo.id),
  ]);

  const syncLabel = processo.state === 'alert' ? 'Erro de sincronização' : 'Monitorado';
  const syncState = processo.state === 'alert' ? 'alert' : 'quiet';

  /**
   * As peças da aba de documentos, de DUAS fontes.
   *
   * `evento.documentos` vem de `Movement.documentos`, que só o scraper
   * autenticado preenche — numa carteira 100% DJEN a aba dizia "nenhum
   * documento extraído das movimentações" para um acervo inteiro que tem
   * documento, só que por outra via.
   *
   * A outra via é a CERTIDÃO DE PUBLICAÇÃO: o PDF oficial do CNJ, com
   * cabeçalho do tribunal, capa do processo, destinatário, todos os advogados
   * com OAB e o teor integral. Sai por `/api/movimentacoes/{id}/certidao`, que
   * confere a sessão — a chave que abre o documento no CNJ nunca chega ao
   * browser.
   */
  const documentos = timeline.flatMap(evento => [
    ...evento.documentos.map(doc => ({
      url: doc.url, nome: doc.nome, oficial: false,
      movimentacao: evento.title, data: `${evento.date} ${evento.ano}`, n: evento.n,
    })),
    ...(evento.temCertidao
      ? [{
          url: `/api/movimentacoes/${encodeURIComponent(evento.id)}/certidao`,
          nome: 'Certidão de publicação',
          oficial: true,
          movimentacao: evento.title, data: `${evento.date} ${evento.ano}`, n: evento.n,
        }]
      : []),
  ]);

  const basePath = `/processos/${encodeURIComponent(processo.cnj)}`;
  const abaHref = (destino: Aba) =>
    `${basePath}${buildQuery({}, { aba: destino === 'movimentacoes' ? undefined : destino })}`;
  const maisMovsHref =
    `${basePath}${buildQuery({ aba: sp.aba }, { movs: String(Math.min(movsLimit + MOVS_PAGE, MOVS_MAX)) })}`;


  return (
    <AppLayout
      active="Processos"
      mobileTitle="Processo"
      mobileBreadcrumb={`Processos / ${processo.cnj.slice(0, 14)}...`}
      mobileActions={processo.link ? (
        <a
          href={processo.link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.mobileHeaderAction} ${styles.mobileHeaderActionPrimary}`}
          aria-label="Abrir processo no PJE"
          title="Ver no PJE"
        >
          <ExternalLink aria-hidden="true" size={18} strokeWidth={2} />
        </a>
      ) : undefined}
    >
      <div className={styles.pageShell}>
        <nav className={styles.breadcrumb} aria-label="Navegação do processo">
          <Link href="/processos" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
            Carteira
          </Link>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>{processo.cnj}</span>
          <div className={styles.breadcrumbSpacer} />
          <ExportProcessoPdfButton
            processo={processo}
            prazos={prazos}
            className={styles.actionButton}
          />
          {processo.link ? (
            <a
              href={processo.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            >
              <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
              Ver no PJE
            </a>
          ) : (
            <span
              title="Link do PJE indisponível"
              className={`${styles.actionButton} ${styles.actionButtonDisabled}`}
              aria-disabled="true"
            >
              <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
              Ver no PJE
            </span>
          )}
        </nav>

        <section className={styles.hero} aria-labelledby="processo-title">
          <div className={styles.heroMeta}>
            <TribTag label={processo.tribunal} />
            <span className={styles.metaSeparator}>·</span>
            <span className={styles.heroMetaText}>{processo.classeJudicial ?? processo.materia}</span>
            <span className={styles.metaSeparator}>·</span>
            <span className={styles.heroMetaText}>{processo.grau} grau</span>
            <span className={styles.metaSeparator}>·</span>
            <span className={styles.heroMetaText}>{STATUS_LABELS[processo.status] ?? processo.status}</span>
            <span className={styles.metaSeparator}>·</span>
            <div className={styles.statusPill}>
              <StatusDot state={syncState} />
              <span>{syncLabel}</span>
            </div>
          </div>
          <div className={styles.cnj}>{processo.cnj}</div>
          <h1 id="processo-title" className={styles.title}>{confronto(processo)}</h1>

          {processo.syncError && (
            <p className={styles.syncErrorBanner} role="status">
              <AlertTriangle aria-hidden="true" size={15} strokeWidth={2} />
              <span>Falha na última sincronização: {processo.syncError}</span>
            </p>
          )}

          <dl className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <dt>Órgão julgador</dt>
              <dd>{processo.orgaoJulgador}</dd>
            </div>
            <div className={styles.infoItem}>
              <dt>Assunto</dt>
              <dd>{processo.assunto ?? '—'}</dd>
            </div>
            <div className={styles.infoItem}>
              <dt>Última mov.</dt>
              <dd>{processo.ultimaMov}</dd>
            </div>
            <div className={styles.infoItem}>
              <dt>Alertas WhatsApp</dt>
              <dd className={processo.whatsEnabled ? styles.infoEmphasis : styles.infoMuted}>
                {processo.whatsEnabled ? 'Ativos' : 'Desativados'}
              </dd>
            </div>
          </dl>
        </section>

        <div className={styles.body}>
          <div className={styles.main}>
            <nav className={styles.tabs} aria-label="Seções do processo">
              <Link
                href={abaHref('movimentacoes')}
                className={aba === 'movimentacoes' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                aria-current={aba === 'movimentacoes' ? 'page' : undefined}
              >
                Movimentações <span className={styles.tabCount}>{totalMovs}</span>
              </Link>
              <Link
                href={abaHref('prazos')}
                className={aba === 'prazos' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                aria-current={aba === 'prazos' ? 'page' : undefined}
              >
                Prazos <span className={styles.tabCount}>{prazos.length}</span>
              </Link>
              <Link
                href={abaHref('documentos')}
                className={aba === 'documentos' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                aria-current={aba === 'documentos' ? 'page' : undefined}
              >
                Documentos <span className={styles.tabCount}>{documentos.length}</span>
              </Link>
            </nav>

            {aba === 'movimentacoes' && (
              <section className={styles.timeline} aria-labelledby="movimentacoes-title">
                <div className={styles.sectionHeader}>
                  <h2 id="movimentacoes-title">§ MOVIMENTAÇÕES</h2>
                  <div className={styles.sectionRule} />
                  <span>do mais recente ao mais antigo</span>
                </div>

                {timeline.length === 0 ? (
                  <div className={styles.emptyState}>§ Nenhuma movimentação registrada.</div>
                ) : (
                  <>
                    {timeline.map((e, i) => (
                      <TimelineItem key={e.id} e={e} isLast={i === timeline.length - 1} />
                    ))}
                    <div className={styles.loadMore}>
                      <span className={styles.loadMoreInfo}>{timeline.length} de {totalMovs}</span>
                      {timeline.length < Math.min(totalMovs, MOVS_MAX) && (
                        <Link href={maisMovsHref} className={styles.actionButton} scroll={false}>
                          Carregar mais
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </section>
            )}

            {aba === 'prazos' && (
              <section className={styles.panel} aria-labelledby="prazos-title">
                <div className={styles.sectionHeader}>
                  <h2 id="prazos-title">§ PRAZOS</h2>
                  <div className={styles.sectionRule} />
                  <span>do vencimento mais próximo ao mais distante</span>
                </div>
                {prazos.length === 0 ? (
                  <div className={styles.emptyState}>§ Nenhum prazo registrado para este processo.</div>
                ) : (
                  <ul className={styles.prazoList}>
                    {prazos.map(prazo => <PrazoItem key={prazo.id} prazo={prazo} />)}
                  </ul>
                )}
              </section>
            )}

            {aba === 'documentos' && (
              <section className={styles.panel} aria-labelledby="documentos-title">
                <div className={styles.sectionHeader}>
                  <h2 id="documentos-title">§ DOCUMENTOS</h2>
                  <div className={styles.sectionRule} />
                  <span>certidões de publicação e peças anexadas</span>
                </div>
                {documentos.length === 0 ? (
                  <div className={styles.emptyState}>
                    § Nenhum documento neste processo ainda. A certidão de publicação aparece aqui
                    assim que o ato for varrido do diário.
                  </div>
                ) : (
                  <ul className={styles.documentoList}>
                    {documentos.map((doc, i) => (
                      <li key={`${doc.url}-${i}`} className={styles.documentoItem}>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.docLink}>
                          <FileText aria-hidden="true" size={14} strokeWidth={2} />
                          {doc.nome}
                        </a>
                        <span className={styles.documentoMeta}>
                          § {doc.n} · {doc.data} · {doc.movimentacao}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>

          {/* No mobile a capa vira acordeão; no desktop o summary some e ela fica sempre aberta. */}
          <details className={styles.capa} open>
            <summary className={styles.capaSummary}>Capa do processo</summary>
            <div className={styles.capaBody}>
              <PoloBlock titulo="Polo ativo" partes={processo.poloAtivo} />
              <PoloBlock titulo="Polo passivo" partes={processo.poloPassivo} />

              <dl className={styles.capaGrid}>
                <CapaItem label="Classe judicial" value={processo.classeJudicial ?? '—'} />
                <CapaItem label="Assunto" value={processo.assunto ?? '—'} />
                <CapaItem label="Órgão julgador" value={processo.orgaoJulgador} />
                <CapaItem label="Grau" value={`${processo.grau} grau`} />
                <CapaItem label="Autuado em" value={displayDate(processo.autuadoEm)} />
                <CapaItem
                  label="Valor da causa"
                  value={processo.valorCausa == null ? '—' : currencyFormatter.format(processo.valorCausa)}
                />
                <CapaItem label="Situação" value={STATUS_LABELS[processo.status] ?? processo.status} />
                <CapaItem label="Última verificação" value={timeAgo(processo.lastScrapedAt)} />
              </dl>
            </div>
          </details>
        </div>
      </div>
    </AppLayout>
  );
}
