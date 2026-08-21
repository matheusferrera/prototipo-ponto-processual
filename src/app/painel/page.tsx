import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyRound, Scale, SearchX, ShieldAlert } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import {
  getProcessos,
  getMovimentacoes,
  getPrazos,
  getScraperSecrets,
  getUsuarioAtual,
} from '@/lib/api.server';
import { CadastrarOab } from '@/components/dashboard/CadastrarOab/CadastrarOab';
import { PainelSincronizando } from '@/components/varredura/PainelSincronizando';
import { formatarOab, type UsuarioAtual } from '@/lib/usuario';
import { tituloPrazo } from '@/lib/prazo';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { Seal } from '@/components/ui/Seal/Seal';
import { StatusDot } from '@/components/ui/StatusDot/StatusDot';
import type { Processo } from '@/types';
import styles from './page.module.css';

export const metadata: Metadata = {
  // Sem sufixo: o template do layout raiz ('%s — Ponto Processual') o acrescenta.
  title: 'Dashboard',
  description: 'Visão geral da carteira.',
};

/** Amostra usada para as agregações que o backend não expõe (composição da carteira). */
const AMOSTRA_CARTEIRA = 100;
/** Horizonte da faixa de prazos, em dias corridos a partir de hoje. */
const HORIZONTE_DIAS = 14;

