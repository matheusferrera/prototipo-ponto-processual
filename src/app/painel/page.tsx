import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyRound, Scale, SearchX } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import {
  getProcessos,
  getMovimentacoes,
  getPrazos,
  getScraperSecrets,
  getUsuarioAtual,
  getAtividadeDiaria,
} from '@/lib/api.server';
import { CadastrarOab } from '@/components/dashboard/CadastrarOab/CadastrarOab';
import { PainelSincronizando } from '@/components/varredura/PainelSincronizando';
import { formatarOab, type UsuarioAtual } from '@/lib/usuario';
import { rotuloNatureza, tituloPrazo } from '@/lib/prazo';
import { categoriaCurta } from '@/lib/categoria-movimentacao';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { MovimentacaoRow } from '@/components/movimentacoes/MovimentacaoRow/MovimentacaoRow';
import type { CategoriaMovimentacao, Prazo, Processo } from '@/types';
import styles from './page.module.css';

export const metadata: Metadata = {
  // Sem sufixo: o template do layout raiz ('%s — Ponto Processual') o acrescenta.
  title: 'Dashboard',
  description: 'Visão geral da carteira.',
};

/** Amostra usada para as agregações que o backend não expõe (composição da carteira). */
const AMOSTRA_CARTEIRA = 100;
/**
 * Janela do heatmap: 4 semanas cheias.
 *
 * Múltiplo de 7 de propósito — é o que faz cada COLUNA ser sempre o mesmo dia
 * da semana, com hoje na última. Com 30 dias (o valor até 08/09/2026) as
 * colunas escorregavam um dia a cada semana e a régua embaixo seria mentira.
 */
const HEATMAP_DIAS = 28;
/** Iniciais de domingo a sábado — a régua sob a grade. */
const INICIAIS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
/** Degraus do heatmap (claro → escuro) — verde sequencial validado sobre o creme. */
const HEAT_RAMP = ['#eaf1ec', '#bcdcc7', '#7fb495', '#3f8c62', '#166534'];
/** Circunferência da rosca de natureza (2·π·r, r = 52). */
const DONUT_CIRC = 2 * Math.PI * 52;

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "vence hoje" / "vence amanhã" / "vence em 3 dias" / "venceu há 2 dias". */
function quandoVence(dias: number): string {
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias > 1) return `vence em ${dias} dias`;
  if (dias === -1) return 'venceu ontem';
  return `venceu há ${Math.abs(dias)} dias`;
}

