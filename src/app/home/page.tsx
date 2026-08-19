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
  title: 'Ponto Processual — a ronda nos sistemas dos tribunais, sem você',
  description:
    'Acompanhamento de processos no PJe, e-SAJ, Projudi e no diário nacional, com aviso no WhatsApp no dia da publicação. Consulte pela sua OAB, sem senha de tribunal.',
};

const TRIBUNAIS = ['PJe', 'e-SAJ', 'Projudi', 'CPE', 'TJSP', 'TJRJ', 'TJMG', 'TJRN', 'TJPI', 'TRF1', 'TRF3', 'TRT2', 'STJ', 'TST', 'DJEN'];

const PILARES = [
  {
    icon: 'documento' as const,
    pain: 'A publicação pode estar no diário nacional ou dentro do PJe, do e-SAJ, do Projudi. Cada um com login e formato próprios.',
    title: 'A ronda deixa de ser sua',
    desc: 'A plataforma abre os sistemas, lê o que saiu e arquiva cada publicação no processo a que ela pertence.',
  },
  {
    icon: 'prazo' as const,
    pain: 'Você descobre o prazo relendo a movimentação e contando os dias úteis na mão.',
    title: 'O prazo já vem contado',
    desc: 'Quando a movimentação abre prazo, a data de vencimento entra no calendário já em dias úteis, com o feriado do tribunal descontado.',
  },
  {
    icon: 'whatsapp' as const,
    pain: 'O cliente liga perguntando o andamento e a planilha de controle está parada desde terça.',
    title: 'Quando o cliente liga, você já sabe',
    desc: 'O alerta chega no WhatsApp no mesmo dia da publicação, com o número do processo e o que saiu.',
  },
];

const NARRATIVA = [
  'Você informa a sua OAB. A partir daí a plataforma acompanha tudo que sai no seu nome, sem você abrir sistema nenhum.',
  'Cada publicação é lida e ligada ao processo a que pertence, venha do diário nacional ou do sistema do tribunal.',
  'Se aquilo abre prazo, a data entra no seu calendário contada em dias úteis.',
  'O alerta chega no seu WhatsApp no mesmo dia, com o que saiu e o que aquilo exige de você.',
  'No fim do mês sobram as horas que você gastava conferindo sistema de tribunal.',
];

const EXCELENCIA = [
  {
    icon: ScanSearch,
    title: 'Lê PDF, diário e tela de sistema',
    desc: 'Publicação chega em PDF, em texto corrido de diário e em tela de sistema. A plataforma lê os três no mesmo ritmo, todo dia, feriado incluído.',
  },
  {
    icon: FileSearch,
    title: 'Prazo com data e com responsável',
    desc: 'Identificamos o que está pendente em cada processo, a data em que vence e quem precisa agir. O aviso se repete enquanto o prazo estiver em aberto.',
  },
  {
    icon: Radar,
    title: 'Mudou de vara, de instância ou de sistema',
    desc: 'Redistribuição e subida de instância são onde o processo costuma se perder. A plataforma detecta a mudança e segue o processo até o novo juízo.',
  },
  {
    icon: MessageCircleMore,
    title: 'Alerta onde você já olha',
    desc: 'O aviso vai para o WhatsApp que já está na sua mão, com o resumo do dia e o que exige ação de você.',
  },
  {
    icon: Gauge,
    title: 'A carteira inteira em uma tela',
    desc: 'O que está parado, o que precisa de ação hoje e o que vence esta semana, sem planilha paralela.',
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
    title: 'Prática de massa em trabalhista, previdenciário ou consumidor, com processos espalhados em muitos tribunais',
  },
];

const GARANTIAS = [
  {
    icon: Lock,
    title: 'Você começa sem entregar senha nenhuma',
    desc: 'A consulta inicial usa a base pública do diário nacional, a mesma que qualquer pessoa pode consultar. Para ver o resultado, nenhuma credencial de tribunal é pedida.',
  },
  {
    icon: EyeOff,
    title: 'Se você cadastrar credencial, nós não conseguimos ler',
    desc: 'Ela fica criptografada em repouso e em trânsito. Ninguém da equipe tem como abrir a sua senha: quem usa é a máquina que lê as suas movimentações.',
  },
  {
    icon: ShieldCheck,
    title: 'O acesso é só de leitura',
    desc: 'Nada é protocolado nem assinado em seu nome. O ato processual continua inteiramente seu, e você revoga o acesso quando quiser.',
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
            Ninguém contrata advogado para abrir sistema de tribunal. Mas alguém tem que abrir, e essa
            hora sai do seu dia.
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
            <h2 className={styles.h2}>Um endereço só para o que hoje está espalhado</h2>
            <p className={styles.sectionLead}>
              Cada tribunal do país tem o seu sistema e nenhum deles conversa com o outro. A plataforma
              fala com todos: PJe, e-SAJ, Projudi, CPE e o diário nacional. Seus processos,
              movimentações e prazos voltam reunidos em um lugar só.
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
            A informação está espalhada em sistemas que não se falam, e alguém precisa ir buscar pedaço
            por pedaço. É esse trabalho que a plataforma assume.
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
            O diário nacional alcança todos os tribunais do Brasil. Acima dele, sincronizamos direto
            dentro dos sistemas, e essa lista cresce a cada mês. Consulte pela sua OAB para ver quais
            dos seus tribunais já entram na sincronização direta.
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
            Tudo aqui é trabalho que consome a sua manhã e que ninguém está pagando para você fazer.
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
            É a primeira pergunta de todo advogado que chega aqui. Três selos no rodapé não respondem.
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
            Amanhã de manhã ainda vai ser você abrindo os sistemas?
          </h2>
          <p className={styles.finalCtaLead}>
            Consulte pela sua OAB e veja quantos processos seus estão publicando neste momento.
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
