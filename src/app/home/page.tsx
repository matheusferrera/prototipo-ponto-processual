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
  Lock,
  EyeOff,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { fraunces } from './fonts';
import { ScrollFx } from './ScrollFx';
import { HeroRays } from './HeroRays';
import { TribunalFlow } from './TribunalFlow';
import { HeroSection } from './HeroSection';
import { LinedIcon } from './LinedIcon';
import { OabSearch } from './OabSearch';
import { CustoRonda } from './CustoRonda';
import { ProvaAlerta } from './ProvaAlerta';
import { Faq } from './Faq';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Ponto Processual — Pare de ser o alarme dos seus processos',
  description:
    'Monitoramento automático de processos judiciais com alertas no WhatsApp. Consulte pela sua OAB e veja seus processos agora, sem senha de tribunal e sem cartão.',
};

const TRIBUNAIS = ['PJe', 'e-SAJ', 'Projudi', 'CPE', 'TJSP', 'TJRJ', 'TJMG', 'TJRN', 'TJPI', 'TRF1', 'TRF3', 'TRT2', 'STJ', 'TST', 'DJEN'];

const PILARES = [
  {
    icon: 'documento' as const,
    pain: 'Hoje: a publicação está em algum lugar entre o diário, o PJe, o e-SAJ, o Projudi e o CPE — cada um com login, layout e formato próprios.',
    title: 'A ronda deixa de ser sua',
    desc: 'A plataforma abre os sistemas, lê publicações, intimações e despachos e joga tudo no processo certo. Você para de procurar.',
  },
  {
    icon: 'prazo' as const,
    pain: 'Hoje: você descobre o prazo relendo a movimentação — e contando os dias úteis na mão.',
    title: 'O prazo já vem contado',
    desc: 'Onde a movimentação abre prazo, a data de vencimento entra no calendário sozinha, em dias úteis, com o feriado do tribunal descontado.',
  },
  {
    icon: 'whatsapp' as const,
    pain: 'Hoje: o cliente liga perguntando status e a planilha de controle está desatualizada desde terça.',
    title: 'Você sabe antes de perguntarem',
    desc: 'O alerta chega no WhatsApp no dia da publicação. Quando o cliente liga, a resposta já está com você.',
  },
];

const NARRATIVA = [
  'Você informa a OAB. A partir daí, a plataforma passa a acompanhar tudo que sai no seu nome — sem você abrir sistema nenhum.',
  'Cada publicação é lida, classificada e ligada ao processo certo, venha ela do diário nacional ou do sistema do tribunal.',
  'Quando aquilo abre prazo, a data entra no seu calendário já contada em dias úteis.',
  'O alerta chega no seu WhatsApp no mesmo dia, dizendo o que saiu e o que aquilo exige de você.',
  'No fim do mês, as horas que você gastava conferindo tribunal voltam para o que só você pode fazer: advogar.',
];

const EXCELENCIA = [
  {
    icon: ScanSearch,
    title: 'Leitura que não cansa e não tira férias',
    desc: 'Publicação vem em PDF, em texto corrido de diário e em tela de sistema. A plataforma lê os três formatos no mesmo ritmo, todo dia, inclusive naquele feriado em que você preferiu não olhar.',
  },
  {
    icon: FileSearch,
    title: 'Prazo com data, não com aviso genérico',
    desc: 'Identificamos o que está pendente em cada processo, a data em que vence e quem precisa agir. E continuamos avisando até sair do vermelho.',
  },
  {
    icon: Radar,
    title: 'Mudou de vara, de instância ou de sistema',
    desc: 'Redistribuição e subida de instância são onde o processo some do radar. Detectamos a mudança e seguimos o processo até o novo lugar.',
  },
  {
    icon: MessageCircleMore,
    title: 'Alerta onde você já olha',
    desc: 'Não é mais um painel para você lembrar de abrir. É o WhatsApp que já está na sua mão, com o resumo do dia e o que exige ação.',
  },
  {
    icon: Gauge,
    title: 'Uma torre de controle da carteira inteira',
    desc: 'O que está parado, o que precisa de ação hoje e o que vence esta semana — em uma tela, sem planilha paralela.',
  },
];

