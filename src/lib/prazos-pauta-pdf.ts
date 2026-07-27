import type { Prazo } from '@/types';
import { assuntoSecundario, clientePrazo, expedientePrazo } from '@/lib/prazo';

/**
 * PDF da pauta em texto corrido, no formato do e-mail que o escritório já manda:
 *
 *   PRAZOS:
 *
 *   - 16.07.2026 - Município de Sonora (autos de nº 1420564-68.2024.8.12.0000 -
 *     TRF1 - PJe 2º - ICMS CFEM) - prazo para opor Embargos de Declaração
 *     (fatal em 19.07.2026);
 *
 * A data que abre a linha é a **data da pauta**; o marcador final segue a mesma
 * regra do e-mail original — "(prazo fatal)" quando as duas datas coincidem e
 * "(fatal em …)" quando o fatal é posterior.
 */

const PAPER = [250, 248, 243] as const;
const INK = [26, 36, 30] as const;
const INK_MUTED = [91, 101, 94] as const;
const LINE = [211, 210, 203] as const;

const MARGIN_X = 18;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 18;
const FONT_SIZE = 10;
const LINE_HEIGHT = 4.9;
const HANGING_INDENT = 4;

/** Cada prazo vira um card; o respiro entre eles é o que separa um do outro. */
const CARD_PADDING_X = 5;
const CARD_PADDING_Y = 4.5;
const CARD_GAP = 6;
/** Distância do topo do card até a linha de base da primeira linha de texto. */
const FIRST_BASELINE = 3.4;

/** Trecho de texto com peso próprio — o parágrafo é montado a partir deles. */
type Run = { text: string; bold?: boolean };

function fmtISO(iso: string) {
  const [year, month, day] = iso.split('-');
  return year && month && day ? `${day}.${month}.${year}` : '—';
}

function fmtDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

function fileDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Ordem da pauta: data de trabalho, depois o fatal, depois o cliente. */
function ordenarPauta(prazos: Prazo[]): Prazo[] {
  return [...prazos].sort((a, b) =>
    a.pautaISO.localeCompare(b.pautaISO) ||
    a.vencimentoISO.localeCompare(b.vencimentoISO) ||
    a.parte.localeCompare(b.parte, 'pt-BR'),
  );
}

/** Monta a linha do e-mail: "- data - Cliente (autos … ) - prazo para X (marcador);" */
function runsDoPrazo(prazo: Prazo): Run[] {
  const cliente = clientePrazo(prazo);
  const assunto = assuntoSecundario(prazo, cliente);
  const tribunal = prazo.grau ? `${prazo.tribunal} - PJe ${prazo.grau}` : prazo.tribunal;

  const parenteses = [`autos de nº ${prazo.cnj}`, tribunal, assunto]
    .filter(Boolean)
    .join(' - ');

  const marcador = prazo.pautaISO === prazo.vencimentoISO
    ? '(prazo fatal)'
    : `(fatal em ${fmtISO(prazo.vencimentoISO)})`;

  return [
    { text: '- ' },
    { text: fmtISO(prazo.pautaISO), bold: true },
    { text: ` - ${cliente} (${parenteses}) - prazo para ${expedientePrazo(prazo)} ` },
    { text: marcador, bold: true },
    { text: ';' },
  ];
}

type Doc = Awaited<ReturnType<typeof novoDocumento>>;

async function novoDocumento() {
  const { jsPDF } = await import('jspdf');
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
}

/** Palavra já posicionada dentro da linha — `x` é relativo à borda do texto. */
type Pedaco = { text: string; bold: boolean; x: number };

/**
 * Quebra os `runs` em linhas de no máximo `larguraMax`, com recuo pendente nas
 * continuações. Só mede — desenhar fica para `desenhaCard`, que precisa saber a
 * altura antes de traçar a moldura.
 */