/** Degrau do heatmap: 0 vazio, depois 1–2 · 3–5 · 6–10 · 11+. */
function nivelHeat(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

/** Cor do número dentro da casa do heatmap — claro sobre casa escura, escuro sobre clara. */
function corHeat(nivel: number): string {
  if (nivel >= 3) return '#fff';
  if (nivel === 0) return 'var(--ink-3)';
  return 'var(--ink-2)';
}

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const plural = (n: number, um: string, muitos: string) => (n === 1 ? um : muitos);

/** Um prazo é "a confirmar" quando a data é cálculo nosso ou ninguém afirmou que é seu. */
function prazoAConfirmar(pz: Prazo): { estimado: boolean } | null {
  const estimado = !!pz.metodoPrazo && pz.metodoPrazo !== 'textoExplicito';
  if (estimado || pz.deQuem === 'indefinido') return { estimado };
  return null;
}


export default async function DashboardPage() {
  const [
    { processos, total: totalProcessos },
    { groups: movimentacoes, total: totalMovs },
    { prazos },
    atividade,
    secrets,
    usuario,
  ] = await Promise.all([
    getProcessos(1, AMOSTRA_CARTEIRA),
    getMovimentacoes(1, 50),
    getPrazos(),
    getAtividadeDiaria(HEATMAP_DIAS),
    getScraperSecrets(),
    getUsuarioAtual(),
  ]);


  const semProcessos = totalProcessos === 0;
  const semOab = !usuario.oab;
  const jaVarreu = secrets.some(s => s.isActive && s.lastSuccessAt);

  const allMovs = movimentacoes.flatMap(g => g.items);

  // ── Prazos ────────────────────────────────────────────────────────────────
  //
  // **O painel mostra o que ESTÁ POR VIR.** Até 08/09/2026 ele ordenava por
  // `diasRestantes` ascendente sem filtrar nada, e o efeito era o pior
  // possível: os três primeiros eram sempre os MAIS VENCIDOS. Medido na conta
  // de teste, a lista abria com prazos de 722, 595 e 566 dias atrás — nenhum
  // acionável, e o que vencia esta semana ficava fora da tela.
  //
  // É o mesmo erro que o backend já tinha corrigido em `etapaAnalises` (ver o
  // CLAUDE.md de lá): janela sem PISO manda o orçamento todo para o passado.
  const prazosAbertos = prazos.filter(p => !p.fechado);
  const prazosOrdenados = [...prazosAbertos].sort((a, b) => {
    if (a.diasRestantes === null && b.diasRestantes === null) return 0;
    if (a.diasRestantes === null) return 1;
    if (b.diasRestantes === null) return -1;
    return a.diasRestantes - b.diasRestantes;
  });
  const aVencer = prazosOrdenados.filter(p => p.diasRestantes !== null && p.diasRestantes >= 0);
  // Crítico é o que vence em até 3 dias — não o que venceu há dois anos.
  const prazosCriticos = aVencer.filter(p => p.diasRestantes! <= 3);
  const heroPrazos = aVencer.slice(0, 3);
  const temCritico = prazosCriticos.length > 0;
  // O passivo continua visível, mas como NOTA — não como manchete. Ele só
  // aparece se `fecharPrazosDjenExpirados` ainda não os alcançou.
  const vencidosEmAberto = prazosOrdenados.filter(p => p.diasRestantes !== null && p.diasRestantes < 0).length;

  // ── Prazos por natureza (rosca) ─────────────────────────────────────────────
  const prazosNat = prazosAbertos;
  const manifestacoes = prazosNat.filter(p => p.natureza === 'manifestacao').length;
  const ciencias = prazosNat.filter(p => p.natureza === 'ciencia').length;
  const totalNat = manifestacoes + ciencias;
  const arcoManif = totalNat ? (manifestacoes / totalNat) * DONUT_CIRC : 0;
  const arcoCien = totalNat ? (ciencias / totalNat) * DONUT_CIRC : 0;

  // ── Heatmap de 30 dias ──────────────────────────────────────────────────────
  const atividadeMap = new Map(atividade.dias.map(d => [d.dia, d.total]));
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const heat = Array.from({ length: HEATMAP_DIAS }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - (HEATMAP_DIAS - 1 - i));
    const iso = toISODate(d);
    return { iso, count: atividadeMap.get(iso) ?? 0 };
  });
  // Movimentações do dia corrente — o número de "últimas 24h" do resumo. O DJEN
  // publica por data, não por hora, então a granularidade honesta é o dia.
  const movs24h = atividadeMap.get(toISODate(hoje)) ?? 0;
  // A régua sai das 7 primeiras casas da janela, não de uma constante: como a
  // janela é múltipla de 7 e termina hoje, a coluna `i` é sempre o mesmo dia da
  // semana — e derivar da própria grade é o que garante que a letra embaixo
  // corresponde à casa acima, hoje e em qualquer outro dia.
  const diasDaSemana = heat.slice(0, 7).map(d => {
    const [ano, mes, dia] = d.iso.split('-').map(Number);
    return INICIAIS_SEMANA[new Date(ano!, mes! - 1, dia!).getDay()];
  });

  // ── Composição da carteira ──────────────────────────────────────────────────
  const amostrado = processos.length;
  const parcial = totalProcessos > amostrado;
  const porTribunal = contarPorTribunal(processos);
  const valorCausa = processos.reduce((acc, p) => acc + (p.valorCausa ?? 0), 0);
  const atividadeCat = contarPorCategoria(allMovs);

  return (
    <AppLayout active="Dashboard" mobileTitle="Dashboard" mobileBreadcrumb="Início / Dashboard">
      <PageHeader basePath="/painel" title="Dashboard" breadcrumb="Início / Dashboard" />

      <div className={styles.scroll}>
        <div className={styles.content}>
          {semProcessos ? (
            semOab ? <PainelSemOab />
            : !jaVarreu ? <PainelSincronizando oab={usuario.oab!} />
            : <PainelSemResultado oab={usuario.oab!} />
          ) : (
          <>
          {/* Grade — [hero + feed] | coluna lateral */}
          <div className={styles.grid}>
            <div className={styles.mainCol}>
              {/* Resumo geral */}
              <section className={styles.hero}>
                <div className={styles.heroHead}>
                  <span className={styles.heroTitle}>Resumo geral</span>
                  <Link href="/prazos" className={styles.heroLink}>Ver todos os prazos →</Link>
                </div>

                <div className={styles.heroStats}>
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatNum} style={{ color: temCritico ? 'var(--alert)' : 'var(--ink)' }}>
                      {prazosCriticos.length}
                    </span>
                    <span className={styles.heroStatLabel}>
                      prazo{plural(prazosCriticos.length, '', 's')} crítico{plural(prazosCriticos.length, '', 's')}
                    </span>
                  </div>
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatNum} style={{ color: movs24h > 0 ? 'var(--brick)' : 'var(--ink)' }}>
                      {movs24h}
                    </span>
                    <span className={styles.heroStatLabel}>movimentações · 24h</span>
                  </div>
                </div>

                <div className={styles.heroList}>
                    {heroPrazos.length === 0 ? (
                      <div className={styles.panelEmpty} style={{ padding: '8px 0', textAlign: 'left' }}>
                        Nenhum prazo com data definida em aberto.
                      </div>
                    ) : heroPrazos.map(pz => {
                      const dias = pz.diasRestantes!;
                      const isCrit = dias <= 3;
                      const isUrg = dias <= 7;
                      const natureza = rotuloNatureza(pz);
                      const confirmar = prazoAConfirmar(pz);
                      const href = pz.movementId ? `/movimentacoes/${pz.movementId}` : '/prazos';
                      return (
                        <Link key={pz.id} href={href} className={styles.heroRow}>
                          <span className={styles.heroDias} style={{ color: isCrit ? 'var(--alert)' : isUrg ? 'var(--brick)' : 'var(--ink-2)' }}>
                            {dias}d
                          </span>
                          <span className={styles.heroBody}>
                            <span className={styles.heroRowTitle}>{pz.parte || tituloPrazo(pz)}</span>
                            <span className={styles.heroMeta}>
                              {natureza && (
                                <span className={styles.chipNat} data-manifestacao={pz.natureza === 'manifestacao' ? '' : undefined}>
                                  {natureza}
                                </span>
                              )}
                              {confirmar && (
                                <span className={styles.chipConfirmar}>{confirmar.estimado ? '≈ estimado' : 'a confirmar'}</span>
                              )}
                              <span className={styles.heroMetaText}>{quandoVence(dias)}</span>
                            </span>
                          </span>
                          <TribTag label={pz.tribunal} />
                        </Link>
                      );
                    })}
                </div>

                {/* O passivo, como NOTA. Ele só existe quando
                    `fecharPrazosDjenExpirados` ainda não alcançou a linha — e
                    mesmo assim não pode liderar o card: "venceu há 2 anos" não é
                    o que a pessoa abriu o painel para decidir. */}
                {vencidosEmAberto > 0 && (
                  <Link href="/prazos" className={styles.heroNota}>
                    {vencidosEmAberto} prazo{plural(vencidosEmAberto, '', 's')} vencido{plural(vencidosEmAberto, '', 's')} sem baixa →
                  </Link>
                )}
              </section>

              {/* Movimentações recentes */}
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <span className={styles.panelTitle}>Movimentações recentes</span>
                  <Link href="/movimentacoes" className={styles.panelLink}>
                    Ver todas ({totalMovs}) →
                  </Link>
                </div>

                {allMovs.length === 0 ? (
                  <div className={styles.panelEmpty}>Nenhuma movimentação capturada ainda.</div>
                ) : (
                  <>
                    {/* No celular mostramos só as 3 primeiras; as demais ficam
                        num wrapper `display:contents` que some abaixo de 768px. */}
                    {allMovs.slice(0, 3).map(mov => (
                      <MovimentacaoRow key={mov.id} m={mov} densidade="compacta" comHora selo />
                    ))}
                    {allMovs.length > 3 && (
                      <div className={styles.feedExtra}>
                        {allMovs.slice(3, 6).map(mov => (
                          <MovimentacaoRow key={mov.id} m={mov} densidade="compacta" comHora selo />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Coluna lateral */}
            <div className={styles.side}>
              {/* Movimentações — heatmap de 4 semanas */}
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <span className={styles.panelTitle}>Movimentações · 4 semanas</span>
                  <span className={styles.panelCount}>{atividade.total} movs</span>
                </div>
                <div className={styles.heatBody}>
                  <div className={styles.heatGrid}>
                    {heat.map(d => {
                      const nivel = nivelHeat(d.count);
                      const ehHoje = d.iso === toISODate(hoje);
                      return (
                        <span
                          key={d.iso}
                          className={`${styles.heatCell} ${ehHoje ? styles.heatHoje : ''}`}
                          style={{ background: HEAT_RAMP[nivel], color: corHeat(nivel) }}
                          title={`${d.count} movimentaç${plural(d.count, 'ão', 'ões')} em ${d.iso.split('-').reverse().join('/')}`}
                        >
                          {d.count}
                        </span>
                      );
                    })}
                  </div>
                  {/* A régua fica FORA da grade das casas: dentro, ela viraria
                      uma quinta linha de células e o `gap` entre semanas se
                      aplicaria a ela como se fosse mais um dia. */}
                  <div className={styles.heatRegua} aria-hidden="true">
                    {diasDaSemana.map((letra, i) => (
                      <span key={i} className={styles.heatDia}>{letra}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prazos por natureza (rosca) */}
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <span className={styles.panelTitle}>Prazos por natureza</span>
                  <span className={styles.panelCount}>{totalNat}</span>
                </div>
                {totalNat === 0 ? (
                  <div className={styles.panelEmpty}>Nenhum prazo classificado em aberto.</div>
                ) : (
                  <div className={styles.donutBody}>
                    <svg viewBox="0 0 140 140" width="112" height="112" style={{ flexShrink: 0 }} aria-hidden="true">
                      <circle cx="70" cy="70" r="52" fill="none" stroke="var(--paper-2)" strokeWidth="18" />
                      <circle cx="70" cy="70" r="52" fill="none" stroke="var(--brick)" strokeWidth="18"
                        strokeDasharray={`${arcoManif} ${DONUT_CIRC}`} transform="rotate(-90 70 70)" />
                      <circle cx="70" cy="70" r="52" fill="none" stroke="var(--signal)" strokeWidth="18"
                        strokeDasharray={`${arcoCien} ${DONUT_CIRC}`} strokeDashoffset={-arcoManif} transform="rotate(-90 70 70)" />
                    </svg>
                    <div className={styles.donutLegend}>
                      <div className={styles.donutRow}>
                        <span className={styles.donutSwatch} style={{ background: 'var(--brick)' }} />
                        Manifestação <span className={styles.donutVal}>{manifestacoes}</span>
                      </div>
                      <div className={styles.donutRow}>
                        <span className={styles.donutSwatch} style={{ background: 'var(--signal)' }} />
                        Ciência <span className={styles.donutVal}>{ciencias}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Processos — composição da carteira */}
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <span className={styles.panelTitle}>Processos</span>
                  <span className={styles.panelCount}>{totalProcessos}</span>
                </div>

                <div className={styles.carteiraBody}>
                  {porTribunal.map(row => (
                    <div key={row.tribunal} className={styles.barRow}>
                      <span className={styles.barLabel}>{row.tribunal}</span>
                      <span className={styles.barTrack}>
                        <span className={styles.barFill} style={{ width: `${(row.count / porTribunal[0].count) * 100}%`, background: 'var(--brick)' }} />
                      </span>
                      <span className={styles.barValue}>{row.count}</span>
                    </div>
                  ))}

                  <div className={styles.carteiraDivider}>
                    {valorCausa > 0 && (
                      <CarteiraLinha rotulo="Valor em causa" valor={moeda.format(valorCausa)} destaque />
                    )}
                    {parcial && (
                      <span className={styles.carteiraNota}>
                        Composição sobre os {amostrado} processos mais recentes de {totalProcessos}.
                      </span>
                    )}
                  </div>

                  {atividadeCat.length > 0 && (
                    <div className={styles.carteiraDivider}>
                      <span className={styles.subHead}>Atividade recente</span>
                      {atividadeCat.map(row => (
                        <div key={row.categoria} className={styles.barRow}>
                          <span className={styles.barLabel}>{categoriaCurta(row.categoria)}</span>
                          <span className={styles.barTrack}>
                            <span className={styles.barFill} style={{ width: `${(row.count / atividadeCat[0].count) * 100}%`, background: 'var(--brick)' }} />
                          </span>
                          <span className={styles.barValue}>{row.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Link href="/processos" className={styles.panelFooterLink}>
                  Ver todos os processos →
                </Link>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

/** Distribuição por tribunal na amostra, do maior para o menor. */
function contarPorTribunal(processos: Processo[]): { tribunal: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of processos) counts.set(p.tribunal, (counts.get(p.tribunal) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tribunal, count]) => ({ tribunal, count }))
    .sort((a, b) => b.count - a.count || a.tribunal.localeCompare(b.tribunal));
}

/** Movimentações recentes por categoria, do maior para o menor (ignora sem classificação). */
function contarPorCategoria(
  movs: { categoria: CategoriaMovimentacao | null }[],
): { categoria: CategoriaMovimentacao; count: number }[] {
  const counts = new Map<CategoriaMovimentacao, number>();
  for (const m of movs) if (m.categoria) counts.set(m.categoria, (counts.get(m.categoria) ?? 0) + 1);
  return [...counts.entries()]
    .map(([categoria, count]) => ({ categoria, count }))
    .sort((a, b) => b.count - a.count);
}

function CarteiraLinha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={styles.carteiraLinha}>
      <span className={styles.carteiraRotulo}>{rotulo}</span>
      <span className={styles.carteiraValor} data-destaque={destaque ? '' : undefined}>{valor}</span>
    </div>
  );
}

/**
 * Painel vazio, causa 1: a conta não tem OAB. A OAB é o pedido barato que faz a
 * carteira aparecer; o login do tribunal fica como saída secundária.
 */
function PainelSemOab() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <Scale size={22} />
      </div>
      <div className={styles.emptyTitle}>Falta a sua OAB</div>
      <p className={styles.emptyDesc}>
        É pela OAB que localizamos seus processos nos diários oficiais — sem ela não temos
        por onde começar. Informe abaixo: não precisa da senha de tribunal nenhum.
      </p>

      <CadastrarOab rotuloBotao="Buscar meus processos" />

      <Link href="/credenciais" className={styles.emptySecundario}>
        <KeyRound size={13} /> Prefiro conectar o login de um tribunal
      </Link>
    </div>
  );
}

/**
 * Causa 3: já varremos e não veio nada. Duas saídas honestas: conferir a OAB ou
 * conectar o login do tribunal.
 */
function PainelSemResultado({ oab }: { oab: NonNullable<UsuarioAtual['oab']> }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <SearchX size={22} />
      </div>
      <div className={styles.emptyTitle}>Nada publicado para a OAB {formatarOab(oab)}</div>
      <p className={styles.emptyDesc}>
        Procuramos nos diários oficiais e não encontramos publicações dessa OAB nos últimos
        meses. Se o número não for esse, corrija abaixo. Se estiver certo, o login do tribunal
        alcança o que não passa pelo diário.
      </p>

      <CadastrarOab oabInicial={oab} rotuloBotao="Procurar de novo" />

      <Link href="/credenciais" className={styles.emptySecundario}>
        <KeyRound size={13} /> Conectar o login de um tribunal
      </Link>
    </div>
  );
}
