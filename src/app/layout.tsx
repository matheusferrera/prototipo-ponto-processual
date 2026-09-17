import type { Metadata } from 'next';
import { Manrope, JetBrains_Mono, Geist } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { getAbsoluteUrl, getSiteUrl } from '@/lib/site-url';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: 'Ponto Processual',
    template: '%s — Ponto Processual',
  },
  description: 'Monitoramento de processos judiciais com alertas automáticos via WhatsApp.',
  openGraph: {
    title: 'Ponto Processual',
    description: 'Monitoramento de processos judiciais com alertas automáticos via WhatsApp.',
    siteName: 'Ponto Processual',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: getAbsoluteUrl('/opengraph-image'),
        width: 1200,
        height: 630,
        alt: 'Ponto Processual — Monitoramento de Processos Judiciais',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ponto Processual',
    description: 'Monitoramento de processos judiciais com alertas automáticos via WhatsApp.',
    images: [getAbsoluteUrl('/opengraph-image')],
  },
};

/**
 * A fenda `@card` mora na RAIZ, e a posição é a decisão.
 *
 * Ela existe para `app/@card/(.)movimentacoes/[id]` interceptar a navegação
 * para um ato **venha ela de onde vier** — e vem de nove lugares: o feed, o
 * painel, a pauta de prazos, o fio, a timeline do processo, o panorama, as
 * análises da IA e as movimentações recentes do dashboard. Com o interceptador
 * dentro de `movimentacoes/`, só os cliques que já estavam no feed abriam o
 * card; todos os outros caíam na página, e o advogado via a mesma movimentação
 * de duas formas diferentes dependendo de onde clicou.
 *
 * > **E havia um defeito de verdade nessa posição.** Com o interceptador irmão
 * > do alvo (`movimentacoes/@card/(.)[id]` ao lado de `movimentacoes/[id]`), o
 * > Next 16.2.5 duplica o marcador em desenvolvimento e recusa a rota:
 * > `Invalid interception route: /movimentacoes/(.)(.)(.)(.)(.)<id>`. A build
 * > de produção aceitava, o dev não — o card simplesmente não abria, sem nada
 * > na tela dizendo por quê. Na raiz o problema não existe.
 *
 * `@card/default.tsx` devolve `null`: em toda navegação que NÃO é interceptada
 * — inclusive o F5 e o link direto — a fenda fica vazia e a página do ato
 * renderiza sozinha.
 */
export default function RootLayout({
  children,
  card,
}: {
  children: React.ReactNode;
  card: React.ReactNode;
}) {
  return (
    /* Sem `h-full` no <html> nem `height: 100%` no <body>: os dois faziam do
       body o ROLADOR no celular (html preso na altura da janela). O shell fixo
       do desktop recebe a altura do globals.css a partir de 768px — ver o
       comentário de `html, body` lá. */
    <html
      lang="pt-BR"
      className={cn(manrope.variable, jetbrainsMono.variable, "font-sans", geist.variable)}
    >
      <body style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}>
        {children}
        {card}
      </body>
    </html>
  );
}