const PARA_QUEM = [
  {
    tag: 'Autônomo',
    title: 'Advogado sozinho, sem estagiário para fazer a conferência diária dos sistemas',
  },
  {
    tag: 'Banca',
    title: 'Escritório em que a carteira cresceu mais rápido que o time de operacional',
  },
  {
    tag: 'Volume',
    title: 'Prática de massa — trabalhista, previdenciário, consumidor — com processos em muitos tribunais ao mesmo tempo',
  },
];

const GARANTIAS = [
  {
    icon: Lock,
    title: 'Você começa sem entregar senha nenhuma',
    desc: 'A consulta inicial usa a base pública do diário nacional — a mesma que qualquer pessoa pode consultar. Nenhuma credencial de tribunal é pedida para você ver o resultado.',
  },
  {
    icon: EyeOff,
    title: 'Se você cadastrar credencial, ela fica cega para nós',
    desc: 'Guardada criptografada em repouso e em trânsito. Ninguém da nossa equipe consegue ler a sua senha — ela é usada exclusivamente pela máquina que lê as suas movimentações.',
  },
  {
    icon: ShieldCheck,
    title: 'Somente leitura. Sempre.',
    desc: 'Nada é protocolado, assinado, juntado ou respondido em seu nome. O ato processual continua sendo seu, inteiro. E você revoga o acesso com um clique, quando quiser.',
  },
];

