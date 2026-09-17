import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ExternalLink, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { ExportProcessoPdfButton } from '@/components/processos/ExportProcessoPdfButton/ExportProcessoPdfButton';
import { AnalisarProcessoButton } from '@/components/processos/AnalisarProcessoButton/AnalisarProcessoButton';
import { CopiarCnj } from '@/components/processos/ProcessoPanorama/ProcessoControls';
import { ConfirmarCliente } from '@/components/processos/ConfirmarCliente/ConfirmarCliente';
import { SecaoProcesso } from '@/components/processos/SecaoProcesso/SecaoProcesso';
import { PrazoQueCorre } from '@/components/processos/PrazoQueCorre/PrazoQueCorre';
import { MudouOCaso } from '@/components/processos/MudouOCaso/MudouOCaso';
import { OndeEsta, PoloBlock } from '@/components/processos/OndeEsta/OndeEsta';
import { PecasQueAbrem } from '@/components/processos/PecasQueAbrem/PecasQueAbrem';
import { CalendarioProcesso } from '@/components/movimentacoes/CalendarioProcesso/CalendarioProcesso';
import { ProcessoMovementFilters } from '@/components/movimentacoes/ProcessoMovementFilters/ProcessoMovementFilters';
import { TimelineProcesso } from '@/components/movimentacoes/TimelineProcesso/TimelineProcesso';
import { nomeDoCaso, nomeLegivel, tempoCurto } from '@/lib/processo-apresentacao';
import { panoramaProcesso } from '@/lib/processo-panorama';
import { partesCurtas, partesDoTexto } from '@/lib/pje-text';
import { parseCategorias } from '@/lib/categoria-movimentacao';
import {
  getCalendarioDoProcesso,
  getProcesso,
  getProcessoMovements,
  getProcessoPrazos,
} from '@/lib/api.server';
import { getAbsoluteUrl } from '@/lib/site-url';
import type { Processo } from '@/types';
import styles from './page.module.css';

const MOVS_PAGE = 50;
/** Quantas movimentações com peça alimentam a calha de peças do desktop. */
const PECAS_AMOSTRA = 8;

interface Props {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{
    movs?: string; cat?: string | string[]; q?: string; from?: string; to?: string;
    sort?: string; page?: string; ano?: string;
  }>;
}

/** Título do processo: o confronto entre os polos, que é como o PDF e o OG o nomeiam. */
function confronto(processo: Processo): string {
  const { ativo, passivo } = nomeDoCaso(processo);
  return passivo ? `${ativo} × ${passivo}` : ativo;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { numero } = await params;
  const processo = await getProcesso(decodeURIComponent(numero));

  if (!processo) return { title: 'Processo não encontrado' };

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
    twitter: { card: 'summary_large_image', title: titulo, description, images: [imageUrl] },
  };
}

/**
 * A TELA DO PROCESSO — uma rolagem só, na ordem em que o advogado pergunta.
 *
 * ## A ordem das perguntas
 *
 * Um advogado com ~100 processos não abre um processo para navegar: abre por um
 * motivo. A página responde os motivos na ordem em que eles aparecem, e a lista
 * cronológica — que era a tela inteira — passa a ser a última coisa, não a
 * primeira.
 *
 * 1. **de quem é o caso, e de que lado eu estou** — o nome do cliente em 22px,
 *    primeiro item abaixo do CNJ. Era a 5ª linha do cabeçalho, depois do
 *    título, dos três botões e da linha de meta;
 * 2. **o que corre agora** — o prazo, a régua e a providência;
 * 3. **o que já foi decidido, o que já foi protocolado** — duas linhas fixas;
 * 4. **onde o processo está** — fase, grau, órgão, autuação, valor, à vista;
 * 5. **o que aconteceu** — o mapa do ano e a lista.
 *
 * ## As quatro abas viraram uma rolagem
 *
 * Três das quatro eram salas quase sempre vazias, e uma aba cobra um clique
 * para descobrir isso — de novo em cada visita:
 *
 * | aba | medição | onde foi parar |
 * |---|---|---|
 * | Prazos | 11 abertos numa conta de ~100 processos, 4 na outra | bloco no topo |
 * | Documentos | 63% dos pedidos de arquivo ao portal voltam vazios | calha de peças |
 * | IA | a leitura cobre 6,1% dos atos legíveis | dentro do ato |
 * | Movimentações | a única com conteúdo em todo processo | virou a página |
 *
 * ## A URL continua sendo a fonte da verdade
 *
 * `?cat=`, `?q=`, `?from=`, `?to=`, `?sort=` e `?ano=` seguem existindo e
 * seguem sendo o estado desta tela. **O único parâmetro que deixou de existir é
 * `?aba=`.**
 */
