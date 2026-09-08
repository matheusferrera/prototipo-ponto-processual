import Link from 'next/link';
import type { CalendarioDoProcesso } from '@/lib/api.server';
import styles from './CalendarioProcesso.module.css';

/**
 * Os degraus da intensidade — **buckets fixos, não escala linear**.
 *
 * A distribuição é de cauda longa, e medi-la é o que definiu estes limites: dos
 * 2.441 dias com movimentação no acervo, **61% têm exatamente 1** e 92% têm até
 * 3, enquanto o topo chega a **732 num dia só** (ação coletiva de 1989, com
 * centenas de intimações no mesmo despacho). Numa escala linear, 2 movimentações
 * pintariam 0,3% do verde — o calendário inteiro sairia branco com meia dúzia de
 * quadrados escuros, e a variação que interessa (1 contra 3) seria invisível.
 *
 * Os cortes são redondos de propósito. Quantis puros dariam limites como "2,4" e
 * "8,7", que ninguém lê numa legenda; estes são legíveis e cada faixa tem massa
 * real — 61% / 30% / 7,7% / 0,4% / 0,5%. As duas últimas são raras e são
 * justamente o que se quer achar de olho: o dia em que aconteceu tudo.
 */
const DEGRAUS = [
  { ate: 1, rotulo: '1' },
  { ate: 3, rotulo: '2–3' },
  { ate: 9, rotulo: '4–9' },
  { ate: 29, rotulo: '10–29' },
  { ate: Infinity, rotulo: '30+' },
] as const;

/** O índice do degrau (1..5) de um dia; 0 é dia sem movimentação. */
function degrau(total: number): number {
  if (total <= 0) return 0;
  return DEGRAUS.findIndex((d) => total <= d.ate) + 1;
}

const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** `2026-09-04` — a chave do mapa, e o que a URL do filtro recebe. */
function iso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * As semanas do ano, cada uma com sete casas (domingo a sábado).
 *
 * Tudo em UTC: as datas do backend já vêm como `YYYY-MM-DD` em wall-clock de
 * Brasília, então construir com `new Date(ano, mes, dia)` — que usa o fuso do
 * servidor — deslocaria a grade inteira em um dia sempre que o processo rodasse
 * fora de -03.
 */
function semanasDoAno(ano: number): (Date | null)[][] {
  const primeiro = new Date(Date.UTC(ano, 0, 1));
  const ultimo = new Date(Date.UTC(ano, 11, 31));
  const semanas: (Date | null)[][] = [];
  let atual: (Date | null)[] = Array(primeiro.getUTCDay()).fill(null);

  for (let d = new Date(primeiro); d <= ultimo; d.setUTCDate(d.getUTCDate() + 1)) {
    atual.push(new Date(d));
    if (atual.length === 7) { semanas.push(atual); atual = []; }
  }
  if (atual.length) semanas.push([...atual, ...Array(7 - atual.length).fill(null)]);
  return semanas;
}

export interface CalendarioProcessoProps {
  calendario: CalendarioDoProcesso;
  /** O ano em exibição — vem de `?ano=` e já chega dentro do intervalo. */
  ano: number;
  /** `/processos/<numero>` — a base dos links de ano e de dia. */
  basePath: string;
  /** Os params atuais, para o link do dia preservar filtro e ordenação. */
  paramsAtuais: Record<string, string | undefined>;
}

/**
 * O calendário do processo: um ano por vez, quanto mais escuro mais aconteceu.
 *
 * **Um ano por vez, e não a linha do tempo inteira.** O maior processo da base
 * vai de 1990 a 2026 — 37 anos, ~13.500 casas. Numa tela, isso é uma faixa de
 * poeira ilegível; e a atividade é quase toda recente, então o ano é o recorte
 * que o advogado de fato percorre.
 *
 * **Cada dia é um link que filtra a timeline naquele dia**, preservando os
 * filtros da tela. É o que faz o calendário ser navegação e não enfeite: bater o
 * olho no quadrado escuro de julho e clicar nele é mais rápido que rolar 4.900
 * movimentações.
 *
 * Server Component: a escolha do ano viaja por `?ano=`, como todo filtro deste
 * projeto. O tooltip é o `title` nativo — num grid de 365 casas, um tooltip
 * próprio custaria um client component e um listener por casa para dizer o que o
 * atributo já diz, inclusive sem JavaScript.
 */
