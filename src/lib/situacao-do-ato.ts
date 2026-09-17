import type { CategoriaMovimentacao, LeituraIa, PrazoDoAto, PrazoEmCurso } from '../types';

/**
 * A SITUAÇÃO DE UM ATO PARA QUEM ADVOGA — "é comigo?", "até quando?".
 *
 * É a pergunta que a tela de movimentações responde antes de qualquer outra
 * desde 17/09/2026. Até então a linha dizia o que aconteceu e deixava a pessoa
 * deduzir se era com ela — e a própria tela se contradizia: o resumo da IA
 * dizia "o prazo é das requeridas, não do seu cliente" e a faixa logo abaixo
 * dizia "Chegou dentro de um prazo seu".
 *
 * **Sem import em tempo de execução**, pela mesma razão de `fio-do-prazo.ts`:
 * os testes rodam em `node --test` sem bundler, e o alias `@/` não resolve lá.
 */

export interface AtoParaSituacao {
  categoria?: CategoriaMovimentacao | null;
  ia?: Pick<LeituraIa, 'deQuem'> | null;
  prazo?: Pick<PrazoDoAto, 'dataLimite' | 'fechado' | 'natureza' | 'metodoPrazo' | 'deQuem'> | null;
  prazoEmCurso?: Pick<PrazoEmCurso, 'restam' | 'abriuEsteAto'> | null;
}

/**
 * `voce` verde cheio · `tinto` vence em até 3 dias ou venceu · `ambar` até 7 ·
 * `prazo` verde claro (contexto de prazo, sem cobrança própria) · `neutro`.
 *
 * **Um tom por distância, e a régua é a mesma em toda a tela** — o cartão de
 * "Pede sua ação", o bloco de dias de "Com prazo", a etiqueta da linha e o
 * topo do ato. Uma régua por componente faria o mesmo prazo de 5 dias ser
 * âmbar num lugar e verde no outro.
 */
export type TomDaSituacao = 'voce' | 'tinto' | 'ambar' | 'prazo' | 'neutro';

export function tomDosDias(dias: number): Exclude<TomDaSituacao, 'prazo' | 'neutro'> {
  if (dias <= 3) return 'tinto';
  if (dias <= 7) return 'ambar';
  return 'voce';
}

/**
 * Dias de calendário até `iso`, em wall-clock de Brasília — o mesmo cálculo de
 * `vencimentoDoAto`. **Negativo quando já passou**, nunca grampeado: o
 * `Math.max(0, …)` que existia em `diasAteVencimento` fazia prazo vencido
 * aparecer como "vence hoje".
 */
export function diasAte(iso: string | null | undefined, agora = Date.now()): number | null {
  if (!iso) return null;
  const limite = new Date(iso);
  if (Number.isNaN(limite.getTime())) return null;
  const dia = Date.UTC(limite.getUTCFullYear(), limite.getUTCMonth(), limite.getUTCDate());
  const brasilia = new Date(agora - 3 * 60 * 60 * 1000);
  const hoje = Date.UTC(brasilia.getUTCFullYear(), brasilia.getUTCMonth(), brasilia.getUTCDate());
  return Math.round((dia - hoje) / 86_400_000);
}

/**
 * De quem é a providência.
 *
 * **A leitura da IA vence quando afirma alguma coisa.** Ela leu o ato; o
 * `deQuem` do prazo do DJEN é `destinatario` POR PADRÃO — o pipeline o
 * preenche assim em toda comunicação. Medido em 17/09/2026: o despacho do TJBA
 * que manda citar a COELBA tinha `prazo.deQuem: destinatario` e
 * `ia.deQuem: parteContraria`, e a tela antiga dizia "Chegou dentro de um
 * prazo seu" logo abaixo do resumo que dizia "o prazo é das requeridas".
 *
 * **A exceção é o prazo legal de recurso** (`prazoLegal`): recurso é de toda
 * parte, e a leitura de que "a providência é da outra parte" ali é de mérito,
 * não de prazo — a mesma regra que impede o backend de desfazer esse prazo.
 *
 * Sem afirmação da IA, vale o prazo; sem nenhum dos dois, `aConfirmar` — que
 * não vira "de outra parte": dispensar o que é seu é o erro caro, e a dúvida
 * erra para cedo.
 */
export function deQuemDoAto(m: AtoParaSituacao): 'minha' | 'outra' | 'aConfirmar' {
  const daLeitura = m.ia?.deQuem;
  const leituraAfirma = daLeitura === 'destinatario' || daLeitura === 'parteContraria' || daLeitura === 'terceiro';
  const doPrazo = m.prazo?.deQuem && m.prazo.deQuem !== 'indefinido' ? m.prazo.deQuem : null;
  const quem = leituraAfirma && m.prazo?.metodoPrazo !== 'prazoLegal' ? daLeitura : doPrazo ?? daLeitura;
  if (quem === 'destinatario') return 'minha';
  if (quem === 'parteContraria' || quem === 'terceiro') return 'outra';
  return 'aConfirmar';
}

/**
 * Mera ciência — o "prazo" é o dia em que a intimação se operou, não uma
 * janela para agir. `cienciaPublicacao` é o método que o backend usa para isso.
 */
