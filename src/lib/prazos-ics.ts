/**
 * A pauta como arquivo de calendário (RFC 5545) — um evento por prazo.
 *
 * ## É download avulso, e isso tem uma consequência que precisa estar na tela
 *
 * O arquivo é uma FOTOGRAFIA. Importado, os eventos passam a viver na agenda
 * do advogado e **não se corrigem mais**: prazo suspenso por portaria, data
 * que a análise do ato reviu, expediente que ele cumpriu — nada disso volta
 * atrás no Google Calendar. A alternativa que se corrige sozinha é uma URL de
 * assinatura (`webcal://`), e ela não foi escolhida.
 *
 * Por isso cada evento carrega, na descrição, a data em que foi exportado e a
 * procedência da data. Sem isso, um `.ics` de três semanas atrás é
 * indistinguível de um atual — e o que ele diz sobre um prazo tem aparência de
 * fato.
 *
 * ## O que NÃO vira evento
 *
 * Prazo sem `vencimentoISO`. Não é omissão: "expediente pendente de ciência,
 * cuja data o tribunal ainda não calculou" é um estado real e frequente, e
 * inventar um dia para ele no calendário seria criar uma data que ninguém
 * afirmou. O contador de fora volta para quem chamou, para a tela poder dizer.
 */

import type { Prazo } from '@/types';
import {
  clienteEhPresumido,
  clientePrazo,
  expedientePrazo,
  procedenciaPrazo,
  qualificacaoPrazo,
} from '@/lib/prazo';

/** O identificador do produto, como o RFC pede. */
const PRODID = '-//Ponto Processual//Pauta de prazos//PT-BR';

/**
 * Escapa um valor de texto do iCalendar.
 *
 * A ordem importa: a contrabarra primeiro, senão ela escaparia as barras que
 * as substituições seguintes acabaram de introduzir. Vírgula e ponto-e-vírgula
 * são separadores de lista no formato — um nome de parte com vírgula ("SILVA,
 * JOÃO") quebraria a propriedade em duas sem isto.
 */
