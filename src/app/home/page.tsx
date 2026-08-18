import type { Metadata } from 'next';
import { type CSSProperties } from 'react';
import Link from 'next/link';
import {
  Radar,
  MessageCircleMore,
  FileSearch,
  ShieldCheck,
  Gauge,
  ScanSearch,
  Scale,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { fraunces } from './fonts';
import { ScrollFx } from './ScrollFx';
import { HeroRays } from './HeroRays';
import { TribunalFlow } from './TribunalFlow';
import { HeroSection } from './HeroSection';
import { LinedIcon } from './LinedIcon';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Ponto Processual — Fique à frente de cada prazo',
  description:
    'Monitoramento agêntico de processos judiciais com alertas via WhatsApp. Cobrimos PJe, e-SAJ, Projudi e CPE em todos os tribunais do país.',
};

const TRIBUNAIS = ['PJe', 'e-SAJ', 'Projudi', 'CPE', 'TJSP', 'TJRJ', 'TJRN', 'TJPI', 'TRF', 'STJ', 'TST', 'TJMG'];

const PILARES = [
  {
    icon: 'documento' as const,
    pain: 'Hoje: publicações somem entre PJe, e-SAJ, Projudi e CPE — cada um com login e formato próprio.',
    title: 'Leia cada movimentação automaticamente',
    desc: 'Elimine a fricção de acompanhar manualmente publicações, intimações e despachos em dezenas de tribunais diferentes.',
  },
  {
    icon: 'prazo' as const,
    pain: 'Hoje: um prazo perdido vira prejuízo pro cliente — e risco de responsabilização pro escritório.',
    title: 'Elimine o prazo perdido',
    desc: 'Transforme o calendário processual em alertas automáticos. Priorize o que importa e evite prejuízo ao cliente.',
  },
  {
    icon: 'whatsapp' as const,
    pain: 'Hoje: o cliente liga toda hora perguntando status, e a planilha de controle nunca está atualizada.',
    title: 'Feche o ciclo com seu cliente',
    desc: 'Mantenha clientes informados pelo WhatsApp, sem ligação manual nem planilha de controle.',
  },
];

const NARRATIVA = [
  'O Ponto Processual classifica e organiza automaticamente movimentações de qualquer tribunal — PJe, e-SAJ, Projudi, CPE — direto para o processo certo.',
  'Onde a movimentação muda um prazo, o calendário é atualizado automaticamente.',
  'O sistema verifica novas publicações e intimações a cada ciclo de sincronização, 24 horas por dia.',
  'O status de cada processo e a proximidade do prazo definem as recomendações e alertas do Ponto Processual.',
  'No fim, toda essa informação move você e sua equipe mais rápido, evitando prejuízo e liberando tempo para o que importa: a advocacia.',
];

const DEPOIMENTOS = [
  {
    quote: 'Com o Ponto Processual, paro de abrir seis sistemas de tribunal por dia. Chega tudo no WhatsApp e eu decido em segundos.',
    name: 'Camila R.',
    role: 'Advogada trabalhista',
  },
  {
    quote: 'Eu chamo de “efeito Ponto”. Cada prazo que a gente antecipa vira uma cliente mais tranquila e menos ligação de última hora.',
    name: 'Rafael S.',
    role: 'Sócio, banca previdenciária',
  },
  {
    quote: 'Consigo acompanhar o triplo de processos sem contratar mais ninguém pro operacional.',
    name: 'Beatriz A.',
    role: 'Advogada autônoma',
  },
];

const EXCELENCIA = [
  {
    icon: ScanSearch,
    title: 'Movimentações no piloto automático',
    desc: 'Publicações começam em PDF, print de tela e diário oficial. O Ponto Processual lê tudo isso mais rápido que o estagiário mais dedicado — e sem cansar.',
  },
  {
    icon: FileSearch,
    title: 'Nunca perca um prazo por falta de informação',
    desc: 'Identificamos o que está pendente em cada processo, avisamos a pessoa certa e acompanhamos até resolver.',
  },
  {
    icon: Radar,
    title: 'Triagem inteligente de tribunal e credencial',
    desc: 'Detectamos mudança de vara ou instância cedo. Credenciais são reverificadas automaticamente.',
  },
  {
    icon: MessageCircleMore,
    title: 'Alertas integrados no WhatsApp',
    desc: 'Chega de checar sistema de tribunal toda manhã. Alerta e acompanhamento em um só lugar.',
  },
  {
    icon: Gauge,
    title: 'Uma torre de controle para toda a carteira',
    desc: 'Veja o que está parado, o que precisa de ação hoje e o que impacta seus prazos críticos.',
  },
];

