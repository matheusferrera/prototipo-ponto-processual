import type { Metadata } from 'next';
import Link from 'next/link';
import { dataWallClock } from '@/lib/wall-clock';
import { notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Seal } from '@/components/ui/Seal/Seal';
import { TribTag } from '@/components/ui/TribTag/TribTag';
import { getMovimentacao } from '@/lib/api.server';
import { getAbsoluteUrl } from '@/lib/site-url';
import styles from './page.module.css';
import {
  DocumentosDoAto,
  FichaDoAto,
  PrazoDoAto,
  ProvidenciaDoAto,
  TeorDoAto,
} from '@/components/movimentacoes/AtoDetalhe/AtoDetalhe';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const mov = await getMovimentacao(id);

  if (!mov) return { title: 'Movimentação não encontrada' };

  const proc = mov.processData;
  const tribunal = proc?.tribunal.replace(/G[12]$/, '') ?? '—';
  const partes = proc?.summary?.partes?.split(';')[0].trim() ?? '—';
  const description = proc ? `${tribunal} · CNJ ${proc.numero}` : 'Movimentação';
  const imageUrl = getAbsoluteUrl('/opengraph-image');

  return {
    title: `Movimentação — ${partes}`,
    description,
    openGraph: {
      title: `Movimentação — ${partes}`,
      description,
      type: 'article',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: 'Ponto Processual — Movimentação' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Movimentação — ${partes}`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function MovimentacaoDetailPage({ params }: Props) {
  const { id } = await params;
  const mov = await getMovimentacao(id);
  if (!mov) notFound();

  const proc = mov.processData;
  const tribunal = proc?.tribunal.replace(/G[12]$/, '') ?? '—';
  const cnj = proc?.numero ?? '—';
  const partes = proc?.summary?.partes?.split(';')[0].trim() ?? '—';

  const isNew = mov.novo;

  // A data que a página exibe é a da PUBLICAÇÃO, não a da detecção: é ela que
  // faz a intimação correr e de quem o prazo é contado. `detectedAt` responde
  // "quando nós vimos", que é operação nossa, e vive no rodapé.
  const publicadoEm = dataWallClock(new Date(mov.ocorridoEm));

  return (
    <AppLayout active="Movimentações">
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* Breadcrumb — Movimentações / CNJ / rótulo do ato. O CNJ no meio é o
            degrau que faltava: sem ele o caminho pulava do feed direto para o
            ato e não havia volta para o processo daqui de cima. Sem o cuid da
            movimentação, que aparecia aqui e de novo dentro do card — ninguém
            procura um ato por `cmtm3v7mq000v…`. */}
        <div
          className={styles.breadcrumb}
          style={{ borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}
        >
          <Link href="/movimentacoes" style={{ fontSize: 11, color: 'var(--ink-3)', textDecoration: 'none' }}>← Movimentações</Link>
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>/</span>
          {proc ? (
            <Link
              href={`/processos/${encodeURIComponent(cnj)}`}
              style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              {cnj}
            </Link>
          ) : (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>{cnj}</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>/</span>
          <span
            className={styles.breadcrumbCurrent}
            style={{ fontSize: 11, color: 'var(--ink-3)' }}
            title={mov.descricao}
          >
            {mov.descricao}
          </span>
          <div style={{ flex: 1 }} />
          {proc?.summary?.link && (
            <a
              href={proc.summary.link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.pillBtn}
              style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 0, cursor: 'pointer', textDecoration: 'none' }}
            >
              Abrir no tribunal ↗
            </a>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            HERO — O QUE ACONTECEU.

            Antes o maior tipo da página era o nome do cliente e o segundo era
            o CNJ; a leitura do ato ficava em corpo 14 no meio de um card, e a
            providência, em cinza, abaixo dela. Mas quem abre esta página já
            sabe de que processo veio — clicou nele no feed. A pergunta que
            trouxe a pessoa aqui é "o que o juiz decidiu e o que eu faço com
            isso", e é ela que o hero passa a responder.
            ───────────────────────────────────────────────────────────────── */}
        <div
          className={styles.hero}
          style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <TribTag label={tribunal} />
            {/* O rótulo só vem para cá quando o TÍTULO é a leitura da IA. Sem
                análise o título já É o rótulo, e repeti-lo aqui escreveria
                "Pauta de Julgamento — 3ª Turma Criminal" duas vezes, uma sobre
                a outra. Mesma regra do feed. */}
            {mov.ia.resumo && (
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>
                {mov.descricao}
              </span>
            )}
            {isNew && <Seal variant="nova" />}
            {mov.origem === 'djen' && <Seal variant="outline" label="diário" />}
          </div>

          {/* A leitura do ato é o título. Quando a IA não rodou, o rótulo sobe
              para cá — nunca fica sem manchete. */}
          <h1 className={styles.title} style={{ fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em', textWrap: 'balance', maxWidth: '68ch' }}>
            {mov.ia.resumo || mov.descricao}
          </h1>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <Link
              href={`/processos/${encodeURIComponent(cnj)}`}
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none', borderBottom: '1px solid var(--line)' }}
            >
              {partes}
            </Link>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>{cnj}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>publicado em {publicadoEm}</span>
          </div>
        </div>

        <div className={styles.main} style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div className={styles.timeline} style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>

            {/* ATÉ QUANDO · O QUE FAZER · O TEXTO.

                Os três blocos moram em `components/movimentacoes/AtoDetalhe/`
                desde 06/09/2026, porque a linha expandida do feed
                (`/movimentacoes?aberta=<id>`) mostra exatamente os mesmos. Aqui
                eles vêm intercalados com o hero e a coluna do processo; lá vêm
                sozinhos, porque a linha logo acima já diz de que ato se trata.
                Duplicar o bloco do prazo seria garantir que a próxima correção
                de regra entre em um dos dois só. */}
            <PrazoDoAto mov={mov} />
            <ProvidenciaDoAto mov={mov} />
            <TeorDoAto mov={mov} />
          </div>

          {/* Sidebar — o processo, e só. "Sync: success" e a bolinha vermelha
              de "Não monitorado" saíram: são estado interno da varredura, e
              processo vindo da consulta pública é `monitored: false` por
              construção — a bolinha assustava sem informar nada. */}
          <aside className={styles.sidebar} style={{ background: 'var(--paper-2)', overflow: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-2)', marginBottom: 12 }}>§ Processo</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{partes}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-2)', marginTop: 4 }}>{cnj}</div>

            <Link
              href={`/processos/${encodeURIComponent(cnj)}`}
              className={styles.pillBtn}
              style={{ display: 'inline-flex', alignItems: 'center', marginTop: 16, fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12, border: '1px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 0, textDecoration: 'none' }}
            >
              Ver processo →
            </Link>

            {/* A MESMA ficha do painel do feed — publicado, detectado, origem,
                fontes que confirmaram, leitura da IA com data e confiança, nº do
                movimento, órgão e instância. Antes esta coluna mostrava um
                subconjunto diferente do mesmo registro em cada tela, que é
                exatamente o que produziu a duplicação da linha antes dela. */}
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-2)', marginTop: 28, marginBottom: 8 }}>§ Ficha</div>
            <FichaDoAto mov={mov} />

            {(mov.temCertidao || mov.link || mov.documentos.length > 0) && (
              <>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-2)', marginTop: 28, marginBottom: 12 }}>§ Documento</div>
                <DocumentosDoAto mov={mov} />
              </>
            )}
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
