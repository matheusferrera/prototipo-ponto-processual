import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowLeft, Lock, ShieldCheck, RadioTower } from 'lucide-react';
import { getPrevia } from '@/lib/previa.server';
import {
  dataCurta,
  haQuantosDias,
  nomeProprio,
  parseSlugOab,
  primeiroNome,
  rotuloMes,
  type PreviaOab,
} from '@/lib/previa';
import { Contador } from './Contador';
import { Revelar } from './Revelar';
import styles from './page.module.css';

/** Quantos processos do inventário ficam legíveis antes do bloqueio. */
const PROCESSOS_ABERTOS = 4;
/** Quantos entram desfocados atrás do cadeado — o bastante para a pilha ter
 *  volume, sem sobrar área morta sob o gradiente que a cobre. */
const PROCESSOS_BORRADOS = 3;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const oab = parseSlugOab(slug);
  const titulo = oab ? `OAB ${oab.numero}/${oab.uf}` : 'Consulta por OAB';

  return {
    title: titulo,
    description: 'Retrato público da atividade desta OAB no Diário de Justiça Eletrônico Nacional.',
    // A URL é estável e compartilhável, mas a página nomeia uma pessoa física a
    // partir de base pública — não entra em índice de busca.
    robots: { index: false, follow: false },
  };
}

const hrefCadastro = (numero: string, uf: string) =>
  `/cadastro?${new URLSearchParams({ oab: numero, uf })}`;

export default async function PaginaOab({ params }: Params) {
  const { slug } = await params;
  const oab = parseSlugOab(slug);
  if (!oab) notFound();

  const resultado = await getPrevia(oab.numero, oab.uf);
  const cadastro = hrefCadastro(oab.numero, oab.uf);

  if (!resultado.ok) {
    return <Falha motivo={resultado.motivo} oab={oab} cadastro={cadastro} />;
  }

  const previa = resultado.previa;

  return (
    <main className={styles.palco} data-palco="oab">
      <Revelar alvo="oab" />
      <Topo />
      {previa.totalProcessos === 0 ? (
        <SemPublicacao previa={previa} oab={oab} cadastro={cadastro} />
      ) : (
        <ComPublicacao previa={previa} oab={oab} cadastro={cadastro} />
      )}
      <Rodape />
    </main>
  );
}

/* ─────────────────────────── Ato 1 — identificação ─────────────────────── */

