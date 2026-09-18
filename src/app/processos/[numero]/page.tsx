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
import { AbasDoProcesso, type AbaDoProcesso } from '@/components/processos/AbasDoProcesso/AbasDoProcesso';
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
    sort?: string; page?: string; ano?: string; aba?: string;
  }>;
}

/** Nada veio porque nada foi pedido — a aba que não está aberta não busca. */
const SEM_EVENTOS = { events: [], total: 0 };
const SEM_CALENDARIO = { dias: [], total: 0, primeiroAno: null, ultimoAno: null };

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
 * A TELA DO PROCESSO — a identidade fixa, e DUAS abas embaixo.
 *
 * ## A ordem das perguntas
 *
 * Um advogado com ~100 processos não abre um processo para navegar: abre por um
 * motivo. A página responde os motivos na ordem em que eles aparecem:
 *
 * 1. **de quem é o caso, e de que lado eu estou** — o nome do cliente em 22px,
 *    primeiro item abaixo do CNJ, FORA das abas: vale para as duas;
 * 2. **o que corre agora** — o prazo, a régua e a providência;
 * 3. **o que já foi decidido, o que já foi protocolado** — duas linhas fixas;
 * 4. **o que aconteceu** — a lista, que é o corpo da aba padrão;
 * 5. **o que o processo É** — onde está, o mapa do ano e as peças, na aba Ficha.
 *
 * ## Das quatro abas antigas para estas duas
 *
 * As quatro de 2026 (Prazos · Documentos · IA · Movimentações) eram salas quase
 * sempre vazias, e uma aba cobra um clique para descobrir isso — de novo em cada
 * visita. Elas viraram uma rolagem só, com a ficha numa calha de 352px à
 * direita. **As duas de agora não são a volta daquilo**: o que se alterna aqui
 * não é uma gaveta de dado escasso, é a pergunta — o que ACONTECEU × o que o
 * processo É. As duas têm conteúdo em todo processo.
 *
 * | aba | medição de antes | onde está hoje |
 * |---|---|---|
 * | Prazos | 11 abertos numa conta de ~100 processos | bloco no topo de Movimentações |
 * | Documentos | 63% dos pedidos de arquivo voltam vazios | § PEÇAS QUE ABREM, na Ficha |
 * | IA | a leitura cobre 6,1% dos atos legíveis | dentro do card do ato |
 * | Movimentações | a única com conteúdo em todo processo | a aba padrão |
 *
 * ## A URL continua sendo a fonte da verdade
 *
 * `?cat=`, `?q=`, `?from=`, `?to=`, `?sort=` e `?ano=` seguem sendo o estado
 * desta tela, e **`?aba=` voltou** — com dois valores (ausente = movimentações,
 * `ficha`). Trocar de aba preserva o recorte da lista e descarta a página.
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

  /* A ABA é a pergunta, e cada uma busca só o que responde a sua. A ficha não
     precisa das 50 movimentações da primeira página (a consulta mais cara da
     tela), e a lista não precisa do mapa do ano nem da amostra de peças. */
  const aba: AbaDoProcesso = sp.aba === 'ficha' ? 'ficha' : 'movimentacoes';
  const naLista = aba === 'movimentacoes';

  const [
    { events: timeline, total: totalMovs },
    prazos,
    ultimoAto,
    decisao,
    peticao,
    calendario,
    comPeca,
  ] = await Promise.all([
    naLista ? getProcessoMovements(processo.id, MOVS_PAGE, catParaBackend, filters) : SEM_EVENTOS,
    // Os prazos alimentam a nota da aba e o bloco do topo — valem nas duas.
    getProcessoPrazos(processo.id),
    /* O ÚLTIMO ATO, SEM FILTRO NENHUM. É ele que diz se o processo andou, e
       por isso não pode sair da `timeline`: ali o recorte da URL manda, e uma
       busca por "sentença" faria o bloco declarar silêncio num processo que se
       moveu ontem. Ver `NadaCorre`. */
    naLista ? getProcessoMovements(processo.id, 1, ['todas'], { sort: 'desc' }) : SEM_EVENTOS,
    /* A última decisão e a última petição vêm de busca própria, não de um
       filtro sobre a página carregada: decisório é 6% e ato de parte 10% dos
       últimos 90 dias, então as 50 primeiras linhas podem não conter nenhum
       dos dois — num processo em execução, a última decisão pode estar a três
       anos de distância. `limit=1` é barato. */
    naLista ? getProcessoMovements(processo.id, 1, ['decisorio'], { sort: 'desc' }) : SEM_EVENTOS,
    naLista ? getProcessoMovements(processo.id, 1, ['atoDeParte'], { sort: 'desc' }) : SEM_EVENTOS,
    // O mapa pinta o MESMO conjunto que a lista mostra: um dia aceso que o
    // filtro exclui levaria a um clique que não devolve nada.
    naLista ? SEM_CALENDARIO : getCalendarioDoProcesso(processo.id, catParaBackend.join(',')),
    naLista ? SEM_EVENTOS : getProcessoMovements(processo.id, PECAS_AMOSTRA, ['todas'], { comDocumento: true, sort: 'desc' }),
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

  /* Trocar de aba PRESERVA o recorte da lista: quem filtrou por decisões, foi
     ver a ficha e voltou encontra o mesmo filtro. O que não viaja é `page` —
     voltar para a página 7 de uma lista que a pessoa não está mais lendo é
     devolvê-la ao meio do processo. */
  const hrefDaAba = (proxima: AbaDoProcesso): string => {
    const query = new URLSearchParams();
    if (proxima === 'ficha') query.set('aba', 'ficha');
    for (const [chave, valor] of Object.entries(paramsAtuais)) if (valor) query.set(chave, valor);
    if (sp.ano) query.set('ano', sp.ano);
    const busca = query.toString();
    return busca ? `${basePath}?${busca}` : basePath;
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
                      {/* As partes por extenso moram na FICHA desde 17/09/2026.
                          Uma âncora `#` daqui apontaria para um elemento que
                          não está montado enquanto a aba das movimentações está
                          aberta — o clique não faria nada. */}
                      <Link href={`${hrefDaAba('ficha')}#partes-do-processo`} className={styles.maisPartes}>
                        +{outras} partes
                      </Link>
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

        {/* ══ o corpo — DUAS ABAS ══════════════════════════════════════════
            A ficha era uma calha de 352px à direita, e no celular ela não era
            calha nenhuma: as três seções caíam empilhadas ENTRE o prazo e a
            lista. Agora cada pergunta recebe a tela inteira — ver
            `AbasDoProcesso`. Uma aba por vez também significa um DOM por vez:
            não há mais `display: contents` + `order` reordenando seis seções
            conforme a largura. */}
        <AbasDoProcesso aba={aba} href={hrefDaAba} movimentacoes={processo.movimentacoesCount} />

        <div className={styles.corpo}>
          {aba === 'movimentacoes' ? (
            <>
              <SecaoProcesso
                id="corre-agora"
                titulo="§ O QUE CORRE AGORA"
                nota={prazosAbertos === 0 ? 'nenhum prazo' : `${prazosAbertos} ${prazosAbertos === 1 ? 'prazo aberto' : 'prazos abertos'}`}
                className={styles.secao}
              >
                <PrazoQueCorre
                  prazo={prazo}
                  vencidos={vencidos}
                  semData={semData}
                  processo={processo}
                  ultimoAto={ultimoAto.events[0] ?? null}
                />
              </SecaoProcesso>

              <SecaoProcesso
                id="mudou-o-caso"
                titulo="§ O QUE MUDOU O CASO"
                className={styles.secao}
              >
                <MudouOCaso decisao={decisao.events[0] ?? null} peticao={peticao.events[0] ?? null} />
              </SecaoProcesso>

              <SecaoProcesso
                id="o-que-aconteceu"
                titulo="§ O QUE ACONTECEU"
                nota={`${processo.movimentacoesCount} ${processo.movimentacoesCount === 1 ? 'movimentação' : 'movimentações'}`}
                className={`${styles.secao} ${styles.secaoLista}`}
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
            </>
          ) : (
            <>
              <SecaoProcesso
                id="onde-esta"
                titulo="§ ONDE ESTÁ"
                nota={processo.syncError ? 'consulta falhou' : processo.lastScrapedAt ? `consultado ${tempoCurto(processo.lastScrapedAt)}` : null}
                className={styles.secao}
              >
                <OndeEsta
                  processo={processo}
                  /* Na aba, o `<details>` nasce ABERTO: ele existia para a
                     ficha caber numa calha de 352px ao lado da lista, e aqui
                     não há mais nada disputando a tela — um clique para ver o
                     que a aba promete seria um pedágio. */
                  detalhesAbertos
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
                className={styles.secao}
              >
                {/* O MAPA DO CASO — cada quadrado é um dia e é um link que
                    filtra a lista naquele dia. Ele volta para a aba das
                    movimentações, que é onde a resposta do clique aparece: é a
                    resposta para o processo de 4.900 movimentações e para o que
                    atravessa 37 anos. */}
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
                className={styles.secao}
              >
                <PecasQueAbrem eventos={comPeca.events} totalComPeca={comPeca.total} />
              </SecaoProcesso>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