const CASOS_DE_USO = [
  {
    tag: 'Trabalhista',
    title: 'Escritório trabalhista reduz 80% do tempo de triagem de movimentações',
  },
  {
    tag: 'Previdenciário',
    title: 'Banca previdenciária monitora 3x mais processos com a mesma equipe',
  },
  {
    tag: 'Autônomo',
    title: 'Advogado autônomo nunca mais perde prazo desde que automatizou os alertas',
  },
];

const SELOS = [
  { icon: ShieldCheck, label: 'LGPD', desc: 'Tratamento de dados conforme a lei' },
  { icon: Scale, label: 'Sigilo profissional', desc: 'Acesso restrito por credencial própria' },
  { icon: ShieldCheck, label: 'Criptografia', desc: 'Em trânsito e em repouso' },
];

export default function HomePage() {
  return (
    <div className={`${styles.page} ${fraunces.variable}`}>
      <ScrollFx />
      <header className={styles.nav} data-nav data-theme="light">
        <Link href="/home" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          Ponto Processual
        </Link>
        <nav className={styles.navLinks}>
          <a href="#produto">Produto</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#depoimentos">Depoimentos</a>
          <a href="#seguranca">Segurança</a>
        </nav>
        <div className={styles.navCtas}>
          <Link href="/login" className={styles.navSecondary}>
            Entrar
          </Link>
          <Link href="/cadastro" className={buttonVariants({ className: styles.navPrimary })}>
            COMEÇAR AGORA
          </Link>
        </div>
      </header>

      <HeroSection />

      {/* EM RESUMO — o diagrama mostra literalmente o que a seção descreve:
          tribunais heterogêneos convergindo pro produto, saindo em um único
          fluxo pro WhatsApp do usuário. */}
      <section className={styles.section} id="produto" data-nav-theme="light">
        <div className={styles.resumoGrid}>
          <div>
            <h2 className={styles.h2}>Com o Ponto Processual, nenhum prazo escapa</h2>
            <p className={styles.sectionLead}>
              Tome decisões operacionais inteligentes em cada movimentação, prazo ou intimação. Nossa tecnologia
              se integra ao PJe, e-SAJ, Projudi e CPE — e centraliza seus processos, movimentações e prazos em um único lugar.
            </p>
          </div>
          <TribunalFlow />
        </div>
      </section>

      {/* O RESULTADO */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="como-funciona" data-nav-theme="light">
        <div>
          <h2 className={styles.h2}>
            Sem prazo perdido.
            <br />
            Menos risco. Processos sob controle.
          </h2>
          <p className={styles.sectionLead}>
            O Ponto Processual processa e organiza automaticamente cada movimentação para que escritórios
            de alta performance nunca sejam pegos de surpresa.
          </p>
        </div>
        <div className={styles.pillarsList}>
          {PILARES.map((p, i) => (
            <div
              key={p.title}
              className={styles.pillar}
              data-reveal
              style={{ '--reveal-delay': `${i * 90}ms` } as CSSProperties}
            >
              <LinedIcon variant={p.icon} />
              <p className={styles.pillarPain}>{p.pain}</p>
              <h3 className={styles.pillarTitle}>{p.title}</h3>
              <p className={styles.pillarDesc}>{p.desc}</p>
            </div>
          ))}
        </div>
        <a href="#excelencia" className={styles.textCta}>
          CONHEÇA O PRODUTO →
        </a>
      </section>

      {/* COBERTURA */}
      <section className={styles.section} data-nav-theme="light">
        <div>
          <h2 className={styles.h2}>
            <span className={styles.sectionGlyph} aria-hidden="true">§</span>
            Cobrimos os tribunais que importam
          </h2>
          <p className={styles.sectionLead}>
            De bancas grandes a advogados autônomos, monitoramos processos em sistemas de todo o país,
            todos os dias.
          </p>
        </div>
      </section>
      <div className={styles.marqueeWrap} aria-hidden="false">
        <div className={styles.marqueeTrack}>
          {[...TRIBUNAIS, ...TRIBUNAIS].map((t, i) => (
            <span key={`${t}-${i}`} className={styles.marqueeItem}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* NARRATIVA — sequência real (5 etapas do fluxo), por isso a
          numeração é legítima aqui: usamos o § do próprio vocabulário
          processual (§1º, §2º...) em vez de um marcador genérico. */}
      <section className={`${styles.section} ${styles.sectionAlt}`} data-nav-theme="light">
        <h2 className={styles.h2}>
          <span className={styles.sectionGlyph} aria-hidden="true">§</span>
          Prazos monitorados, sempre atualizados
        </h2>
        <div className={styles.narrativa}>
          {NARRATIVA.map((p, i) => (
            <p
              key={i}
              className={styles.narrativaP}
              data-reveal
              style={{ '--reveal-delay': `${i * 90}ms` } as CSSProperties}
            >
              <span className={styles.narrativaMark}>§{i + 1}</span>
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className={styles.section} id="depoimentos" data-nav-theme="light">
        <div>
          <h2 className={styles.h2}>O que dizem os escritórios</h2>
        </div>
        <div className={styles.testimonialGrid}>
          {DEPOIMENTOS.map((d, i) => (
            <figure
              key={d.name}
              className={styles.testimonial}
              data-reveal
              style={{ '--reveal-delay': `${i * 90}ms` } as CSSProperties}
            >
              <blockquote className={styles.testimonialQuote}>&ldquo;{d.quote}&rdquo;</blockquote>
              <figcaption className={styles.testimonialAttr}>
                <span className={styles.testimonialName}>{d.name}</span>
                <span className={styles.testimonialRole}>{d.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* EXCELÊNCIA OPERACIONAL — lista corrida dividida por friso, não
          grid de cards: o mesmo módulo (ícone + título + texto) já apareceu
          em "O resultado"; repeti-lo em caixas idênticas leria como
          template. Aqui vira índice denso, à la sumário processual. */}
      <section className={`${styles.section} ${styles.sectionDark}`} id="excelencia" data-nav-theme="dark">
        <div>
          <h2 className={`${styles.h2} ${styles.h2Light}`}>O Ponto Processual eleva o padrão da advocacia</h2>
          <p className={`${styles.sectionLead} ${styles.sectionLeadLight}`}>
            Escritórios líderes trabalham mais rápido, cometem menos erros e crescem com menos esforço
            operacional.
          </p>
        </div>
        <div className={styles.excelenciaList}>
          {EXCELENCIA.map((f, i) => (
            <div
              key={f.title}
              className={styles.excelenciaItem}
              data-reveal
              style={{ '--reveal-delay': `${i * 70}ms` } as CSSProperties}
            >
              <f.icon size={20} strokeWidth={1.75} className={styles.cardIconLight} />
              <div>
                <h3 className={styles.cardTitleLight}>{f.title}</h3>
                <p className={styles.cardDescLight}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/cadastro" className={styles.ctaLight}>
          COMEÇAR AGORA
        </Link>
      </section>

      {/* CASOS DE USO — três linhas cheias (formato "andamento/docket"),
          não três caixas iguais lado a lado. */}
      <section className={styles.section} data-nav-theme="light">
        <div>
          <h2 className={styles.h2}>Como escritórios usam o Ponto Processual</h2>
        </div>
        <div className={styles.casosList}>
          {CASOS_DE_USO.map((c, i) => (
            <div
              key={c.title}
              className={styles.caso}
              data-reveal
              style={{ '--reveal-delay': `${i * 90}ms` } as CSSProperties}
            >
              <span className={styles.casoTag}>{c.tag}</span>
              <p className={styles.casoTitle}>{c.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SEGURANÇA */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="seguranca" data-nav-theme="light">
        <div>
          <h2 className={styles.h2}>
            <span className={styles.sectionGlyph} aria-hidden="true">§</span>
            Feito para lidar com dados sob sigilo
          </h2>
        </div>
        <div className={styles.selosGrid}>
          {SELOS.map(s => (
            <div key={s.label} className={styles.selo}>
              <s.icon size={18} strokeWidth={1.75} />
              <div>
                <div className={styles.seloLabel}>{s.label}</div>
                <div className={styles.seloDesc}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className={styles.finalCta} data-nav-theme="dark">
        <HeroRays />
        <div className={styles.finalCtaInner} data-reveal>
          <h2 className={`${styles.h2} ${styles.h2Light}`}>Nenhum prazo perdido. Só resultado.</h2>
          <Link href="/cadastro" className={styles.ctaLight}>
            COMEÇAR AGORA
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer} data-nav-theme="dark">
        <div className={styles.footerBrand}>
          <span className={styles.brandMark} aria-hidden="true" />
          Ponto Processual
        </div>
        <div className={styles.footerCols}>
          <div className={styles.footerCol}>
            <span className={styles.footerColTitle}>Produto</span>
            <Link href="/processos">Processos</Link>
            <Link href="/prazos">Prazos</Link>
            <Link href="/credenciais">Credenciais</Link>
          </div>
          <div className={styles.footerCol}>
            <span className={styles.footerColTitle}>Conta</span>
            <Link href="/login">Entrar</Link>
            <Link href="/cadastro">Criar conta</Link>
          </div>
          <div className={styles.footerCol}>
            <span className={styles.footerColTitle}>Legal</span>
            <a href="#seguranca">Segurança</a>
            <a href="#seguranca">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
