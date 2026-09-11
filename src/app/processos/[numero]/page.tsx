import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { StatusDot } from '@/components/ui/StatusDot/StatusDot';
import { ExportProcessoPdfButton } from '@/components/processos/ExportProcessoPdfButton/ExportProcessoPdfButton';
import { AnalisarProcessoButton } from '@/components/processos/AnalisarProcessoButton/AnalisarProcessoButton';
import { ProcessoPanorama } from '@/components/processos/ProcessoPanorama/ProcessoPanorama';
import { CopiarCnj } from '@/components/processos/ProcessoPanorama/ProcessoControls';
import { PrazoRow } from '@/components/prazos/PrazoRow/PrazoRow';
import { nomeDoCaso, nomeLegivel } from '@/lib/processo-apresentacao';
import { getAnalisesDoProcesso, getDocumentosCount, getDocumentosDoProcesso, getProcesso, getProcessoMovements, getProcessoPrazos } from '@/lib/api.server';
import { getAbsoluteUrl } from '@/lib/site-url';
import { buildQuery } from '@/lib/utils';
import { parseCategorias } from '@/lib/categoria-movimentacao';
import { ProcessoMovementFilters } from '@/components/movimentacoes/ProcessoMovementFilters/ProcessoMovementFilters';
import { TimelineProcesso } from '@/components/movimentacoes/TimelineProcesso/TimelineProcesso';
import { AnalisesIa } from '@/components/processos/AnalisesIa/AnalisesIa';
import docStyles from '@/components/movimentacoes/documentos.module.css';
import { DocumentoLink } from '@/components/movimentacoes/DocumentoLink/DocumentoLink';
import type { Processo, ProcessoParte } from '@/types';
import styles from './page.module.css';

const ABAS = ['movimentacoes', 'prazos', 'documentos', 'ia'] as const;
type Aba = (typeof ABAS)[number];

const MOVS_PAGE = 50;

interface Props {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ aba?: string; movs?: string; cat?: string | string[]; q?: string; from?: string; to?: string; sort?: string; page?: string }>;
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



const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  archived: 'Arquivado',
  suspended: 'Suspenso',
};

