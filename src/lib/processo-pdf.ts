import type { Prazo, Processo, ProcessoParte, TimelineEvent } from '@/types';
import { expedientePrazo, rotuloNatureza } from '@/lib/prazo';
import { semCodigo } from '@/lib/pje-text';

/**
 * O dossiê de UM processo em PDF — capa, partes, prazos, movimentações e a
 * lista de documentos.
 *
 * Retrato, e não paisagem como o `prazos-pdf.ts`: lá o conteúdo é uma planilha
 * de nove colunas estreitas; aqui o corpo é PROSA — o rótulo do ato e a leitura
 * que a IA fez dele. Coluna larga em paisagem daria linha de 40 palavras, que é
 * onde o olho perde o lugar ao voltar.
 *
 * **O inteiro teor do ato NÃO entra.** Ele existe (`Movement.textoOriginal`,
 * média de 3,8 KB e máximo medido de 264 mil caracteres), mas custaria uma
 * requisição por movimentação e um único edital de massa passaria de 60
 * páginas. O que entra é o par que responde "o que aconteceu e o que eu faço":
 * o rótulo do tribunal e o `resumo`/`acao` da IA. Quem quer o teor abre o ato,
 * ou baixa a certidão de publicação.
 *
 * **Também não anexa as certidões.** Elas são listadas com a movimentação de
 * origem, sem os bytes: a chave que as abre no CNJ nunca chega ao browser (ver
 * `/api/movimentacoes/{id}/certidao`), então juntá-las exigiria gerar o PDF no
 * servidor. A seção de documentos diz o que existe e onde está.
 */

const PAPER = [250, 248, 243] as const;
const INK = [26, 36, 30] as const;
const INK_MUTED = [91, 101, 94] as const;
const LINE = [211, 210, 203] as const;
const PRIMARY = [22, 101, 52] as const;
const ALERT = [153, 27, 27] as const;

/** Margens laterais; a largura útil do A4 retrato é 210 − 2 × 14 = 182 mm. */
const MARGIN = 14;
const CONTENT_WIDTH = 210 - MARGIN * 2;

export interface DossieProcesso {
  processo: Processo;
  prazos: Prazo[];
  /** As movimentações que entram no PDF — no máximo 100, as mais recentes. */
  timeline: TimelineEvent[];
  /** Quantas o processo tem ao todo. Maior que `timeline.length` = PDF recortado. */
  totalMovimentacoes: number;
}

/**
 * Troca o que a fonte do PDF não sabe desenhar.
 *
 * As 14 fontes padrão do PDF (helvetica entre elas) são codificadas em
 * **WinAnsi**, que é Latin-1 mais um punhado de tipográficos. Acento português,
 * travessão, aspas curvas e reticências estão lá; seta, "aproximadamente" e
 * bullet redondo NÃO — e jsPDF não avisa, desenha outro glifo. Medido: `→`
 * saía como `!'` no meio da frase da IA.
 *
 * O texto vem de duas fontes que ninguém controla — o rótulo do tribunal e a
 * prosa do modelo —, então o saneamento é por classe, não por caractere
 * conhecido: o que sobra fora do WinAnsi vira `?`, que é feio e visível, em
 * vez de um glifo errado que parece intencional.
 */
function sanear(texto: string): string {
  return texto
    .replace(/[\u2192\u21d2]/g, '>')       // → ⇒
    .replace(/\u2248/g, '~')               // ≈
    .replace(/[\u2264]/g, '<=').replace(/[\u2265]/g, '>=')
    .replace(/[\u2022\u25aa\u25cf]/g, '-')  // • ▪ ●
    .replace(/[\u2713\u2714]/g, 'ok')      // ✓ ✔
    .replace(/\u00a0/g, ' ')
    // WinAnsi = Latin-1 + a faixa 0x80–0x9F (travessão, aspas curvas,
    // reticências, †, ‰…). O resto não tem glifo.
    .replace(/[^\u0000-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u201a\u201e\u2020\u2021\u2026\u2030\u2039\u203a\u20ac\u0192\u02c6\u02dc\u0160\u0152\u017d\u0161\u0153\u017e\u0178\u2122]/g, '?');
}

function textoOu(valor: string | null | undefined, vazio = '—') {
  const texto = valor?.trim();
  return texto ? sanear(texto) : vazio;
}