const DIA_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "há 12 min" / "há 3h" / "há 2d" — null quando não houve sincronização alguma. */
function haQuanto(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const plural = (n: number, um: string, muitos: string) => (n === 1 ? um : muitos);

/**
 * O radar público do DJEN é modelado como uma credencial de sigla `DJEN`
 * (ver `setup-djen-secret.ts` no backend). Ela não é acesso autenticado a
 * tribunal nenhum — por isso não conta para a cobertura.
 */
const SIGLA_DJEN = 'DJEN';

export default async function DashboardPage() {
  const [
    { processos, total: totalProcessos, comNovidade, comErro },
    { groups: movimentacoes, newToday, total: totalMovs },
    { prazos, criticos },
    secrets,
    usuario,
  ] = await Promise.all([
    getProcessos(1, AMOSTRA_CARTEIRA),
    getMovimentacoes(1, 50),
    getPrazos(),
    getScraperSecrets(),
    getUsuarioAtual(),
  ]);

  // Credencial de tribunal = a que dá login no sistema (PJe/CPE/Projudi).
  // Só com ela o robô entra nos autos; sem nenhuma, a carteira inteira vem do
  // que é publicado no diário — e a tela precisa dizer isso.
  const semAutenticacao = !secrets.some(
    s => s.isActive && s.tribunais.some(t => t !== SIGLA_DJEN),
  );

  /* Painel vazio tem três causas distintas, e tratá-las como uma só era o que
     fazia a tela pedir a senha de um tribunal para quem só precisava dizer a
     própria OAB:
       1. sem OAB      — não há por onde procurar; é a única pergunta que falta;
       2. com OAB e sem varredura concluída — está buscando agora;
       3. com OAB, já varrido e nada — a OAB pode estar errada, ou é uma OAB
          sem publicação recente no diário. */
  const semProcessos = totalProcessos === 0;
  const semOab = !usuario.oab;
  const jaVarreu = secrets.some(s => s.lastSuccessAt);

  // `counts` é global (vem do backend); a amostra só entra como rede de segurança
  // caso o contrato mude e o campo suma.
  const novidades = comNovidade || processos.filter(p => p.state === 'signal').length;
  const comFalha = comErro || processos.filter(p => p.state === 'alert').length;

  const allMovs = movimentacoes.flatMap(g => g.items);

  const prazosOrdenados = [...prazos].sort((a, b) => {
    if (a.diasRestantes === null && b.diasRestantes === null) return 0;
    if (a.diasRestantes === null) return 1;
    if (b.diasRestantes === null) return -1;
    return a.diasRestantes - b.diasRestantes;
  });
  const prazosCriticos = prazosOrdenados.filter(p => p.diasRestantes !== null && p.diasRestantes <= 3);
  const prazos7 = prazos.filter(p => p.diasRestantes !== null && p.diasRestantes <= 7).length;
  const prazosSemData = prazos.filter(p => p.vencimentoISO === null).length;

  // Faixa de HORIZONTE_DIAS dias: bucket por data-calendário (`vencimentoISO`),
  // não por `diasRestantes` — este último arredonda a partir de "agora", não da
  // meia-noite, e deslocaria itens de véspera para a coluna seguinte.
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const faixa = Array.from({ length: HORIZONTE_DIAS }, (_, i) => {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    const iso = toISODate(data);
    return {
      iso,
      offset: i,
      dia: data.getDate(),
      semana: DIA_SEMANA[data.getDay()],
      fimDeSemana: data.getDay() === 0 || data.getDay() === 6,
      count: prazos.filter(p => p.vencimentoISO === iso).length,
    };
  });
  const picoFaixa = Math.max(1, ...faixa.map(d => d.count));

  // `lastScrapedAt` já vem normalizado em ISO por `normalizeDate`, então o
  // maior lexicográfico é o mais recente.
  const ultimaSync = processos.reduce<string | null>(
    (best, p) => (p.lastScrapedAt && (!best || p.lastScrapedAt > best) ? p.lastScrapedAt : best),
    null,
  );
  const sincronizadoHa = haQuanto(ultimaSync);

  // Composição da carteira — derivada da amostra; `totalProcessos` é global.
  const amostrado = processos.length;
  const parcial = totalProcessos > amostrado;
  const porTribunal = contarPorTribunal(processos);
  const grau1 = processos.filter(p => p.grau === '1º').length;
  const grau2 = processos.filter(p => p.grau === '2º').length;
  const porScraper = processos.filter(p => p.origem === 'scraper').length;
  const porDjen = processos.filter(p => p.origem === 'djen').length;
  const valorCausa = processos.reduce((acc, p) => acc + (p.valorCausa ?? 0), 0);

  return (
    <AppLayout active="Dashboard" mobileTitle="Dashboard" mobileBreadcrumb="Início / Dashboard">
      {/* Topbar */}
      <div
        className={styles.topbar}
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'var(--paper)',
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1 }}>
          <div className={styles.topbarTitle}>Dashboard</div>
          <div className={styles.topbarBreadcrumb}>Início / Dashboard</div>
        </div>
        {!semProcessos && <SyncBadge sincronizadoHa={sincronizadoHa} />}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {semProcessos ? (
          semOab ? <PainelSemOab />
          : !jaVarreu ? <PainelSincronizando oab={usuario.oab!} />
          : <PainelSemResultado oab={usuario.oab!} />
        ) : (
        <>
        {/* Cobertura — precede os alertas: muda como tudo abaixo deve ser lido */}
        {semAutenticacao && <AvisoDadosPublicos totalProcessos={totalProcessos} />}

        {/* Alertas — só o que exige ação agora */}
        {prazosCriticos.length > 0 && (
          <div className={styles.dashAlert} style={{ background: 'var(--alert-soft)', borderLeft: '3px solid var(--alert)', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--alert)', flexShrink: 0 }}>
              {prazosCriticos.length} prazo{plural(prazosCriticos.length, '', 's')} crítico{plural(prazosCriticos.length, '', 's')}
            </span>
            <span className={styles.dashAlertPart} style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              — {tituloPrazo(prazosCriticos[0])} vence em {prazosCriticos[0].diasRestantes} dia{plural(prazosCriticos[0].diasRestantes ?? 0, '', 's')}
            </span>
            <Link href="/prazos?urgencia=critico" className={styles.dashAlertLink} style={{ color: 'var(--alert)' }}>
              Ver prazos →
            </Link>
          </div>
        )}

        {/* Stat cards */}
        <div className={styles.statCards} style={{ display: 'flex', border: '1px solid var(--line)', background: 'var(--paper)' }}>
          {[
            {
              label: 'Processos monitorados',
              value: totalProcessos,
              sub: comFalha > 0
                ? `${comFalha} com erro de sincronização`
                : `${totalMovs} movimentaç${plural(totalMovs, 'ão', 'ões')} capturada${plural(totalMovs, '', 's')}`,
              color: 'var(--ink)',
              href: '/processos',
            },
            {
              label: 'Com novidade',
              value: novidades,
              sub: newToday > 0
                ? `${newToday} movimentaç${plural(newToday, 'ão', 'ões')} nova${plural(newToday, '', 's')} em 48h`
                : 'nada novo nas últimas 48h',
              color: novidades > 0 ? 'var(--brick)' : 'var(--ink)',
              href: '/processos?state=signal',
            },
            {
              label: 'Vencendo em 7 dias',
              value: prazos7,
              sub: criticos > 0
                ? `${criticos} crítico${plural(criticos, '', 's')} (≤ 3 dias)`
                : 'nenhum crítico',
              color: criticos > 0 ? 'var(--alert)' : prazos7 > 0 ? 'var(--brick)' : 'var(--ink)',
              href: '/prazos?urgencia=urgente',
            },
          ].map((card, i) => (
            <Link key={i} href={card.href} className={styles.statCard}>
              <div className={styles.statLabel}>{card.label}</div>
              <div className={styles.statNum} style={{ color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10 }}>{card.sub}</div>
            </Link>
          ))}
        </div>

        {/* Faixa dos próximos 14 dias */}
        <div className={styles.faixaPanel} style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}>
          <div className={styles.panelHead} style={{ borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className={styles.panelTitle}>§ PRÓXIMOS {HORIZONTE_DIAS} DIAS</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              {prazosSemData > 0
                ? `${prazosSemData} expediente${plural(prazosSemData, '', 's')} sem data definida`
                : `${prazos.length} prazo${plural(prazos.length, '', 's')} em aberto`}
            </span>
          </div>
          <div className={styles.faixa}>
            {faixa.map(d => {
              const cor = d.count === 0
                ? 'var(--line)'
                : d.offset <= 3 ? 'var(--alert)' : d.offset <= 7 ? 'var(--brick)' : 'var(--ink-3)';
              return (
                <Link
                  key={d.iso}
                  href={`/prazos?fatalFrom=${d.iso}&fatalTo=${d.iso}`}
                  className={styles.faixaDia}
                  data-vazio={d.count === 0 ? '' : undefined}
                  data-fds={d.fimDeSemana ? '' : undefined}
                  title={`${d.count} prazo${plural(d.count, '', 's')} em ${d.iso.split('-').reverse().join('/')}`}
                >
                  <span className={styles.faixaSemana}>{d.semana}</span>
                  <span className={styles.faixaData} style={{ color: d.offset === 0 ? 'var(--brick)' : undefined }}>
                    {d.dia}
                  </span>
                  <span className={styles.faixaBarraTrilho}>
                    <span
                      className={styles.faixaBarra}
                      style={{ height: `${d.count === 0 ? 2 : Math.round((d.count / picoFaixa) * 100)}%`, background: cor }}
                    />
                  </span>
                  <span className={styles.faixaCount} style={{ color: d.count === 0 ? 'var(--ink-4)' : cor }}>
                    {d.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Grade — feed + coluna lateral */}
        <div className={`${styles.dashGrid} ${styles.dashGridLast}`} style={{ display: 'grid', alignItems: 'start' }}>
          {/* Movimentações recentes */}
          <div style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}>
            <div className={styles.panelHead} style={{ borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={styles.panelTitle}>§ MOVIMENTAÇÕES RECENTES</span>
              {newToday > 0 && (
                <span style={{ flexShrink: 0 }} title="detectadas nas últimas 48h">
                  <Seal variant="nova" label={`${newToday} NOVAS`} />
                </span>
              )}
              <Link href="/movimentacoes" className={styles.panelLink} style={{ marginLeft: 'auto' }}>
                Ver todas ({totalMovs}) →
              </Link>
            </div>

            {allMovs.length === 0 ? (
              <PanelVazio texto="Nenhuma movimentação capturada ainda." />
            ) : allMovs.slice(0, 6).map((mov, i, arr) => (
              <Link
                key={mov.id}
                href={`/movimentacoes/${mov.id}`}
                className={styles.movRow}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  color: 'inherit',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--line-soft)' : 'none',
                  background:
                    mov.state === 'signal' ? 'var(--brick-soft)'
                    : mov.state === 'alert' ? 'var(--alert-soft)'
                    : 'transparent',
                }}
              >
                <StatusDot state={mov.state} />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', minWidth: 36 }}>
                  {mov.time}
                </div>
                <TribTag label={mov.tribunal} />
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {mov.parte}
                </div>
                <span className={styles.movTipo} style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', flexShrink: 0 }}>
                  {mov.tipo}
                </span>
                {mov.state === 'signal' && <Seal variant="nova" />}
                {mov.state === 'alert' && <Seal variant="erro" />}
              </Link>
            ))}
          </div>

          {/* Coluna lateral — prazos e composição da carteira */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Próximos prazos */}
            <div style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}>
              <div className={styles.panelHead} style={{ borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={styles.panelTitle}>§ PRÓXIMOS PRAZOS</span>
                <Link href="/prazos" className={styles.panelLink}>Ver todos ({prazos.length}) →</Link>
              </div>

              {prazosOrdenados.length === 0 ? (
                <PanelVazio texto="Nenhum prazo em aberto." />
              ) : prazosOrdenados.slice(0, 6).map((pz, i, arr) => {
                const semData = pz.diasRestantes === null;
                const isCrit = pz.diasRestantes !== null && pz.diasRestantes <= 3;
                const isUrg = pz.diasRestantes !== null && pz.diasRestantes <= 7;
                return (
                  <div
                    key={pz.id}
                    className={styles.prazoRow}
                    style={{ display: 'flex', alignItems: 'center', borderBottom: i < arr.length - 1 ? '1px solid var(--line-soft)' : 'none' }}
                  >
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18, lineHeight: 1, color: isCrit ? 'var(--alert)' : isUrg ? 'var(--brick)' : 'var(--ink-3)', minWidth: 36, textAlign: 'right' }}>
                      {semData ? '—' : `${pz.diasRestantes}d`}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pz.parte || tituloPrazo(pz)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                        {pz.tipo} · {pz.vencimento ?? 'sem prazo definido'}
                      </div>
                    </div>
                    <TribTag label={pz.tribunal} />
                  </div>
                );
              })}
            </div>

            {/* Composição da carteira */}
            <div style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}>
              <div className={styles.panelHead} style={{ borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={styles.panelTitle}>§ CARTEIRA</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink-2)' }}>
                  {totalProcessos}
                </span>
              </div>

              <div className={styles.carteiraBody} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {porTribunal.slice(0, 5).map(row => (
                  <div key={row.tribunal} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', width: 72, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.tribunal}
                    </div>
                    <div style={{ flex: 1, height: 6, background: 'var(--paper-2)', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: '0 auto 0 0', height: '100%', width: `${(row.count / porTribunal[0].count) * 100}%`, background: 'var(--brick)' }} />
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: 'var(--ink-2)', minWidth: 20, textAlign: 'right' }}>
                      {row.count}
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <CarteiraLinha rotulo="1º / 2º grau" valor={`${grau1} / ${grau2}`} />
                <CarteiraLinha rotulo="Autenticado / público" valor={`${porScraper} / ${porDjen}`} />
                  {valorCausa > 0 && (
                    <CarteiraLinha rotulo="Valor em causa" valor={moeda.format(valorCausa)} destaque />
                  )}
                  {parcial && (
                    <div style={{ fontSize: 10, color: 'var(--ink-4)', lineHeight: 1.5 }}>
                      Composição sobre os {amostrado} processos mais recentes de {totalProcessos}.
                    </div>
                  )}
                </div>
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

function SyncBadge({ sincronizadoHa }: { sincronizadoHa: string | null }) {
  const [cor, texto] = sincronizadoHa
    ? ['var(--quiet)', `● SINCRONIZADO · ${sincronizadoHa}`]
    : ['var(--ink-3)', '○ SEM DADOS DE SINCRONIZAÇÃO'];

  return (
    <div
      className={styles.syncBadge}
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 11,
        color: cor,
        background: sincronizadoHa ? 'var(--quiet-soft)' : 'var(--paper-2)',
        padding: '4px 12px',
        border: `1px solid ${cor}`,
        flexShrink: 0,
      }}
    >
      {texto}
    </div>
  );
}

/**
 * Sem credencial de tribunal, a carteira inteira vem do diário oficial: dá para
 * saber que algo foi publicado, não o que está nos autos. O aviso fica acima de
 * tudo porque muda como os números abaixo devem ser lidos.
 */
function AvisoDadosPublicos({ totalProcessos }: { totalProcessos: number }) {
  return (
    <div className={styles.avisoCobertura}>
      <div className={styles.avisoIcone}>
        <ShieldAlert size={16} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className={styles.avisoTitulo}>Somente dados públicos</div>
        <p className={styles.avisoTexto}>
          Você ainda não configurou a autenticação de nenhum tribunal. {totalProcessos > 0
            ? `Os ${totalProcessos} processos abaixo vieram`
            : 'Tudo que aparece aqui vem'}{' '}
          do diário oficial eletrônico (DJEN) — o que é publicado, e só isso.
          Sem o login do tribunal, o robô não entra nos autos: andamentos internos,
          documentos e os expedientes que só aparecem no painel do PJe ficam de fora.
        </p>
      </div>
      <Link href="/credenciais" className={styles.avisoCta}>
        Configurar tribunal →
      </Link>
    </div>
  );
}

function CarteiraLinha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{rotulo}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: destaque ? 'var(--brick)' : 'var(--ink-2)' }}>
        {valor}
      </span>
    </div>
  );
}

function PanelVazio({ texto }: { texto: string }) {
  return (
    <div style={{ padding: '24px 20px', fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
      {texto}
    </div>
  );
}

/**
 * Painel vazio, causa 1: a conta não tem OAB.
 *
 * Antes esta tela pedia "cadastre o login do tribunal" — o pedido mais caro do
 * produto (senha e MFA de um sistema do Judiciário) para quem ainda não tinha
 * visto processo nenhum. A OAB é o pedido barato que faz a carteira aparecer,
 * e é o que falta de verdade: sem ela não há por onde procurar.
 */
function PainelSemOab() {
  return (
    <div className={styles.dashEmpty}>
      <div className={styles.dashEmptyIcon}>
        <Scale size={22} />
      </div>
      <div className={styles.dashEmptyTitle}>Falta a sua OAB</div>
      <p className={styles.dashEmptyDesc}>
        É pela OAB que localizamos seus processos nos diários oficiais — sem ela não temos
        por onde começar. Informe abaixo: não precisa da senha de tribunal nenhum.
      </p>

      <CadastrarOab rotuloBotao="Buscar meus processos" />

      <Link href="/credenciais" className={styles.dashEmptySecundario}>
        <KeyRound size={13} /> Prefiro conectar o login de um tribunal
      </Link>
    </div>
  );
}

/* Causa 2 (a OAB está cadastrada e a primeira varredura ainda não terminou)
   mora em `@/components/varredura/PainelSincronizando`: é a única dos três
   vazios que muda sozinha enquanto a pessoa olha, então precisa ser Client
   Component para consultar o backend e ir revelando os processos que chegam. */

/**
 * Causa 3: já varremos e não veio nada.
 *
 * Duas saídas honestas, porque as duas explicações são plausíveis: o número
 * pode estar errado (corrige ali mesmo) ou a OAB pode simplesmente não ter
 * publicação recente — e aí só o login do tribunal alcança os autos.
 */
function PainelSemResultado({ oab }: { oab: NonNullable<UsuarioAtual['oab']> }) {
  return (
    <div className={styles.dashEmpty}>
      <div className={styles.dashEmptyIcon}>
        <SearchX size={22} />
      </div>
      <div className={styles.dashEmptyTitle}>Nada publicado para a OAB {formatarOab(oab)}</div>
      <p className={styles.dashEmptyDesc}>
        Procuramos nos diários oficiais e não encontramos publicações dessa OAB nos últimos
        meses. Se o número não for esse, corrija abaixo. Se estiver certo, o login do tribunal
        alcança o que não passa pelo diário.
      </p>

      <CadastrarOab oabInicial={oab} rotuloBotao="Procurar de novo" />

      <Link href="/credenciais" className={styles.dashEmptySecundario}>
        <KeyRound size={13} /> Conectar o login de um tribunal
      </Link>
    </div>
  );
}