const SELOS = [
  { icon: ShieldCheck, label: 'LGPD', desc: 'Tratamento de dados conforme a lei' },
  { icon: Scale, label: 'Sigilo profissional', desc: 'Acesso restrito à sua própria credencial' },
  { icon: Lock, label: 'Criptografia', desc: 'Em trânsito e em repouso' },
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
          <a href="#seguranca">Sua senha</a>
          <a href="#perguntas">Perguntas</a>
        </nav>
        <div className={styles.navCtas}>
          <Link href="/login" className={styles.navSecondary}>
            Entrar
          </Link>
          <Link href="/cadastro" className={buttonVariants({ className: styles.navPrimary })}>
            CRIAR CONTA
          </Link>
        </div>
      </header>

      <HeroSection />

      {/* O CUSTO DA RONDA — primeira seção depois do hero de propósito: quem
          não buscou a OAB precisa levar o número da própria dor antes de
          qualquer explicação de produto. */}
      <section className={styles.section} data-nav-theme="light">
        <div>
          <h2 className={styles.h2}>
            <span className={styles.sectionGlyph} aria-hidden="true">§</span>
            Faça a conta do seu plantão
          </h2>
          <p className={styles.sectionLead}>
            Ninguém contrata você para abrir sistema de tribunal. Mas alguém tem que abrir — e hoje é
            você, todo dia, de graça.
          </p>
        </div>
        <CustoRonda />
      </section>

      {/* EM RESUMO — o diagrama mostra literalmente o que a seção descreve:
          tribunais heterogêneos convergindo pro produto, saindo em um único
          fluxo pro WhatsApp do usuário. */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="produto" data-nav-theme="light">
        <div className={styles.resumoGrid}>
          <div>
            <h2 className={styles.h2}>Um lugar só, em vez de um por tribunal</h2>
            <p className={styles.sectionLead}>
              Cada tribunal do país tem o seu sistema, e nenhum deles conversa com o outro. A plataforma
              fala com todos eles — PJe, e-SAJ, Projudi, CPE e o diário nacional — e devolve seus
              processos, movimentações e prazos em um único lugar.
            </p>
          </div>
          <TribunalFlow />
        </div>
      </section>

      {/* O RESULTADO */}
      <section className={styles.section} id="como-funciona" data-nav-theme="light">
        <div>
          <h2 className={styles.h2}>
            Você não perde prazo por desorganização.{' '}
            <br className={styles.brWide} />
            Perde porque a informação não chega até você.
          </h2>
          <p className={styles.sectionLead}>
            O problema nunca foi falta de cuidado. É que a informação está espalhada em sistemas que não
            se falam, e alguém precisa ir buscar cada pedaço. O Ponto Processual é esse alguém.
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

      {/* PROVA DE PRODUTO — substitui os depoimentos: mostra o formato real do
          alerta em vez de citação anônima não verificável. */}
      <section className={`${styles.section} ${styles.sectionAlt}`} data-nav-theme="light">
        <div>
          <h2 className={styles.h2}>É isso que chega no seu WhatsApp</h2>
        </div>
        <ProvaAlerta />
      </section>

      {/* COBERTURA */}
      <section className={styles.section} data-nav-theme="light">
        <div>
          <h2 className={styles.h2}>
            <span className={styles.sectionGlyph} aria-hidden="true">§</span>
            Cobrimos o país inteiro
          </h2>
          <p className={styles.sectionLead}>
            O diário nacional alcança todos os tribunais do Brasil. Sobre ele, sincronizamos direto
            dentro dos sistemas — e essa lista cresce todo mês. Consulte pela sua OAB e veja quais dos
            seus tribunais já entram na sincronização direta.
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
          Da sua OAB até o seu bolso
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

      {/* EXCELÊNCIA OPERACIONAL — lista corrida dividida por friso, não
          grid de cards: o mesmo módulo (ícone + título + texto) já apareceu
          em "O resultado"; repeti-lo em caixas idênticas leria como
          template. Aqui vira índice denso, à la sumário processual. */}
      <section className={`${styles.section} ${styles.sectionDark}`} id="excelencia" data-nav-theme="dark">
        <div>
          <h2 className={`${styles.h2} ${styles.h2Light}`}>O que a plataforma faz enquanto você advoga</h2>
          <p className={`${styles.sectionLead} ${styles.sectionLeadLight}`}>
            Tudo aqui é trabalho que hoje consome a sua manhã — e que ninguém está pagando para você
            fazer.
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
          CRIAR CONTA
        </Link>
      </section>

      {/* PARA QUEM É — três linhas cheias (formato "andamento/docket"),
          não três caixas iguais lado a lado. */}
      <section className={styles.section} data-nav-theme="light">
        <div>
          <h2 className={styles.h2}>Para quem o Ponto Processual foi feito</h2>
        </div>
        <div className={styles.casosList}>
          {PARA_QUEM.map((c, i) => (
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

      {/* SEGURANÇA — trata a objeção nº1 de frente e pelo nome, porque é ela
          que trava o cadastro. Selos genéricos sozinhos não respondem "vocês
          vão pegar minha senha do PJe?". */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="seguranca" data-nav-theme="light">
        <div>
          <h2 className={styles.h2}>
            <span className={styles.sectionGlyph} aria-hidden="true">§</span>
            Sim, vamos falar da sua senha do PJe
          </h2>
          <p className={styles.sectionLead}>
            É a primeira pergunta de todo advogado que chega aqui, e ela merece resposta direta — não
            três selos no rodapé.
          </p>
        </div>
        <div className={styles.garantiasList}>
          {GARANTIAS.map((g, i) => (
            <div
              key={g.title}
              className={styles.garantia}
              data-reveal
              style={{ '--reveal-delay': `${i * 90}ms` } as CSSProperties}
            >
              <span className={styles.garantiaMark}>§{i + 1}</span>
              <g.icon size={20} strokeWidth={1.75} className={styles.garantiaIcon} />
              <div>
                <h3 className={styles.garantiaTitulo}>{g.title}</h3>
                <p className={styles.garantiaDesc}>{g.desc}</p>
              </div>
            </div>
          ))}
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

      {/* PERGUNTAS — último obstáculo antes do CTA. */}
      <section className={styles.section} id="perguntas" data-nav-theme="light">
        <div>
          <h2 className={styles.h2}>Antes que você pergunte</h2>
        </div>
        <Faq />
      </section>

      {/* CTA FINAL — repete a busca por OAB, não um botão genérico: quem
          chegou até aqui já entendeu o produto e está pronto para o mesmo
          microcompromisso do topo. */}
      <section className={styles.finalCta} data-nav-theme="dark">
        <HeroRays />
        <div className={styles.finalCtaInner} data-reveal>
          <h2 className={`${styles.h2} ${styles.h2Light}`}>
            Amanhã de manhã: a ronda de sempre, ou uma mensagem?
          </h2>
          <p className={styles.finalCtaLead}>
            Consulte pela sua OAB e veja, agora, quantos processos seus estão publicando por aí.
          </p>
          <OabSearch />
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
            <a href="#produto">Como funciona</a>
            <a href="#excelencia">Recursos</a>
            <a href="#perguntas">Perguntas</a>
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