function layoutParagrafo(doc: Doc, runs: Run[], larguraMax: number): Pedaco[][] {
  const linhas: Pedaco[][] = [];
  let atual: Pedaco[] = [];
  let x = 0;

  const quebraLinha = () => {
    linhas.push(atual);
    atual = [];
    x = HANGING_INDENT;
  };

  for (const run of runs) {
    doc.setFont('helvetica', run.bold ? 'bold' : 'normal');
    // Mantém os espaços como pedaços próprios para não perder o espaçamento
    // entre runs de pesos diferentes.
    const palavras = run.text.split(/(\s+)/).filter(pedaco => pedaco !== '');

    for (const palavra of palavras) {
      const largura = doc.getTextWidth(palavra);

      if (/^\s+$/.test(palavra)) {
        // Espaço que cairia no fim da linha não é impresso — vira a quebra.
        if (x + largura > larguraMax) continue;
        atual.push({ text: palavra, bold: !!run.bold, x });
        x += largura;
        continue;
      }

      if (x + largura > larguraMax && atual.length > 0) quebraLinha();

      atual.push({ text: palavra, bold: !!run.bold, x });
      x += largura;
    }
  }

  linhas.push(atual);
  return linhas;
}

function alturaCard(linhas: Pedaco[][]): number {
  return linhas.length * LINE_HEIGHT + CARD_PADDING_Y * 2;
}

/** Desenha a moldura e o texto de um prazo. Devolve o `y` do próximo card. */
function desenhaCard(doc: Doc, linhas: Pedaco[][], y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const altura = alturaCard(linhas);

  doc.setFillColor(...PAPER);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN_X, y, pageWidth - MARGIN_X * 2, altura, 'FD');

  doc.setTextColor(...INK);
  let baseline = y + CARD_PADDING_Y + FIRST_BASELINE;
  for (const linha of linhas) {
    for (const pedaco of linha) {
      doc.setFont('helvetica', pedaco.bold ? 'bold' : 'normal');
      doc.text(pedaco.text, MARGIN_X + CARD_PADDING_X + pedaco.x, baseline);
    }
    baseline += LINE_HEIGHT;
  }

  return y + altura + CARD_GAP;
}

export async function createPautaPdf(prazos: Prazo[], generatedAt = new Date()) {
  const doc = await novoDocumento();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`${fmtDate(generatedAt)} - Prazos e Audiências - Avisos`, MARGIN_X, MARGIN_TOP);

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, MARGIN_TOP + 2.6, pageWidth - MARGIN_X, MARGIN_TOP + 2.6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK_MUTED);
  doc.text(
    `${prazos.length} prazo${prazos.length === 1 ? '' : 's'} · data da pauta = 3 dias antes do prazo fatal`,
    MARGIN_X,
    MARGIN_TOP + 7.4,
  );

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_SIZE);
  doc.text('PRAZOS:', MARGIN_X, MARGIN_TOP + 16);

  doc.setFont('helvetica', 'normal');
  let y = MARGIN_TOP + 24;

  if (prazos.length === 0) {
    doc.setTextColor(...INK_MUTED);
    doc.text('Nenhum prazo no período.', MARGIN_X, y);
  } else {
    const larguraTexto = pageWidth - MARGIN_X * 2 - CARD_PADDING_X * 2;

    for (const prazo of ordenarPauta(prazos)) {
      doc.setFontSize(FONT_SIZE);
      const linhas = layoutParagrafo(doc, runsDoPrazo(prazo), larguraTexto);

      // Card nunca é partido ao meio: não cabendo, começa na página seguinte.
      if (y + alturaCard(linhas) > pageHeight - MARGIN_BOTTOM) {
        doc.addPage();
        y = MARGIN_TOP;
      }

      y = desenhaCard(doc, linhas, y);
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.15);
    doc.line(MARGIN_X, pageHeight - 12, pageWidth - MARGIN_X, pageHeight - 12);

    doc.setTextColor(...INK_MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Ponto Processual', MARGIN_X, pageHeight - 7);
    doc.text(`Página ${page} de ${pageCount}`, pageWidth - MARGIN_X, pageHeight - 7, { align: 'right' });
  }

  return doc;
}

export async function downloadPautaPdf(prazos: Prazo[]) {
  const generatedAt = new Date();
  const doc = await createPautaPdf(prazos, generatedAt);
  doc.save(`pauta-prazos-${fileDate(generatedAt)}.pdf`);
}
