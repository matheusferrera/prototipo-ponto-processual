import type { Metadata } from 'next';
import { Manrope, JetBrains_Mono } from 'next/font/google';
import './globals.css';

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ponto Processual',
    description: 'Monitoramento de processos judiciais com alertas automáticos via WhatsApp.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body style={{ height: '100%', fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