function esc(valor: string): string {
  return valor
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Dobra a linha em 75 octetos, que é o limite do RFC 5545.
 *
 * Não é preciosismo: o Outlook trunca linha longa em vez de aceitá-la, e o
 * sintoma é um evento importado com a descrição pela metade. A conta é em
 * BYTES, não em caracteres — "ã" e "§" ocupam dois, e medir por `length`
 * deixaria a linha passar do limite exatamente nos nomes em português.
 */
function dobrar(linha: string): string {
  const bytes = new TextEncoder().encode(linha);
  if (bytes.length <= 75) return linha;

  const partes: string[] = [];
  let atual = '';
  let tamanho = 0;
  // O primeiro octeto de uma linha de continuação é o espaço, então ela cabe
  // 74 e não 75.
  for (const char of linha) {
    const custo = new TextEncoder().encode(char).length;
    const teto = partes.length === 0 ? 75 : 74;
    if (tamanho + custo > teto) {
      partes.push(atual);
      atual = '';
      tamanho = 0;
    }
    atual += char;
    tamanho += custo;
  }
  if (atual) partes.push(atual);
  return partes.join('\r\n ');
}

/** `2026-09-24` → `20260924`, que é a forma `VALUE=DATE` do RFC. */
const semTracos = (iso: string) => iso.replace(/-/g, '');

/** O dia seguinte, em `YYYYMMDD` — `DTEND` de evento de dia inteiro é EXCLUSIVO. */
function diaSeguinte(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const d = new Date(ano!, mes! - 1, dia! + 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** Carimbo UTC no formato do RFC: `20260915T143000Z`. */
function carimbo(data: Date): string {
  return `${data.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/** A data é cálculo nosso, não o vencimento que o tribunal publicou. */
function ehEstimado(pz: Prazo): boolean {
  return Boolean(pz.vencimentoISO) && (pz.origemPrazo === 'djen' || pz.origemPrazo === 'tribunalPublico');
}

/**
 * O título do evento — o que aparece na grade do mês, onde cabem ~30 caracteres.
 *
 * A ordem é a da pauta invertida de propósito: na tela o cliente encabeça
 * porque a lista inteira é de prazos e o que varia é de quem; na agenda o
 * evento aparece entre reunião e aniversário, e o que precisa aparecer
 * primeiro é que aquilo é um prazo e o que ele cobra.
 *
 * O `≈` vem colado no título, não na descrição, porque a grade do mês não
 * mostra descrição — e uma data estimada exibida como fato é o erro que este
 * produto mais evita.
 */
function titulo(pz: Prazo): string {
  const peca = pz.ato?.ia.peca?.trim();
  const oQue = peca || expedientePrazo(pz);
  const cliente = clientePrazo(pz);
  const marca = ehEstimado(pz) ? '≈ ' : '';
  return `${marca}${oQue} — ${cliente}`;
}

/**
 * A descrição — tudo que a tela mostra ao abrir a linha, menos o que só faz
 * sentido com o produto aberto.
 */
function descricao(pz: Prazo, exportadoEm: Date): string {
  const linhas: string[] = [];

  if (pz.ato?.ia.oQueFazer?.trim()) linhas.push(pz.ato.ia.oQueFazer.trim(), '');

  const qualificacao = qualificacaoPrazo(pz);
  if (qualificacao.length > 0) linhas.push(qualificacao.join(' · '));

  linhas.push(procedenciaPrazo(pz));
  if (ehEstimado(pz)) {
    linhas.push('Data calculada por nós — não considera feriado local nem suspensão por portaria.');
  }
  if (pz.deQuem === 'parteContraria') linhas.push('Atenção: este prazo é da PARTE CONTRÁRIA.');

  linhas.push('');
  linhas.push(`Processo: ${pz.cnj}`);
  linhas.push(`Tribunal: ${pz.tribunal}${pz.grau ? ` · ${pz.grau} grau` : ''}`);
  if (pz.orgaoJulgador && pz.orgaoJulgador !== '—') linhas.push(`Órgão: ${pz.orgaoJulgador}`);

  // De quem é o processo, e o quanto disso é afirmação. `clienteEhPresumido`
  // existe para esta linha: no calendário não há como ver o chip "a confirmar"
  // que a tela mostra, então o aviso tem de vir escrito.
  if (clienteEhPresumido(pz)) {
    linhas.push('Cliente: a confirmar — o tribunal não publicou os representantes deste processo.');
  } else if (pz.parteContraria?.length) {
    linhas.push(`Parte contrária: ${pz.parteContraria.join(', ')}`);
  }

  linhas.push('');
  linhas.push(
    `Exportado do Ponto Processual em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(exportadoEm)}.`,
  );
  // A frase que impede o arquivo de envelhecer em silêncio — ver o docblock.
  linhas.push('Este arquivo é uma cópia da pauta naquele momento e não se atualiza sozinho.');

  return linhas.join('\n');
}

/**
 * Os lembretes. Dois, e o segundo é o que serve de verdade.
 *
 * `-P3D` num evento de dia inteiro dispara na véspera da véspera, que é quando
 * ainda dá para produzir a peça; `-P1D` é o "é amanhã". Um alarme no próprio
 * dia seria um aviso sobre algo que já deveria estar protocolado.
 */
function alarmes(pz: Prazo): string[] {
  const rotulo = esc(`Prazo: ${clientePrazo(pz)} · ${pz.cnj}`);
  return [
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${rotulo}`, 'TRIGGER:-P3D', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${rotulo}`, 'TRIGGER:-P1D', 'END:VALARM',
  ];
}

export type ResultadoIcs = {
  conteudo: string;
  /** Quantos viraram evento. */
  eventos: number;
  /** Quantos ficaram de fora por não ter data — a tela precisa poder dizer. */
  semData: number;
};

export function criarPrazosIcs(prazos: Prazo[], exportadoEm = new Date()): ResultadoIcs {
  const comData = prazos.filter(pz => Boolean(pz.vencimentoISO));
  const stamp = carimbo(exportadoEm);

  const linhas: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Prazos — Ponto Processual',
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ];

  for (const pz of comData) {
    const iso = pz.vencimentoISO!;
    linhas.push(
      'BEGIN:VEVENT',
      // O UID é estável por prazo: reimportar o mesmo arquivo ATUALIZA o
      // evento em vez de criar um segundo. Sem isso, exportar duas vezes
      // encheria a agenda de duplicatas — e o advogado não teria como saber
      // qual das duas está certa.
      `UID:prazo-${pz.id}@pontoprocessual.com.br`,
      `DTSTAMP:${stamp}`,
      // Dia inteiro, não horário: o prazo fatal é um DIA. Marcá-lo às 9h
      // inventaria uma hora que não existe e, pior, moveria a data para quem
      // estivesse em outro fuso.
      `DTSTART;VALUE=DATE:${semTracos(iso)}`,
      `DTEND;VALUE=DATE:${diaSeguinte(iso)}`,
      `SUMMARY:${esc(titulo(pz))}`,
      `DESCRIPTION:${esc(descricao(pz, exportadoEm))}`,
      // `TRANSP:TRANSPARENT` — o prazo não ocupa a agenda como um compromisso
      // ocuparia: quem o vê continua livre para marcar audiência naquele dia.
      'TRANSP:TRANSPARENT',
      `CATEGORIES:${esc(pz.tribunal)}`,
      // Prazo encerrado entra como CANCELADO em vez de ficar de fora: quem já
      // tinha importado precisa que o evento SUMA da agenda, e some-se por
      // reimportar — não por ausência, que não apaga nada.
      `STATUS:${pz.fechado ? 'CANCELLED' : 'CONFIRMED'}`,
      ...(pz.fechado ? [] : alarmes(pz)),
      'END:VEVENT',
    );
  }

  linhas.push('END:VCALENDAR');

  return {
    // CRLF é exigência do RFC, não preferência — o Outlook recusa o arquivo
    // com LF sozinho.
    conteudo: linhas.map(dobrar).join('\r\n') + '\r\n',
    eventos: comData.length,
    semData: prazos.length - comData.length,
  };
}

function dataDoArquivo(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

export function baixarPrazosIcs(prazos: Prazo[]): ResultadoIcs {
  const exportadoEm = new Date();
  const resultado = criarPrazosIcs(prazos, exportadoEm);

  const blob = new Blob([resultado.conteudo], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prazos-${dataDoArquivo(exportadoEm)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Sem o revoke o blob fica na memória da aba até ela fechar — e a pauta
  // inteira de um acervo grande não é pequena.
  URL.revokeObjectURL(url);

  return resultado;
}