export function CalendarioProcesso({ calendario, ano, basePath, paramsAtuais }: CalendarioProcessoProps) {
  const porDia = new Map(calendario.dias.map((d) => [d.dia, d.total]));
  const semanas = semanasDoAno(ano);

  const doAno = calendario.dias.filter((d) => d.dia.startsWith(String(ano)));
  const movsNoAno = doAno.reduce((soma, d) => soma + d.total, 0);

  const anos: number[] = [];
  if (calendario.primeiroAno && calendario.ultimoAno) {
    for (let a = calendario.ultimoAno; a >= calendario.primeiroAno; a--) anos.push(a);
  }

  // O rótulo entra na primeira semana de cada mês, UMA vez.
  //
  // A versão anterior marcava toda semana que contivesse um dia <= 7, e o
  // resultado na tela foi "jan jan", "abr abr", "mai mai": a virada do mês cai no
  // meio da semana com frequência, então duas colunas seguidas têm dias <= 7 do
  // mesmo mês. A regra certa é comparar com a semana ANTERIOR e rotular só
  // quando o mês muda.
  const mesDaSemana = (indice: number): number | null => {
    const dias = semanas[indice]?.filter((d): d is Date => d !== null) ?? [];
    // O mês da semana é o do primeiro dia dela — é onde a coluna começa.
    return dias.length ? dias[0]!.getUTCMonth() : null;
  };
  const rotuloDoMes = (indice: number): string | null => {
    const mes = mesDaSemana(indice);
    if (mes === null) return null;
    if (indice > 0 && mesDaSemana(indice - 1) === mes) return null;
    return MESES[mes]!;
  };

  return (
    <section className={styles.calendario} aria-labelledby="calendario-title">
      <header className={styles.cabecalho}>
        <h3 id="calendario-title" className={styles.titulo}>
          {movsNoAno === 0
            ? `Nenhuma movimentação em ${ano}`
            : `${movsNoAno} ${movsNoAno === 1 ? 'movimentação' : 'movimentações'} em ${ano}, em ${doAno.length} ${doAno.length === 1 ? 'dia' : 'dias'}`}
        </h3>

        {anos.length > 1 && (
          <nav className={styles.anos} aria-label="Ano do calendário">
            {anos.map((a) => (
              <Link
                key={a}
                href={`${basePath}?${new URLSearchParams({ ...limpar(paramsAtuais), aba: 'calendario', ano: String(a) })}`}
                className={a === ano ? `${styles.ano} ${styles.anoAtivo}` : styles.ano}
                aria-current={a === ano ? 'page' : undefined}
                scroll={false}
              >
                {a}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <div className={styles.grade}>
        {/* A régua dos dias da semana. Só três rótulos (seg/qua/sex): com os sete
            a coluna fica mais alta que as casas e a grade desalinha. */}
        <div className={styles.diasSemana} aria-hidden="true">
          {DIAS_DA_SEMANA.map((d, i) => (
            <span key={d} className={styles.diaSemana}>{i % 2 === 1 ? d : ''}</span>
          ))}
        </div>

        <div className={styles.semanas}>
          <div className={styles.meses} aria-hidden="true">
            {semanas.map((_, i) => (
              <span key={i} className={styles.mes}>{rotuloDoMes(i) ?? ''}</span>
            ))}
          </div>

          <div className={styles.casas}>
            {semanas.map((semana, i) => (
              <div key={i} className={styles.semana}>
                {semana.map((dia, j) => {
                  if (!dia) return <span key={j} className={styles.vazia} aria-hidden="true" />;
                  const chave = iso(dia);
                  const total = porDia.get(chave) ?? 0;
                  const nivel = degrau(total);
                  const legenda = total === 0
                    ? `${chave}: sem movimentação`
                    : `${chave}: ${total} ${total === 1 ? 'movimentação' : 'movimentações'}`;

                  // Dia sem movimentação não é link: levaria a uma lista vazia.
                  if (total === 0) {
                    return <span key={j} className={styles.casa} data-nivel={0} title={legenda} />;
                  }
                  return (
                    <Link
                      key={j}
                      href={`${basePath}?${new URLSearchParams({
                        ...limpar(paramsAtuais), aba: 'movimentacoes', from: chave, to: chave,
                      })}`}
                      className={styles.casa}
                      data-nivel={nivel}
                      title={legenda}
                      aria-label={legenda}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* A legenda da escala é obrigatória num sequencial: sem ela o verde é
          intensidade sem unidade, e o leitor não tem como saber se o tom escuro
          é 5 ou 500 movimentações. */}
      <div className={styles.escala}>
        {/* A rampa e seus dois extremos num bloco que NÃO quebra. Medido em 150px:
            com tudo no mesmo flex, a escala partia ao meio — "menos ▪▪▪" numa
            linha e "▪▪ mais" na outra —, e uma rampa lida em dois pedaços deixa
            de mostrar a progressão, que é a única coisa que ela faz. */}
        <span className={styles.escalaRampa}>
          <span className={styles.escalaRotulo}>menos</span>
          <span className={styles.casa} data-nivel={0} title="sem movimentação" />
          {DEGRAUS.map((d, i) => (
            <span key={d.rotulo} className={styles.casa} data-nivel={i + 1} title={`${d.rotulo} no dia`} />
          ))}
          <span className={styles.escalaRotulo}>mais</span>
        </span>
        <span className={styles.escalaFaixas}>
          {DEGRAUS.map((d) => d.rotulo).join(' · ')}
        </span>
      </div>
    </section>
  );
}

/** Tira os params vazios, para a URL não carregar `q=&from=&to=`. */
function limpar(params: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, string>;
}
