import type { Prazo } from '@/types';
import { assuntoSecundario, clientePrazo, expedientePrazo, rotuloNatureza } from '@/lib/prazo';

const PAPER = [250, 248, 243] as const;
const INK = [26, 36, 30] as const;
const INK_MUTED = [91, 101, 94] as const;
const LINE = [211, 210, 203] as const;
const PRIMARY = [22, 101, 52] as const;

function textOrFallback(value: string | null | undefined) {
  const text = value?.trim();
  return text || '-';
}

function reportDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function fileDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function createPrazosPdf(prazos: Prazo[], generatedAt = new Date()) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const document = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();

  document.setFillColor(...PRIMARY);
  document.rect(0, 0, pageWidth, 3, 'F');

  document.setTextColor(...INK);
  document.setFont('helvetica', 'bold');
  document.setFontSize(16);
  document.text('Relatório de prazos', 12, 14);

  document.setTextColor(...INK_MUTED);
  document.setFont('helvetica', 'normal');
  document.setFontSize(8.5);
  document.text(
    `Gerado em ${reportDate(generatedAt)} | ${prazos.length} prazo${prazos.length === 1 ? '' : 's'}`,
    12,
    20,
  );

  autoTable(document, {
    startY: 26,
    margin: { top: 13, right: 12, bottom: 16, left: 12 },
    theme: 'grid',
    rowPageBreak: 'avoid',
    // Mesma hierarquia da pauta na tela: cliente lidera, expediente diz o que
    // fazer, assunto entra encurtado (só a folha do caminho do PJe).
    head: [[
      'Prazo fatal',
      'Dias',
      'Tribunal',
      'Cliente',
      'Expediente',
      'Prazo para',
      'Assunto',
      'CNJ',
      'Órgão julgador',
    ]],
    body: prazos.map((prazo) => {
      const cliente = clientePrazo(prazo);
      return [
        prazo.vencimento ?? 'Sem prazo definido',
        prazo.diasRestantes === null ? '-' : String(prazo.diasRestantes),
        textOrFallback(prazo.grau ? `${prazo.tribunal}-${prazo.grau}` : prazo.tribunal),
        textOrFallback(cliente),
        textOrFallback(expedientePrazo(prazo)),
        textOrFallback(rotuloNatureza(prazo)),
        textOrFallback(assuntoSecundario(prazo, cliente)),
        textOrFallback(prazo.cnj),
        textOrFallback(prazo.orgaoJulgador),
      ];
    }),
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      textColor: [...INK],
      lineColor: [...LINE],
      lineWidth: 0.15,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [...PRIMARY],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left',
      minCellHeight: 8,
    },
    alternateRowStyles: {
      fillColor: [...PAPER],
    },
    // Larguras somam 273mm = A4 paisagem (297) menos as margens laterais (2 × 12)
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold' },
      1: { cellWidth: 11, halign: 'center' },
      2: { cellWidth: 17 },
      3: { cellWidth: 50, fontStyle: 'bold' },
      4: { cellWidth: 32 },
      5: { cellWidth: 20 },  // Prazo para (ciência / manifestação)
      6: { cellWidth: 33 },
      7: { cellWidth: 38 },
      8: { cellWidth: 54 },
    },
    didDrawPage: ({ pageNumber }) => {
      if (pageNumber > 1) {
        document.setTextColor(...INK_MUTED);
        document.setFont('helvetica', 'bold');
        document.setFontSize(8);
        document.text('Relatório de prazos', 12, 9);
      }
    },
  });

  const pageCount = document.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page);
    document.setDrawColor(...LINE);
    document.setLineWidth(0.15);
    document.line(12, pageHeight - 12, pageWidth - 12, pageHeight - 12);

    document.setTextColor(...INK_MUTED);
    document.setFont('helvetica', 'normal');
    document.setFontSize(7.5);
    document.text('Ponto Processual', 12, pageHeight - 7);
    document.text(`Página ${page} de ${pageCount}`, pageWidth - 12, pageHeight - 7, {
      align: 'right',
    });
  }

  return document;
}

export async function downloadPrazosPdf(prazos: Prazo[]) {
  const generatedAt = new Date();
  const document = await createPrazosPdf(prazos, generatedAt);
  document.save(`prazos-${fileDate(generatedAt)}.pdf`);
}