function dataRelatorio(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function dataArquivo(date: Date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function dataCurta(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return textoOu(iso);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Uma parte por linha, com os advogados logo abaixo do nome.
 *
 * Vai numa célula só, e não em duas colunas, porque o número de representantes
 * varia de zero a uma dúzia: em coluna própria a tabela ficaria com uma coluna
 * quase sempre vazia e uma linha ocasional de doze nomes.
 */
function celulaParte(parte: ProcessoParte): string {
  const advogados = parte.representantes.filter(Boolean);
  if (advogados.length === 0) return textoOu(parte.nome);
  return `${textoOu(parte.nome)}\n${sanear(advogados.join(' · '))}`;
}

/** "há 3 dias", "vence hoje", "venceu há 2 dias" — o mesmo vocabulário da tela. */
function prazoEmPalavras(dias: number | null): string {
  if (dias === null) return 'sem data definida';
  if (dias < 0) return `venceu há ${Math.abs(dias)}d`;
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return `faltam ${dias}d`;
}

export async function createProcessoPdf(dossie: DossieProcesso, generatedAt = new Date()) {
  const { processo, prazos, timeline, totalMovimentacoes } = dossie;

  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  /**
   * Piso da próxima seção.
   *
   * `secao` se orienta pelo `finalY` da última tabela, e o que é escrito com
   * `doc.text()` — o erro de sincronização, abaixo — não mexe nesse valor. Sem
   * o piso, o título "Partes" era desenhado por cima da linha do erro.
   */
  let pisoY = 0;

  /** `secao` com o `doc` já ligado; devolve o `startY` da tabela da seção. */
  const abrirSecao = (titulo: string, contagem: string | null) => secao(doc, titulo, contagem, pisoY);

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 3, 'F');

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(sanear(processo.cnj), MARGIN, 14);

  doc.setTextColor(...INK_MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const subtitulo = [
    textoOu(processo.tribunal),
    processo.grau ? `${processo.grau} grau` : null,
    textoOu(semCodigo(processo.classeJudicial ?? '') || processo.classeJudicial, ''),
  ].filter(Boolean).join(' · ');
  doc.text(sanear(subtitulo), MARGIN, 20);

  doc.setFontSize(8);
  doc.text(`Gerado em ${dataRelatorio(generatedAt)}`, pageWidth - MARGIN, 20, { align: 'right' });

  // ── Capa: os campos do processo, dois pares por linha ───────────────────────
  const capa: Array<[string, string]> = [
    ['Órgão julgador', textoOu(processo.orgaoJulgador)],
    ['Classe judicial', textoOu(processo.classeJudicial)],
    ['Assunto', textoOu(processo.assunto)],
    ['Valor da causa', processo.valorCausa == null ? '—' : moeda.format(processo.valorCausa)],
    ['Autuado em', dataCurta(processo.autuadoEm)],
    ['Última movimentação', dataCurta(processo.lastMovAt)],
    // De onde o dado veio muda o que ele vale: o painel autenticado dá prazo
    // oficial; o DJEN dá prazo CALCULADO. Sem isso o PDF apresenta as duas
    // procedências com a mesma cara.
    ['Procedência', processo.origem === 'scraper' ? 'Painel do tribunal (credencial)' : processo.origem === 'djen' ? 'DJEN — diário oficial' : '—'],
    ['Verificado em', dataCurta(processo.lastScrapedAt)],
  ];

  autoTable(doc, {
    startY: 26,
    margin: { left: MARGIN, right: MARGIN, bottom: 16 },
    theme: 'plain',
    body: capa.reduce<Array<[string, string, string, string]>>((linhas, par, i) => {
      if (i % 2 === 0) linhas.push([par[0], par[1], '', '']);
      else {
        linhas[linhas.length - 1][2] = par[0];
        linhas[linhas.length - 1][3] = par[1];
      }
      return linhas;
    }, []),
    styles: {
      font: 'helvetica', fontSize: 8, textColor: [...INK],
      cellPadding: { top: 1.2, right: 3, bottom: 1.2, left: 0 },
      overflow: 'linebreak', valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: 30, textColor: [...INK_MUTED] },
      1: { cellWidth: 61, fontStyle: 'bold' },
      2: { cellWidth: 30, textColor: [...INK_MUTED] },
      3: { cellWidth: 61, fontStyle: 'bold' },
    },
  });

  if (processo.syncError) {
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
    doc.setTextColor(...ALERT);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    // Quebra na largura útil: mensagem de erro de tribunal vem em uma linha só,
    // e uma frase de 200 caracteres sairia por cima da margem direita.
    const linhas = doc.splitTextToSize(sanear(`Erro de sincronização: ${processo.syncError}`), CONTENT_WIDTH);
    doc.text(linhas, MARGIN, y);
    pisoY = y + linhas.length * 4;
  }

  // ── Partes ─────────────────────────────────────────────────────────────────
  const partes: Array<[string, string]> = [
    ...processo.poloAtivo.map((p): [string, string] => ['Ativo', celulaParte(p)]),
    ...processo.poloPassivo.map((p): [string, string] => ['Passivo', celulaParte(p)]),
  ];

  const yPartes = abrirSecao('Partes', partes.length ? `${partes.length}` : null);
  autoTable(doc, {
    margin: { left: MARGIN, right: MARGIN, top: 20, bottom: 16 },
    theme: 'grid',
    rowPageBreak: 'avoid',
    startY: yPartes,
    head: [['Polo', 'Parte e representantes']],
    body: partes.length ? partes : [['—', 'Nenhuma parte registrada para este processo.']],
    ...estiloTabela(),
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: CONTENT_WIDTH - 22 },
    },
  });

  // ── Prazos ─────────────────────────────────────────────────────────────────
  const yPrazos = abrirSecao('Prazos', prazos.length ? `${prazos.length}` : null);
  autoTable(doc, {
    margin: { left: MARGIN, right: MARGIN, top: 20, bottom: 16 },
    theme: 'grid',
    rowPageBreak: 'avoid',
    startY: yPrazos,
    head: [['Vencimento', 'Situação', 'Expediente', 'Cobra', 'Parte']],
    body: prazos.length
      ? prazos.map((pz) => [
          pz.vencimento ?? 'Sem data',
          prazoEmPalavras(pz.diasRestantes),
          textoOu(expedientePrazo(pz)),
          textoOu(rotuloNatureza(pz)),
          textoOu(pz.parte),
        ])
      : [['—', '—', 'Nenhum prazo registrado para este processo.', '—', '—']],
    ...estiloTabela(),
    // Prazo vencido em vermelho: num PDF impresso não há cor de status na tela
    // para consultar, e a linha precisa se denunciar sozinha.
    didParseCell: ({ section, row, cell, column }) => {
      if (section !== 'body' || !prazos.length) return;
      const dias = prazos[row.index]?.diasRestantes;
      if (dias !== null && dias !== undefined && dias < 0 && column.index <= 1) {
        cell.styles.textColor = [...ALERT];
        cell.styles.fontStyle = 'bold';
      }
    },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 56 },
      3: { cellWidth: 24 },
      4: { cellWidth: CONTENT_WIDTH - 130 },
    },
  });

  // ── Movimentações ──────────────────────────────────────────────────────────
  const recortado = totalMovimentacoes > timeline.length;
  const yMovs = abrirSecao(
    'Movimentações',
    recortado ? `${timeline.length} de ${totalMovimentacoes}` : timeline.length ? `${timeline.length}` : null,
  );
  autoTable(doc, {
    margin: { left: MARGIN, right: MARGIN, top: 20, bottom: 16 },
    theme: 'grid',
    rowPageBreak: 'avoid',
    startY: yMovs,
    head: [['Data', 'Nº', 'Ato', 'Leitura']],
    body: timeline.length
      ? timeline.map((ev) => [
          `${ev.date}\n${ev.ano}`,
          ev.n,
          textoOu(ev.title),
          // O resumo é a manchete; a ação é o que fazer. Quando a IA não rodou,
          // a célula diz isso em vez de ficar vazia — vazio parece "nada a
          // fazer", e não é a mesma informação.
          [ev.ia?.resumo, ev.ia?.acao ? `Fazer: ${ev.ia.acao}` : null]
            .filter(Boolean).map((t) => sanear(t!)).join('\n') || 'Ato não analisado.',
        ])
      : [['—', '—', 'Nenhuma movimentação registrada para este processo.', '—']],
    ...estiloTabela(),
    columnStyles: {
      0: { cellWidth: 16, fontStyle: 'bold' },
      1: { cellWidth: 11, halign: 'center', textColor: [...INK_MUTED] },
      2: { cellWidth: 58 },
      3: { cellWidth: CONTENT_WIDTH - 85 },
    },
  });

  // ── Documentos ─────────────────────────────────────────────────────────────
  const documentos = timeline.flatMap((ev) => [
    ...ev.documentos.map((d) => [`${ev.date} ${ev.ano}`, textoOu(ev.title), textoOu(d.nome), 'Anexo do tribunal']),
    ...(ev.temCertidao ? [[`${ev.date} ${ev.ano}`, textoOu(ev.title), 'Certidão de publicação', 'PDF oficial do CNJ']] : []),
  ]);

  const yDocs = abrirSecao('Documentos', documentos.length ? `${documentos.length}` : null);
  autoTable(doc, {
    margin: { left: MARGIN, right: MARGIN, top: 20, bottom: 16 },
    theme: 'grid',
    rowPageBreak: 'avoid',
    startY: yDocs,
    head: [['Data', 'Movimentação', 'Documento', 'Origem']],
    body: documentos.length
      ? documentos
      : [['—', '—', 'Nenhum documento disponível nas movimentações exportadas.', '—']],
    ...estiloTabela(),
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 62 },
      2: { cellWidth: 56 },
      3: { cellWidth: CONTENT_WIDTH - 140, textColor: [...INK_MUTED] },
    },
  });

  // ── Rodapé, em todas as páginas ────────────────────────────────────────────
  const totalPaginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
    doc.setPage(pagina);

    if (pagina > 1) {
      doc.setTextColor(...INK_MUTED);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(sanear(processo.cnj), MARGIN, 9);
    }

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, pageHeight - 12, pageWidth - MARGIN, pageHeight - 12);

    doc.setTextColor(...INK_MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    // O recorte é declarado no rodapé de TODA página, não numa nota no fim: a
    // pessoa que imprime e arquiva a folha 4 precisa saber que o documento não
    // é a íntegra do histórico.
    doc.text(
      recortado
        ? `Ponto Processual · ${timeline.length} movimentações mais recentes de ${totalMovimentacoes} · não é documento oficial`
        : 'Ponto Processual · não é documento oficial',
      MARGIN,
      pageHeight - 7,
    );
    doc.text(`Página ${pagina} de ${totalPaginas}`, pageWidth - MARGIN, pageHeight - 7, { align: 'right' });
  }

  return doc;
}