/** Título do processo: o confronto entre os polos, que é como o advogado o identifica. */
function confronto(processo: Processo): string {
  const { ativo, passivo } = nomeDoCaso(processo);
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

function PoloBlock({ titulo, partes }: { titulo: string; partes: ProcessoParte[] }) {
  return (
    <div className={styles.polo}>
      <h3 className={styles.capaLabel}>{titulo}</h3>
      {partes.length === 0 ? (
        <p className={styles.capaMuted}>Partes ainda não disponíveis nesta consulta.</p>
      ) : (
        <ul className={styles.poloList}>
          {partes.map((parte, i) => (
            <li key={`${parte.nome}-${i}`} className={styles.poloItem}>
              <span className={styles.poloNome}>{nomeLegivel(parte.nome)}</span>
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

export default async function ProcessoDetailPage({ params, searchParams }: Props) {
  const { numero } = await params;
  const sp = await searchParams;
  const decodedNumero = decodeURIComponent(numero);

  const processo = await getProcesso(decodedNumero);
  if (!processo) notFound();

  const aba: Aba = (ABAS as readonly string[]).includes(sp.aba ?? '') ? sp.aba as Aba : 'movimentacoes';
  const requestedPage = Number(sp.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const cat = Array.isArray(sp.cat) ? sp.cat.join(',') : sp.cat;
  const categorias = parseCategorias(cat);
  const todas = categorias.length === 0;
  const sort = sp.sort === 'asc' ? 'asc' : 'desc';
  const validDate = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : undefined;
  const from = validDate(sp.from);
  const to = validDate(sp.to);
  const filters = { q: sp.q?.trim(), from, to, sort, page } as const;

  // a aba de documentos filtra por `comDocumento` no backend e pagina por
  // baixo até esgotar o que existe (ver `getDocumentosDoProcesso`) — não é
  // mais "as 100 movimentações mais recentes", é "todas as documentadas".
  const [{ events: timeline, total: totalMovs }, prazos, documentosCount, recentes, dossieIa] = await Promise.all([
    aba === 'documentos'
      ? getDocumentosDoProcesso(processo.id)
      : getProcessoMovements(processo.id, MOVS_PAGE, todas ? ['todas'] : categorias, filters),
    getProcessoPrazos(processo.id),
    // Nas OUTRAS abas: o contador do badge da aba Documentos é um `limit=1`
    // filtrado, então é barato mesmo fora dela — mesmo padrão do contador de
    // Movimentações (`recentes.total`) e de Prazos (`prazos.length`).
    aba === 'documentos' ? Promise.resolve(null) : getDocumentosCount(processo.id),
    // O panorama não muda ao filtrar, paginar ou inverter a timeline.
    getProcessoMovements(processo.id, 20, ['todas'], { sort: 'desc' }),
    // Mesma regra: uma ida a mais que só a aba de IA consome. O dossiê traz as
    // três famílias de análise numa chamada — buscá-las nas rotas separadas
    // seriam três, com três formatos.
    aba === 'ia' ? getAnalisesDoProcesso(processo.id) : Promise.resolve(null),
  ]);
  // Na aba de documentos o `total` da própria busca já é a contagem certa;
  // nas outras, veio da chamada dedicada acima.
  const totalDocumentos = aba === 'documentos' ? totalMovs : documentosCount ?? 0;

  const syncLabel = processo.syncError ? 'Falha na última consulta'
    : processo.lastScrapedAt ? `Última consulta ${timeAgo(processo.lastScrapedAt)}` : 'Aguardando primeira consulta';
  const syncState = processo.syncError ? 'alert' : 'quiet';
  const grau = processo.grau === '1' || processo.grau === '2' ? `${processo.grau}º grau` : 'Grau não informado';

  /**
   * As peças da aba de documentos, de TRÊS fontes — e cada uma existe porque a
   * anterior não cobria um acervo inteiro.
   *
   * 1. `evento.documentos` — o que o tribunal anexou ao ato, mais o PDF que a
   *    fonte serve por rota (`baixavel`/`temDocumentoDoAto`, resolvidos em
   *    `toDocumentos`). Sozinho, deixava a aba vazia numa carteira 100% DJEN.
   * 2. A CERTIDÃO DE PUBLICAÇÃO de cada ato: o PDF oficial do CNJ, com cabeçalho
   *    do tribunal, capa, destinatário, advogados com OAB e o teor integral.
   *
   * Em todas, a chave que abre o documento na origem fica no backend; o que a
   * tela recebe é um caminho `/api/...` que confere a sessão.
   *
   * **Havia uma terceira e uma quarta, e as duas saíram em 08/09/2026** — não
   * por decisão de tela, mas porque as rotas do backend deixaram de existir
   * quando as fontes foram para `_backup/` (07/09):
   *
   *   `GET /processes/{id}/documentos/{tribunal}/{doc}` — a peça pelo scraper
   *     autenticado, que alimentava o "catálogo público" do processo;
   *   `GET /processes/{id}/certidao-andamento` — a certidão de andamento do
   *     STJ, o único documento que cobria a timeline inteira lá.
   *
   * As duas respondiam **404 em HTML**, e o `res.json()` do proxy estourava
   * nele: a tela dizia "Serviço indisponível" em vez de "não existe". Oferecer
   * um botão que não abre é pior que não oferecer — daí terem saído em vez de
   * ficarem esperando as fontes voltarem.
   */
  const documentos: Array<{ url: string; nome: string; oficial: boolean; movimentacao: string; data: string; n: string; indisponibilidade?: string }> = [
    ...timeline.flatMap(evento => [
      ...evento.documentos.map(doc => ({
        url: doc.url, nome: doc.nome, oficial: false, indisponibilidade: doc.indisponibilidade,
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
    ]),
  ];

  const basePath = `/processos/${encodeURIComponent(processo.cnj)}`;
  const abaHref = (destino: Aba) =>
    `${basePath}${buildQuery({}, { aba: destino === 'movimentacoes' ? undefined : destino })}`;


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
          aria-label="Abrir processo no tribunal"
          title="Abrir no tribunal"
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
        </nav>

        <section className={styles.hero} aria-labelledby="processo-title">
          <div className={styles.headerMain}>
            <div className={styles.identity}>
              <CopiarCnj cnj={processo.cnj} />
              <h1 id="processo-title" className={styles.title}>{confronto(processo)}</h1>
              {nomeDoCaso(processo).outras > 0 && <a href="#partes-do-processo" className={styles.otherParties}>+{nomeDoCaso(processo).outras} partes · ver detalhes</a>}
            </div>
            <div className={styles.headerActions}>
              <AnalisarProcessoButton processId={processo.id} numero={processo.cnj} className={styles.actionButton} />
              <ExportProcessoPdfButton processo={processo} prazos={prazos} className={styles.actionButton} />
          {processo.link ? (
            <a
              href={processo.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            >
              <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
              Abrir no tribunal
            </a>
          ) : (
            <span
              title="Link do tribunal indisponível"
              className={`${styles.actionButton} ${styles.actionButtonDisabled}`}
              aria-disabled="true"
            >
              <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
              Abrir no tribunal
            </span>
          )}
            </div>
          </div>
          <div className={styles.heroMeta}>
            <TribTag label={processo.tribunal} />
            <span className={styles.metaSeparator}>·</span>
            <span className={styles.heroMetaText}>{processo.classeJudicial ?? processo.materia}</span>
            <span className={styles.metaSeparator}>·</span>
            <span className={styles.heroMetaText}>{grau}</span>
            <span className={styles.metaSeparator}>·</span>
            <span className={styles.heroMetaText}>{STATUS_LABELS[processo.status] ?? processo.status}</span>
          </div>

          {processo.syncError && (
            <p className={styles.syncErrorBanner} role="status">
              <AlertTriangle aria-hidden="true" size={15} strokeWidth={2} />
              <span>A última consulta falhou. Os dados exibidos podem estar desatualizados. Tente novamente em “Analisar processo”.</span>
            </p>
          )}

          <div className={styles.contextRow}>
            <span>Parte representada <strong>Cliente de exemplo</strong> <span className={styles.demoTag}>Demonstração</span></span>
            <span>Responsável <strong>Mariana Oliveira</strong> <span className={styles.demoTag}>Demonstração</span></span>
            <span className={styles.statusPill}><StatusDot state={syncState} /><span>{syncLabel}</span></span>
          </div>
        </section>

        <ProcessoPanorama eventos={recentes.events} prazos={prazos} basePath={basePath} caso={processo.analiseCaso} />

        <details className={styles.capa} id="detalhes-processo">
          <summary className={styles.capaSummary}>Detalhes do processo <span>Partes, classificação e acompanhamento</span></summary>
          <div className={styles.capaBody}>
            <div className={styles.partesGrid} id="partes-do-processo">
              <PoloBlock titulo="Polo ativo" partes={processo.poloAtivo} />
              <PoloBlock titulo="Polo passivo" partes={processo.poloPassivo} />
            </div>
            <dl className={styles.capaGrid}>
              <CapaItem label="Órgão julgador" value={processo.orgaoJulgador} />
              <CapaItem label="Assunto" value={processo.assunto ?? '—'} />
              <CapaItem label="Autuação" value={displayDate(processo.autuadoEm)} />
              <CapaItem label="Valor da causa" value={processo.valorCausa == null ? '—' : currencyFormatter.format(processo.valorCausa)} />
              <CapaItem label="Última consulta" value={displayDate(processo.lastScrapedAt)} />
              <CapaItem label="Alertas WhatsApp" value={processo.whatsEnabled ? 'Ativos' : 'Desativados'} />
            </dl>
          </div>
        </details>

        <div className={styles.body}>
          <div className={styles.main}>
            <nav className={styles.tabs} aria-label="Seções do processo">
              <Link
                href={abaHref('movimentacoes')}
                className={aba === 'movimentacoes' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                aria-current={aba === 'movimentacoes' ? 'page' : undefined}
              >
                Movimentações <span className={styles.tabCount}>{recentes.total}</span>
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
                Documentos <span className={styles.tabCount}>{totalDocumentos}</span>
              </Link>
              {/* Por último: é a leitura do que as outras abas mostram cru, e
                  quem chega ao processo procura primeiro o que aconteceu. */}
              <Link
                href={abaHref('ia')}
                className={aba === 'ia' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                aria-current={aba === 'ia' ? 'page' : undefined}
              >
                IA
              </Link>
            </nav>

            {aba === 'movimentacoes' && (
              <section className={styles.timeline} aria-labelledby="movimentacoes-title">
                <div className={styles.sectionHeader}>
                  <h2 id="movimentacoes-title">§ MOVIMENTAÇÕES</h2>
                  <div className={styles.sectionRule} />
                  <span>{sort === 'asc' ? 'do mais antigo ao mais recente' : 'do mais recente ao mais antigo'}</span>
                </div>

                <ProcessoMovementFilters
                  basePath={basePath}
                  filters={{ q: filters.q, from, to, sort, categorias }}
                  total={totalMovs}
                />

                <TimelineProcesso
                  key={JSON.stringify([processo.id, categorias, todas, filters.q, from, to, sort])}
                  processId={processo.id}
                  inicial={timeline}
                  total={totalMovs}
                  porPagina={MOVS_PAGE}
                  // `todas ? ['todas'] : categorias` — o MESMO array que a
                  // busca da página 1 usou, não as categorias cruas. Sem
                  // filtro, a página pede `['todas']` (4.900 movimentações,
                  // trâmite incluído) enquanto uma lista vazia faria o backend
                  // aplicar o default, que ESCONDE trâmite (3.986). Divergir
                  // aqui faria a página 2 vir de outro conjunto: o cartório
                  // sumiria a partir do primeiro "Carregar mais", e a contagem
                  // nunca fecharia.
                  filtros={{ categorias: todas ? ['todas'] : categorias, q: filters.q, from, to, sort }}
                />
              </section>
            )}

            {aba === 'prazos' && (
              <section className={styles.panel} aria-labelledby="prazos-title">
                <div className={styles.sectionHeader}>
                  <h2 id="prazos-title">Prazos do processo</h2>
                  <div className={styles.sectionRule} />
                  <span>do vencimento mais próximo ao mais distante</span>
                </div>
                {prazos.length === 0 ? (
                  <div className={styles.emptyState}>Nenhum prazo disponível nesta consulta.</div>
                ) : (
                  <ul className={styles.prazoList}>
                    {prazos.map(prazo => <li key={prazo.id}><PrazoRow prazo={prazo} /></li>)}
                  </ul>
                )}
              </section>
            )}

            {aba === 'documentos' && (
              <section className={styles.panel} aria-labelledby="documentos-title">
                <div className={styles.sectionHeader}>
                  <h2 id="documentos-title">Documentos do processo</h2>
                  <div className={styles.sectionRule} />
                  <span>certidões de publicação e peças anexadas</span>
                </div>
                {documentos.length === 0 ? (
                  <div className={styles.emptyState}>
                    Nenhum documento disponível nesta consulta. Peças e certidões aparecem aqui quando disponibilizadas pela fonte.
                  </div>
                ) : (
                  <ul className={styles.documentoList}>
                    {documentos.map((doc, i) => (
                      <li key={`${doc.url}-${i}`} className={styles.documentoItem}>
                        {doc.url ? <DocumentoLink url={doc.url} className={docStyles.docLink}>
                          <FileText aria-hidden="true" size={14} strokeWidth={2} />
                          {doc.nome}
                        </DocumentoLink> : <span className={docStyles.docUnavailable}>
                          <FileText aria-hidden="true" size={14} strokeWidth={2} />
                          <span>{doc.nome}<span className={docStyles.docUnavailableReason}>{doc.indisponibilidade}</span></span>
                        </span>}
                        <span className={styles.documentoMeta}>
                          {doc.n !== '—' && `§ ${doc.n} · `}{doc.data} · {doc.movimentacao}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {totalMovs > timeline.length && <p className={styles.documentoMeta}>Esta lista cobre os documentos recuperados nesta consulta e pode não incluir todas as peças do processo. Consulte o tribunal para conferir o acervo completo.</p>}
              </section>
            )}

            {/* Mesma casca das outras abas — `.panel` + `.sectionHeader`. A
                aba de IA renderizava o componente solto aqui, e ele trazia o
                próprio `padding: … 0` e um teto de 880px: o painel ficava 28px
                à esquerda do resto da página (fora do `--processo-gutter` que
                a barra de abas, a capa e os outros dois painéis usam) e mais
                estreito que eles. A medida de leitura continua sendo do
                CONTEÚDO, não do painel. */}
            {aba === 'ia' && (
              <section id="analises-ia" className={styles.panel} aria-labelledby="ia-title">
                <div className={styles.sectionHeader}>
                  <h2 id="ia-title">Análises de IA</h2>
                  <div className={styles.sectionRule} />
                  <span>o que o modelo já leu deste processo</span>
                </div>
                <AnalisesIa dossie={dossieIa} />
              </section>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