export function ehSoCiencia(m: AtoParaSituacao): boolean {
  return m.prazo?.natureza === 'ciencia' || m.prazo?.metodoPrazo === 'cienciaPublicacao';
}

/**
 * O ato ABRIU um prazo que é (ou pode ser) seu, que está aberto e ainda não
 * venceu. É o critério de "Pede sua ação".
 *
 * **Vencido fica de fora de propósito.** A aba Novas compara `detectedAt`, e o
 * backfill de três anos traz prazo aberto de 2024: "pede sua ação · venceu há
 * 700 dias" no topo da tela seria ruído no lugar mais caro. O vencido aparece
 * na linha do processo, com a etiqueta tinta.
 */
export function pedeAcao(m: AtoParaSituacao, agora = Date.now()): boolean {
  const p = m.prazo;
  if (!p || p.fechado || !p.dataLimite || ehSoCiencia(m)) return false;
  if (deQuemDoAto(m) === 'outra') return false;
  const dias = diasAte(p.dataLimite, agora);
  return dias !== null && dias >= 0;
}

/** "faltam 22 dias" · "vence hoje" · "vence amanhã" · "venceu há 3 dias". */
export function distancia(dias: number): string {
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias > 1) return `faltam ${dias} dias`;
  if (dias === -1) return 'venceu ontem';
  return `venceu há ${Math.abs(dias)} dias`;
}

/**
 * A ETIQUETA DA LINHA — `null` quando não há nada a dizer, que é o caso comum.
 *
 * | situação | etiqueta | tom |
 * |---|---|---|
 * | abriu prazo seu, aberto | Com você · 22 dias | pela distância |
 * | idem, de quem não se sabe | Confirme se é seu · 22 dias | pela distância |
 * | abriu prazo seu, vencido | Venceu há 3 dias | tinto |
 * | abriu prazo da outra parte | Prazo da outra parte | neutro |
 * | mera ciência | Só ciência | neutro |
 * | chegou com prazo seu correndo | No seu prazo · 4 dias | pela distância, verde claro acima de 7 |
 * | prazo já baixado | Prazo encerrado | neutro |
 *
 * `longo` acrescenta o que fazer ("nada a fazer agora") — a aba Novas tem
 * espaço para a frase inteira, a lista de todas não tem.
 */
export function situacaoDaLinha(
  m: AtoParaSituacao,
  {
    agora = Date.now(),
    longo = false,
    semPrazoQueCorre = false,
  }: {
    agora?: number;
    longo?: boolean;
    /**
     * Não dizer "No seu prazo" — o cartão do processo já diz, uma vez, no
     * cabeçalho. Repetir a etiqueta em cada linha do mesmo caso era o ruído
     * que a aba Novas existe para tirar.
     */
    semPrazoQueCorre?: boolean;
  } = {},
): EtiquetaDaSituacao | null {
  const p = m.prazo;
  const quem = deQuemDoAto(m);
  const dias = (n: number) => (n === 0 ? 'vence hoje' : n === 1 ? 'vence amanhã' : `${n} dias`);

  if (p && !ehSoCiencia(m)) {
    if (p.fechado) return { rotulo: 'Prazo encerrado', curto: 'Encerrado', tom: 'neutro' };
    if (quem === 'outra') {
      return {
        rotulo: longo ? 'Prazo da outra parte · nada a fazer agora' : 'Prazo da outra parte',
        curto: 'Outra parte',
        tom: 'neutro',
      };
    }
    const faltam = diasAte(p.dataLimite, agora);
    if (faltam !== null) {
      if (faltam < 0) {
        const venceu = distancia(faltam).replace(/^v/, 'V');
        return { rotulo: venceu, curto: venceu, tom: 'tinto' };
      }
      return {
        rotulo: `${quem === 'minha' ? 'Com você' : 'Confirme se é seu'} · ${dias(faltam)}`,
        curto: `${quem === 'minha' ? 'Seu' : 'Confirmar'} · ${dias(faltam)}`,
        tom: tomDosDias(faltam),
      };
    }
  }

  if (ehSoCiencia(m)) return { rotulo: 'Só ciência', curto: 'Só ciência', tom: 'neutro' };

  if (quem === 'outra') {
    return {
      rotulo: longo ? 'Providência de outra parte · nada a fazer agora' : 'Providência de outra parte',
      curto: 'Outra parte',
      tom: 'neutro',
    };
  }

  const emCurso = semPrazoQueCorre ? null : m.prazoEmCurso;
  if (emCurso && !emCurso.abriuEsteAto && emCurso.restam !== null && emCurso.restam >= 0) {
    const tom = tomDosDias(emCurso.restam);
    return {
      rotulo: `No seu prazo · ${dias(emCurso.restam)}`,
      curto: `No prazo · ${dias(emCurso.restam)}`,
      tom: tom === 'voce' ? 'prazo' : tom,
    };
  }

  return null;
}

/**
 * `rotulo` é a frase inteira; `curto` é a que cabe na coluna da tabela do
 * desktop — pedido do dono do produto em 17/09/2026: a etiqueta por extenso
 * roubava a largura do texto do ato, que é o que se lê.
 */
export interface EtiquetaDaSituacao {
  rotulo: string;
  curto: string;
  tom: TomDaSituacao;
}