export default async function ProcessoDetailPage({ params, searchParams }: Props) {
  const { numero } = await params;
  const sp = await searchParams;
  const processo = await getProcesso(decodeURIComponent(numero));
  if (!processo) notFound();

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
  const catParaBackend = todas ? ['todas'] : categorias;

  const [
    { events: timeline, total: totalMovs },
    prazos,
    calendario,
    decisao,
    peticao,
    comPeca,
  ] = await Promise.all([
    getProcessoMovements(processo.id, MOVS_PAGE, catParaBackend, filters),
    getProcessoPrazos(processo.id),
    // O mapa pinta o MESMO conjunto que a lista mostra: um dia aceso que o
    // filtro exclui levaria a um clique que não devolve nada.
    getCalendarioDoProcesso(processo.id, catParaBackend.join(',')),
    /* A última decisão e a última petição vêm de busca própria, não de um
       filtro sobre a página carregada: decisório é 6% e ato de parte 10% dos
       últimos 90 dias, então as 50 primeiras linhas podem não conter nenhum
       dos dois — num processo em execução, a última decisão pode estar a três
       anos de distância. `limit=1` é barato. */
    getProcessoMovements(processo.id, 1, ['decisorio'], { sort: 'desc' }),
    getProcessoMovements(processo.id, 1, ['atoDeParte'], { sort: 'desc' }),
    getProcessoMovements(processo.id, PECAS_AMOSTRA, ['todas'], { comDocumento: true, sort: 'desc' }),
  ]);

  const { prazo, vencidos, semData } = panoramaProcesso(timeline, prazos);
  const prazosAbertos = prazos.filter(p => !p.fechado).length;

  /* O ANO DO MAPA abre no ÚLTIMO COM MOVIMENTAÇÃO, não no ano corrente.
     Metade de um acervo está parada: num processo cuja última movimentação é
     de 2019, abrir em 2026 mostraria 365 quadrados vazios — um mapa que diz
     "não temos dado" quando o que ele tem é dado demais, sete anos atrás. */
  const anoPedido = Number(sp.ano);
  const anoBase = calendario.ultimoAno ?? new Date().getFullYear();
  const ano = Number.isSafeInteger(anoPedido)
    && calendario.primeiroAno !== null && calendario.ultimoAno !== null
    && anoPedido >= calendario.primeiroAno && anoPedido <= calendario.ultimoAno
    ? anoPedido : anoBase;

  const basePath = `/processos/${encodeURIComponent(processo.cnj)}`;
  const paramsAtuais = {
    cat: categorias.length ? categorias.join(',') : undefined,
    q: filters.q, from, to, sort: sort === 'asc' ? 'asc' : undefined,
  };

  const { ativo, passivo, outras } = nomeDoCaso(processo);
  const polo = processo.meuPolo ?? 'indefinido';
  const cliente = processo.cliente ?? [];
  /* A pergunta só some quando ele já respondeu — inclusive "não é meu".
     `?? null` e não `=== null`: em resposta de backend anterior ao campo,
     `meuPoloManual` chega `undefined`, e comparar com `null` daria `false` —
     a pergunta nunca apareceria justamente nos ~30% do acervo para os quais
     ela existe. */
  const respondeu = (processo.meuPoloManual ?? null) !== null;
  const perguntarOLado = (polo === 'indefinido' || cliente.length === 0) && !respondeu;
  /* `partesDoTexto` e não `partesCurtas`, por duas razões que só aparecem no
     acervo real:
     1. os tribunais mandam as partes em CAIXA ALTA, e `nomeLegivel` precisa ser
        aplicada A CADA NOME. Sobre a string já montada ela desiste, porque o
        sufixo "+4 partes" vem em minúsculas e o teste de "veio todo em caixa
        alta" falha — o maior texto da tela saía gritando;
     2. o "+N partes" não pode entrar no `<h1>`. O polo coletivo do TRF1 tem
        607 partes, e "JOSE MANOEL DE BARROS, NELSON WAGNER SERAFIM DE ALMEIDA
        +4 partes" em 26px/800 é uma lista, não um nome. A contagem já vive na
        linha de qualificação, e lá ela é a do processo inteiro. */
  const doCliente = partesDoTexto(cliente.join(', '), 2);
  const nomeCliente = doCliente.nomes.length ? doCliente.nomes.map(nomeLegivel).join(', ') : null;
  const daContraria = partesDoTexto(processo.parteContraria?.join(', ') ?? '', 2);
  const nomeAdversario = daContraria.nomes.length
    ? daContraria.nomes.map(nomeLegivel).join(', ')
    : polo === 'passivo' ? ativo : passivo;

  const qualificacao = [
    polo !== 'indefinido' ? `polo ${polo}` : null,
    processo.poloAtivo[0]?.tipo && polo === 'ativo' ? nomeLegivel(processo.poloAtivo[0].tipo) : null,
    processo.poloPassivo[0]?.tipo && polo === 'passivo' ? nomeLegivel(processo.poloPassivo[0].tipo) : null,
    /* De onde veio a resposta. "OAB no ato" é a derivação do backend cruzando
       a inscrição da conta com os representantes; "você confirmou" é a resposta
       dele, que vence a derivação. */
    processo.meuPoloManual && processo.meuPoloManual !== 'nenhum' ? 'você confirmou' : polo !== 'indefinido' ? 'OAB no ato' : null,
  ].filter(Boolean).join(' · ');

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
          className={`${styles.botao} ${styles.botaoIcone} ${styles.botaoForte}`}
          aria-label="Abrir processo no tribunal"
          title="Abrir no tribunal"
        >
          <ExternalLink aria-hidden="true" size={18} strokeWidth={2} />
        </a>
      ) : undefined}
    >
      <div className={styles.pageShell}>
        <nav className={styles.breadcrumb} aria-label="Navegação do processo">
          <Link href="/processos" className={styles.voltar}>
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
            Carteira
          </Link>
          <span className={styles.breadcrumbBarra}>/</span>
          <span className={styles.breadcrumbAtual}>{processo.cnj}</span>
        </nav>

        {/* A IDADE DO QUE A TELA MOSTRA, antes de qualquer conteúdo.
            Quando a consulta falha, tudo abaixo é de antes — e quem lê precisa
            saber disso antes de decidir com base nisso, não depois. */}
        {processo.syncError && (
          <p className={styles.falha} role="status">
            <AlertTriangle aria-hidden="true" size={15} strokeWidth={2} />
            <span>
              A última consulta falhou{processo.lastScrapedAt ? ` ${tempoCurto(processo.lastScrapedAt)}` : ''}.
              O que você vê abaixo é do que veio antes dela. Use “Analisar processo” para tentar de novo.
            </span>
          </p>
        )}

        {/* ══ 1. DE QUEM É O CASO, E DE QUE LADO EU ESTOU ══════════════════ */}
        <header className={styles.identidade}>
          <div className={styles.identidadeCorpo}>
            <div className={styles.cnjLinha}>
              <TribTag label={processo.tribunal} />
              <CopiarCnj cnj={processo.cnj} />
            </div>

            {perguntarOLado ? (
              <ConfirmarCliente
                processoId={processo.id}
                manual={processo.meuPoloManual ?? null}
                nomeAtivo={processo.poloAtivo[0]?.nome ? nomeLegivel(partesCurtas(processo.poloAtivo[0].nome, 1)) : null}
                nomePassivo={processo.poloPassivo[0]?.nome ? nomeLegivel(partesCurtas(processo.poloPassivo[0].nome, 1)) : null}
                variante="bloco"
              />
            ) : (
              <>
                <div className={styles.partes}>
                  <div className={styles.parte}>
                    <span className={styles.rotulo}>{nomeCliente ? 'Você representa' : 'Polo ativo'}</span>
                    {/* O `<h1>` é o NOME DO CLIENTE, não o número nem o confronto:
                        é ele que a pessoa procura ao abrir a página, e é ele que
                        um leitor de tela anuncia primeiro. */}
                    <h1 className={styles.cliente}>{nomeCliente ?? ativo}</h1>
                  </div>
                  <div className={styles.divisor} aria-hidden="true" />
                  <div className={styles.parte}>
                    <span className={styles.rotulo}>Contra</span>
                    <p className={styles.adversario}>{nomeAdversario ?? 'Parte contrária não identificada'}</p>
                  </div>
                </div>
                <p className={styles.qualificacao}>
                  {qualificacao}
                  {outras > 0 && (
                    <>
                      {qualificacao ? ' · ' : ''}
                      <a href="#detalhes-processo" className={styles.maisPartes}>+{outras} partes</a>
                    </>
                  )}
                  {/* A correção só aparece quando a resposta foi DELE: o que a
                      OAB derivou não se desfaz por botão. */}
                  {processo.meuPoloManual && (
                    <ConfirmarCliente
                      processoId={processo.id}
                      manual={processo.meuPoloManual}
                      nomeAtivo={null}
                      nomePassivo={null}
                    />
                  )}
                </p>
              </>
            )}
          </div>

          <div className={styles.acoes}>
            <AnalisarProcessoButton processId={processo.id} numero={processo.cnj} className={styles.botao} />
            {/* O PDF sai no celular: são três alvos de 44px numa faixa de
                390px, e exportar não é o que se faz do telefone. */}
            <ExportProcessoPdfButton processo={processo} prazos={prazos} className={`${styles.botao} ${styles.soDesktop}`} />
            {processo.link ? (
              <a
                href={processo.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.botao} ${styles.botaoForte}`}
              >
                <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
                Abrir no tribunal
              </a>
            ) : (
              <span
                title="Link do tribunal indisponível"
                className={`${styles.botao} ${styles.botaoInerte}`}
                aria-disabled="true"
              >
                <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
                Abrir no tribunal
              </span>
            )}
          </div>
        </header>

        {/* ══ o corpo ═══════════════════════════════════════════════════════
            UM DOM SÓ, duas formas. No celular `.principal` e `.calha` são
            `display: contents` e as seis seções viram irmãs numa coluna,
            reordenadas por `order`; a partir de 1180px os envoltórios voltam a
            existir e viram as duas colunas. Renderizar o mapa e o "onde está"
            duas vezes — uma por layout — duplicaria `id`s (`#detalhes-processo`,
            `#calendario-title`) e o `aria-labelledby` passaria a apontar para
            dois elementos. */}
        <div className={styles.corpo}>
          <div className={styles.principal}>
            <SecaoProcesso
              id="corre-agora"
              titulo="§ O QUE CORRE AGORA"
              nota={prazosAbertos === 0 ? 'nenhum prazo' : `${prazosAbertos} ${prazosAbertos === 1 ? 'prazo aberto' : 'prazos abertos'}`}
              className={`${styles.secao} ${styles.ordemCorre}`}
            >
              <PrazoQueCorre prazo={prazo} vencidos={vencidos} semData={semData} processo={processo} />
            </SecaoProcesso>

            <SecaoProcesso
              id="mudou-o-caso"
              titulo="§ O QUE MUDOU O CASO"
              className={`${styles.secao} ${styles.ordemMudou}`}
            >
              <MudouOCaso decisao={decisao.events[0] ?? null} peticao={peticao.events[0] ?? null} />
            </SecaoProcesso>

            <SecaoProcesso
              id="o-que-aconteceu"
              titulo="§ O QUE ACONTECEU"
              nota={`${processo.movimentacoesCount} ${processo.movimentacoesCount === 1 ? 'movimentação' : 'movimentações'}`}
              className={`${styles.secao} ${styles.ordemLista}`}
            >
              <ProcessoMovementFilters
                basePath={basePath}
                filtros={{ q: filters.q, from, to, sort, categorias, ano: sp.ano }}
                total={totalMovs}
              />

              <div className={styles.lista}>
                <TimelineProcesso
                  key={JSON.stringify([processo.id, categorias, todas, filters.q, from, to, sort])}
                  processId={processo.id}
                  inicial={timeline}
                  total={totalMovs}
                  porPagina={MOVS_PAGE}
                  // O MESMO array que a página 1 usou, não as categorias cruas:
                  // sem filtro a página pede `['todas']` (trâmite incluído)
                  // enquanto uma lista vazia faria o backend aplicar o default,
                  // que ESCONDE trâmite — e a página 2 viria de outro conjunto.
                  filtros={{ categorias: catParaBackend, q: filters.q, from, to, sort }}
                />
              </div>
            </SecaoProcesso>
          </div>

          <aside className={styles.calha} aria-label="Ficha do processo">
            <SecaoProcesso
              id="onde-esta"
              titulo="§ ONDE ESTÁ"
              nota={processo.syncError ? 'consulta falhou' : processo.lastScrapedAt ? `consultado ${tempoCurto(processo.lastScrapedAt)}` : null}
              className={`${styles.secao} ${styles.ordemOnde}`}
            >
              <OndeEsta
                processo={processo}
                detalhes={
                  <>
                    <div className={styles.partesGrid} id="partes-do-processo">
                      <PoloBlock titulo="Polo ativo" partes={processo.poloAtivo} />
                      <PoloBlock titulo="Polo passivo" partes={processo.poloPassivo} />
                    </div>
                    <dl className={styles.ficha}>
                      <div><dt>Assunto</dt><dd>{processo.assunto ?? '—'}</dd></div>
                      <div><dt>Classe judicial</dt><dd>{processo.classeJudicial ?? processo.materia}</dd></div>
                      <div><dt>Alertas WhatsApp</dt><dd>{processo.whatsEnabled ? 'Ativos' : 'Desativados'}</dd></div>
                    </dl>
                    {/* A SÍNTESE DO CASO, que vem de graça com o processo
                        (`analiseCaso`) e não custa uma ida a mais. Ela fica
                        aqui dentro porque é leitura, não fato do dia: o que a
                        tela promove da análise é a FASE, lá em cima. */}
                    {processo.analiseCaso?.sintese && (
                      <div className={styles.sintese}>
                        <p className={styles.sinteseTitulo}>
                          <Sparkles aria-hidden="true" size={14} strokeWidth={2} />
                          Resumo do caso pela IA
                          {processo.analiseCaso.confianca === 'baixa' && <span className={styles.sinteseRessalva}>leitura incerta</span>}
                        </p>
                        <p className={styles.sinteseTexto}>{processo.analiseCaso.sintese}</p>
                        {processo.analiseCaso.atualizadaEm && (
                          <p className={styles.sinteseData}>
                            Lido em {new Date(processo.analiseCaso.atualizadaEm).toLocaleDateString('pt-BR')} · confira no ato original
                          </p>
                        )}
                      </div>
                    )}
                  </>
                }
              />
            </SecaoProcesso>

            <SecaoProcesso
              id="caso-no-tempo"
              titulo="§ O CASO NO TEMPO"
              className={`${styles.secao} ${styles.ordemTempo}`}
            >
              {/* O MAPA DO CASO — construído, com rota de backend, e que nenhum
                  arquivo do app montava: a constante `ABAS` tinha quatro
                  valores e `calendario` não era um deles. Cada quadrado é um
                  dia e é um link que filtra a lista naquele dia — é a resposta
                  para o processo de 4.900 movimentações e para o que atravessa
                  37 anos. */}
              <CalendarioProcesso
                calendario={calendario}
                ano={ano}
                basePath={basePath}
                paramsAtuais={paramsAtuais}
              />
            </SecaoProcesso>

            <SecaoProcesso
              id="pecas-que-abrem"
              titulo="§ PEÇAS QUE ABREM"
              className={`${styles.secao} ${styles.ordemPecas}`}
            >
              <PecasQueAbrem eventos={comPeca.events} totalComPeca={comPeca.total} />
            </SecaoProcesso>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
