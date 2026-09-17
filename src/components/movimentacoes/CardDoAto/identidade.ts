import type { MovimentacaoDetail } from '@/lib/api.server';
import { nomeLegivel } from '@/lib/processo-apresentacao';
import { wallClock } from '@/lib/wall-clock';

/**
 * A BARRA DO ATO — "Acórdão" em cima, "TJDFT · 2ª Vara Cível · movimentado
 * hoje às 14:32" embaixo — montada **uma vez, para os três caminhos**.
 *
 * O ato aparece em três lugares que renderizam o mesmo corpo: a rota
 * interceptada (`app/@card/(.)movimentacoes/[id]`), a página autônoma
 * (`app/movimentacoes/[id]`, o link compartilhado e o F5) e o painel ao lado
 * da lista no desktop largo. Se cada um montasse o seu cabeçalho, o mesmo ato
 * apareceria com duas identificações conforme o caminho — o defeito que a
 * unificação do card foi feita para apagar.
 *
 * As partes saíram daqui para o bloco "Processo": a pergunta da barra é "que
 * ato é este", e o nome do cliente já está na linha que a pessoa tocou.
 */
export function cabecalhoDoAto(mov: MovimentacaoDetail): { tipo: string; onde: string } {
  const proc = mov.processData;
  const quando = diaRelativo(mov.ocorridoEm);
  const verbo = mov.origem === 'djen' ? 'disponibilizado' : 'movimentado';

  /* A hora sempre — 00:00 quando a fonte não a informa (o diário publica em
     data), decisão do dono do produto em 17/09/2026. */
  const w = wallClock(new Date(mov.ocorridoEm));
  const hora = Number.isNaN(new Date(mov.ocorridoEm).getTime())
    ? ''
    : ` às ${String(w.hora).padStart(2, '0')}:${String(w.minuto).padStart(2, '0')}`;

  const onde = [
    proc?.tribunal.replace(/G[12]$/, ''),
    proc?.orgaoJulgador?.trim(),
    quando && `${verbo} ${quando}${hora}`,
  ].filter(Boolean).join(' · ');

  /* O tipo sai da descrição, e ela vem em caixa alta de vários tribunais
     ("EMENTA", "PETIÇÃO PROTOCOLADA") — como título, vira caixa de frase. */
  return { tipo: nomeLegivel(mov.tipo || 'Movimentação'), onde: onde || '—' };
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** `hoje` · `ontem` · `em 15 set` — em wall-clock de Brasília dos dois lados. */
function diaRelativo(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const w = wallClock(d);
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const hoje = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate());
  const dias = Math.round((hoje - Date.UTC(w.ano, w.mes, w.dia)) / 86_400_000);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `em ${w.dia} ${MESES[w.mes]}${w.ano !== agora.getUTCFullYear() ? ` de ${w.ano}` : ''}`;
}

/**
 * O prazo ABERTO deste ato, pronto para a barra de ação.
 *
 * `null` em ato de mera ciência — 46% deles —, e aí a barra não existe. Um
 * "Protocolei" num ato que não abriu prazo baixaria o prazo de OUTRO ato do
 * mesmo processo, que é o pior defeito possível numa barra de ação.
 */
export function prazoAbertoDoAto(mov: MovimentacaoDetail): {
  id: string;
  vencimentoISO: string | null;
  /** O lembrete já marcado — sem ele o card oferecia "Lembrar" num prazo que a pauta mostra lembrado. */
  lembrarEm: string | null;
} | null {
  const p = mov.prazo;
  if (!p || p.fechado) return null;
  return {
    id: p.id,
    vencimentoISO: p.dataLimite ? isoDoDia(p.dataLimite) : null,
    lembrarEm: p.lembrarEm ?? null,
  };
}

/** ISO datetime → `AAAA-MM-DD` em wall-clock de Brasília. */
function isoDoDia(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const w = wallClock(d);
  return `${w.ano}-${String(w.mes + 1).padStart(2, '0')}-${String(w.dia).padStart(2, '0')}`;
}