function ComPublicacao({
  previa,
  oab,
  cadastro,
}: {
  previa: PreviaOab;
  oab: { numero: string; uf: string };
  cadastro: string;
}) {
  const nome = previa.advogado ? nomeProprio(previa.advogado) : null;
  const tratamento = previa.advogado ? primeiroNome(previa.advogado) : null;
  const quando = haQuantosDias(previa.diasDesdeUltima);
  const pico = Math.max(1, ...previa.publicacoesPorMes.map(m => m.total));

  return (
    <>
      {/* ── Ato 1 · quem é, e quanto ────────────────────────────────── */}
      <section className={styles.hero}>
        <Raios />
        <div className={styles.heroConteudo}>
          <p className={styles.eyebrow} style={{ '--i': 0 } as React.CSSProperties}>
            OAB {oab.numero}/{oab.uf} · Diário de Justiça Eletrônico Nacional
          </p>

          {nome && (
            <h1 className={styles.nome} style={{ '--i': 1 } as React.CSSProperties}>
              {nome}
            </h1>
          )}

          <p className={styles.heroLead} style={{ '--i': 2 } as React.CSSProperties}>
            {tratamento ? `${tratamento}, nos` : 'Nos'} últimos seis meses o diário publicou, em nome
            desta OAB, atos de
          </p>

          <p className={styles.numeroLinha} style={{ '--i': 3 } as React.CSSProperties}>
            <Contador ate={previa.totalProcessos} atraso={620} className={styles.numeroGrande} />
            <span className={styles.numeroRotulo}>
              {previa.totalProcessos === 1 ? 'processo' : 'processos'} distintos
            </span>
          </p>

          <dl className={styles.stats} style={{ '--i': 4 } as React.CSSProperties}>
            <Stat valor={previa.totalPublicacoes} rotulo="publicações" />
            <Stat valor={previa.totalClientes} rotulo={previa.totalClientes === 1 ? 'cliente' : 'clientes'} />
            <Stat valor={previa.tribunais.length} rotulo={previa.tribunais.length === 1 ? 'tribunal' : 'tribunais'} />
          </dl>

          <p className={styles.heroNota} style={{ '--i': 5 } as React.CSSProperties}>
            Tudo isso é base pública. Não pedimos sua senha do tribunal para chegar até aqui.
          </p>
        </div>
      </section>

      {/* ── Ato 2 · onde eles estão ─────────────────────────────────── */}
      <section className={styles.ato} data-ato>
        <h2 className={styles.atoTitulo}>
          <span className={styles.atoIndice}>§ 01</span>
          Espalhados por {previa.tribunais.length} {previa.tribunais.length === 1 ? 'tribunal' : 'tribunais'}
        </h2>
        <ul className={styles.tribunais}>
          {previa.tribunais.map((t, i) => (
            <li
              key={t.sigla}
              className={styles.tribunal}
              style={{ '--i': i } as React.CSSProperties}
            >
              <span className={styles.tribunalSigla}>{t.sigla}</span>
              <span className={styles.tribunalQtd}>{t.processos}</span>
            </li>
          ))}
        </ul>
        <p className={styles.atoNota}>
          <ShieldCheck size={13} aria-hidden="true" />
          <span>
            Acompanhamos a publicação em <strong>todos</strong> eles, todos os dias.
          </span>
        </p>
      </section>

      {/* ── Ato 3 · em que ritmo ────────────────────────────────────── */}
      <section className={styles.ato} data-ato>
        <h2 className={styles.atoTitulo}>
          <span className={styles.atoIndice}>§ 02</span>
          O ritmo da sua banca
        </h2>
        <div className={styles.grafico} role="img" aria-label={resumoRitmo(previa)}>
          {previa.publicacoesPorMes.map((m, i) => (
            <div key={m.mes} className={styles.barraCol} style={{ '--i': i } as React.CSSProperties}>
              <span className={styles.barraValor}>{m.total}</span>
              <span className={styles.barraTrilho}>
                <span
                  className={styles.barra}
                  style={{ '--altura': `${Math.round((m.total / pico) * 100)}%` } as React.CSSProperties}
                />
              </span>
              <span className={styles.barraMes}>{rotuloMes(m.mes)}</span>
            </div>
          ))}
        </div>
        <p className={styles.atoNota}>
          <RadioTower size={13} aria-hidden="true" />
          <span>
          {previa.intervaloMedioDias !== null ? (
            <>
              Em média, uma publicação a cada <strong>{previa.intervaloMedioDias}</strong>{' '}
              {previa.intervaloMedioDias === 1 ? 'dia' : 'dias'}.
            </>
          ) : (
            <>Uma única publicação na janela — ainda não dá para falar em ritmo.</>
          )}
          {quando && <> A última foi <strong>{quando}</strong>.</>}
          </span>
        </p>
      </section>

      {/* ── Ato 4 · a virada ────────────────────────────────────────── */}
      <section className={styles.virada} data-ato>
        <span className={styles.viradaPulso} aria-hidden="true" />
        <p className={styles.viradaTexto}>
          {previa.totalProcessos} processos, {previa.totalPublicacoes} publicações.
          <br />
          <strong>Todas já aconteceram.</strong>
        </p>
        <p className={styles.viradaPergunta}>
          {previa.intervaloMedioDias !== null ? (
            <>
              Pelo seu próprio ritmo, a próxima chega em cerca de{' '}
              <em>{previa.intervaloMedioDias} {previa.intervaloMedioDias === 1 ? 'dia' : 'dias'}</em>.
              Você vai saber por onde?
            </>
          ) : (
            <>A próxima vai chegar. Você vai saber por onde?</>
          )}
        </p>
      </section>

      {/* ── Ato 5 · o inventário, travado ───────────────────────────── */}
      <section className={styles.ato} data-ato>
        <h2 className={styles.atoTitulo}>
          <span className={styles.atoIndice}>§ 03</span>
          Seus processos, um a um
        </h2>

        <ul className={styles.inventario}>
          {previa.processos.slice(0, PROCESSOS_ABERTOS).map((p, i) => (
            <ProcessoItem key={p.cnj} processo={p} indice={i} />
          ))}
        </ul>

        {previa.totalProcessos > PROCESSOS_ABERTOS && (
          <div className={styles.travaWrap}>
            <ul className={styles.inventario} data-borrado aria-hidden="true">
              {previa.processos
                .slice(PROCESSOS_ABERTOS, PROCESSOS_ABERTOS + PROCESSOS_BORRADOS)
                .map((p, i) => (
                  <ProcessoItem key={p.cnj} processo={p} indice={i} />
                ))}
            </ul>
            <div className={styles.trava}>
              <Lock size={16} aria-hidden="true" />
              <p className={styles.travaTexto}>
                Faltam <strong>{previa.totalProcessos - PROCESSOS_ABERTOS}</strong> processos nesta lista.
              </p>
              <Link href={cadastro} className={styles.travaCta}>
                Ver a lista completa <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <span className={styles.travaMicro}>Grátis para começar, sem cartão.</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Ato 6 · o que só o login alcança ────────────────────────── */}
      <section className={styles.fecho} data-ato>
        <h2 className={styles.fechoTitulo}>O diário é metade da história</h2>
        <p className={styles.fechoTexto}>
          O que você viu aqui é o que foi <strong>publicado</strong>. Com o seu login do tribunal,
          o robô entra nos autos: andamentos internos, documentos, e os expedientes com prazo que
          só aparecem no painel do PJe — inclusive os que correm em segredo de justiça e nunca
          passam pelo diário.
        </p>
        <Link href={cadastro} className={styles.fechoCta}>
          Monitorar {previa.totalProcessos > 0 ? `meus ${previa.totalProcessos} processos` : 'meus processos'}{' '}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <p className={styles.fechoMicro}>
          Leva dois minutos. A OAB {oab.numero}/{oab.uf} já vai preenchida.
        </p>
      </section>
    </>
  );
}

function Stat({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className={styles.stat}>
      <dt className={styles.statRotulo}>{rotulo}</dt>
      <dd className={styles.statValor}>{valor}</dd>
    </div>
  );
}

function ProcessoItem({ processo, indice }: { processo: import('@/lib/previa').PreviaProcesso; indice: number }) {
  return (
    <li className={styles.processo} style={{ '--i': indice } as React.CSSProperties}>
      <div className={styles.processoTopo}>
        <span className={styles.processoTrib}>
          {processo.tribunal}
        </span>
        <span className={styles.processoCnj}>{processo.cnj}</span>
        <span className={styles.processoData}>{dataCurta(processo.ultimaPublicacao)}</span>
      </div>
      <p className={styles.processoCliente}>{processo.cliente ? nomeProprio(processo.cliente) : '—'}</p>
      {processo.classe && <p className={styles.processoClasse}>{nomeProprio(processo.classe)}</p>}
    </li>
  );
}

/** Descrição textual do gráfico — quem usa leitor de tela recebe a conclusão, não as barras. */
function resumoRitmo(previa: PreviaOab): string {
  const meses = previa.publicacoesPorMes.map(m => `${rotuloMes(m.mes)}: ${m.total}`).join(', ');
  return `Publicações por mês — ${meses}.`;
}

/* ─────────────────────────── Zero publicações ──────────────────────────── */

function SemPublicacao({
  previa,
  oab,
  cadastro,
}: {
  previa: PreviaOab;
  oab: { numero: string; uf: string };
  cadastro: string;
}) {
  const nome = previa.advogado ? nomeProprio(previa.advogado) : null;

  return (
    <>
      <section className={styles.hero}>
        <Raios />
        <div className={styles.heroConteudo}>
          <p className={styles.eyebrow} style={{ '--i': 0 } as React.CSSProperties}>
            OAB {oab.numero}/{oab.uf} · Diário de Justiça Eletrônico Nacional
          </p>
          {nome && (
            <h1 className={styles.nome} style={{ '--i': 1 } as React.CSSProperties}>
              {nome}
            </h1>
          )}
          <p className={styles.zeroTitulo} style={{ '--i': 2 } as React.CSSProperties}>
            Nenhuma publicação nos últimos seis meses.
          </p>
          <p className={styles.heroLead} style={{ '--i': 3 } as React.CSSProperties}>
            E isso <strong>não</strong> quer dizer que você não tem processos.
          </p>
        </div>
      </section>

      <section className={styles.ato} data-ato>
        <h2 className={styles.atoTitulo}>
          <span className={styles.atoIndice}>§ 01</span>
          O que o diário não alcança
        </h2>
        <ul className={styles.motivos}>
          <li className={styles.motivo} style={{ '--i': 0 } as React.CSSProperties}>
            <strong>Segredo de justiça.</strong> Família, sucessões, infância — nada disso é
            publicado com o nome das partes. Existe, corre, tem prazo, e o diário não conta.
          </li>
          <li className={styles.motivo} style={{ '--i': 1 } as React.CSSProperties}>
            <strong>Processo parado.</strong> Sem movimentação no semestre, não há o que publicar —
            até o dia em que há, e aí o prazo já está correndo.
          </li>
          <li className={styles.motivo} style={{ '--i': 2 } as React.CSSProperties}>
            <strong>Intimação pelo painel.</strong> Boa parte dos expedientes do PJe nunca vira
            publicação: aparece no painel do advogado e conta prazo de lá.
          </li>
          <li className={styles.motivo} style={{ '--i': 3 } as React.CSSProperties}>
            <strong>OAB recente ou recém-transferida.</strong> A janela pública é de seis meses.
          </li>
        </ul>
      </section>

      <section className={styles.virada} data-ato>
        <span className={styles.viradaPulso} aria-hidden="true" />
        <p className={styles.viradaTexto}>
          O diário é a fonte <strong>mais fraca</strong> que existe.
        </p>
        <p className={styles.viradaPergunta}>
          É justamente por isso que a gente entra no tribunal com o seu login — e enxerga o que
          esta página não conseguiu enxergar.
        </p>
      </section>

      <section className={styles.fecho} data-ato>
        <h2 className={styles.fechoTitulo}>Vamos olhar de dentro</h2>
        <p className={styles.fechoTexto}>
          Com a sua credencial do PJe, CPE ou Projudi, o robô abre o painel do advogado e traz o
          que está lá: processos, andamentos, documentos e os expedientes com prazo fatal.
        </p>
        <Link href={cadastro} className={styles.fechoCta}>
          Conectar meu tribunal <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <p className={styles.fechoMicro}>
          Leva dois minutos. A OAB {oab.numero}/{oab.uf} já vai preenchida.
        </p>
      </section>
    </>
  );
}

/* ─────────────────────────── Falhas ────────────────────────────────────── */

function Falha({
  motivo,
  oab,
  cadastro,
}: {
  motivo: 'oab-invalida' | 'limite' | 'indisponivel';
  oab: { numero: string; uf: string };
  cadastro: string;
}) {
  const copy = {
    'oab-invalida': {
      titulo: 'Essa OAB não confere',
      texto: 'O diário não reconheceu esse número e UF. Confira e tente de novo.',
    },
    limite: {
      titulo: 'Muitas consultas seguidas',
      texto: 'A consulta pública tem limite por IP. Espere alguns minutos e tente de novo.',
    },
    indisponivel: {
      titulo: 'O diário não respondeu',
      texto:
        'A consulta pública do DJEN está fora do ar neste momento — acontece, e não diz nada sobre os seus processos. Tente de novo em instantes.',
    },
  }[motivo];

  return (
    <main className={styles.palco} data-palco="oab">
      <Topo />
      <section className={styles.hero}>
        <Raios />
        <div className={styles.heroConteudo}>
          <p className={styles.eyebrow}>
            OAB {oab.numero}/{oab.uf}
          </p>
          <h1 className={styles.falhaTitulo}>{copy.titulo}</h1>
          <p className={styles.heroLead}>{copy.texto}</p>
          <div className={styles.falhaAcoes}>
            <Link href="/home" className={styles.falhaVoltar}>
              <ArrowLeft size={14} aria-hidden="true" /> Consultar outra OAB
            </Link>
            <Link href={cadastro} className={styles.fechoCta}>
              Criar conta <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <Rodape />
    </main>
  );
}

/* ─────────────────────────── Cromo ─────────────────────────────────────── */

function Topo() {
  return (
    <header className={styles.topo}>
      <Link href="/home" className={styles.topoVoltar}>
        <ArrowLeft size={14} aria-hidden="true" />
        <span className={styles.topoMarca}>Ponto Processual</span>
      </Link>
    </header>
  );
}

function Rodape() {
  return (
    <footer className={styles.rodape}>
      <p>
        Consulta feita na base pública do Diário de Justiça Eletrônico Nacional (CNJ), janela de
        seis meses. Os dados são do próprio diário — nós só os organizamos.
      </p>
    </footer>
  );
}

/** Leque de faixas do hero — puramente decorativo, mesma linguagem da landing. */
function Raios() {
  return (
    <div className={styles.raios} aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className={styles.raio} style={{ '--i': i } as React.CSSProperties} />
      ))}
    </div>
  );
}