/** Estilo comum das quatro tabelas — separado para que elas não divirjam. */
function estiloTabela() {
  return {
    styles: {
      font: 'helvetica' as const,
      fontSize: 7.5,
      textColor: [...INK] as [number, number, number],
      lineColor: [...LINE] as [number, number, number],
      lineWidth: 0.15,
      cellPadding: 2,
      overflow: 'linebreak' as const,
      valign: 'top' as const,
    },
    headStyles: {
      fillColor: [...PRIMARY] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 7,
      halign: 'left' as const,
      minCellHeight: 7,
    },
    alternateRowStyles: { fillColor: [...PAPER] as [number, number, number] },
  };
}

/**
 * Desenha o título da seção e devolve o `startY` da tabela que vem embaixo.
 *
 * Devolve em vez de mover um cursor interno porque o `autoTable` não tem
 * cursor: chamado sem `startY`, ele parte do `finalY` da tabela ANTERIOR — que
 * um `doc.text()` não altera. A primeira versão disto contornava com uma tabela
 * vazia de altura zero só para empurrar o `finalY`; era uma tabela-fantasma no
 * documento e deixava uma folga que ninguém tinha pedido.
 *
 * Quebra de página quando não sobram 30 mm, senão o título fica órfão no pé da
 * folha e a tabela abre sozinha na seguinte.
 */
function secao(
  doc: import('jspdf').jsPDF,
  titulo: string,
  contagem: string | null,
  pisoY = 0,
): number {
  const fim = Math.max(
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 26,
    pisoY,
  );
  const alturaUtil = doc.internal.pageSize.getHeight() - 16;
  let y = fim + 9;

  if (y + 30 > alturaUtil) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(titulo, MARGIN, y);

  if (contagem) {
    const largura = doc.getTextWidth(titulo);
    doc.setTextColor(...INK_MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(contagem, MARGIN + largura + 3, y);
  }

  return y + 3;
}

export async function downloadProcessoPdf(dossie: DossieProcesso) {
  const generatedAt = new Date();
  const doc = await createProcessoPdf(dossie, generatedAt);
  const cnj = dossie.processo.cnj.replace(/[^\d]/g, '') || 'processo';
  doc.save(`processo-${cnj}-${dataArquivo(generatedAt)}.pdf`);
}
