import Link from 'next/link';
import type { AnaliseEnvelope, DossieDeIa } from '@/lib/api.server';
import { semCodigo } from '@/lib/pje-text';
import { diasAteVencimento, quandoPrazo } from '@/lib/prazo-apresentacao';
import { dataWallClock } from '@/lib/wall-clock';
import styles from './AnalisesIa.module.css';

/**
 * A aba de IA: tudo o que o modelo já leu deste processo.
 *
 * ## Quem lê é o advogado, e ele pergunta nesta ordem
 *
 * 1. **Onde este processo está?** — a síntese, que é a orientação mais barata
 *    para quem não abre os autos há meses.
 * 2. **O que eu tenho que fazer, e até quando?** — o prazo A VENCER, com a
 *    peça, o que falta obter e o que impede de escrever hoje.
 * 3. **O que aconteceu?** — ato por ato, com link para a movimentação.
 * 4. **Posso confiar nisto?** — quanto do processo foi lido, de quando é a
 *    leitura, e o aviso de conferência.
 *
 * A versão anterior respondia 4 → 1 → 2 → 3: abria com `Atos lidos 0 de 22 ·
 * 292 movimentações, 270 sem texto`, que é telemetria da ferramenta, não fato
 * do processo. A cobertura continua na tela inteira — é ela que impede o
 * advogado de achar que a IA leu tudo —, só que como PROCEDÊNCIA, no fim, que
 * é onde uma nota de rodapé mora.
 *
 * ## Prazo vencido não pode abrir a lista
 *
 * `prazos` traz todos os `Deadline` do processo, e "em aberto" no banco
 * significa "nunca foi encerrado", não "está correndo": medido na carteira de
 * teste, 97 dos 103 em aberto já venceram, alguns há mais de mil dias. Com
 * `ORDER BY dataLimite ASC` a lista abria em 18/09/2023, e o advogado rolava
 * três anos de prazo morto antes de achar o que vence semana que vem. Aqui o
 * que corre fica em cima; vencido e encerrado vão para um `<details>` fechado,
 * com a contagem no rótulo — o mesmo corte que a pauta de `/prazos` já faz.
 *
 * ## Dados estruturados, não prosa
 *
 * `fase`, `risco`, `complexidade`, `confianca`, `deQuem` e `precisaDosAutos`
 * são enums; `dataLimite` e `ocorridoEm` são datas; `pendencias`,
 * `pontosDeAtencao`, `checklist`, `documentosNecessarios`, `proximasAcoes` e
 * `legislacaoAplicavel` são listas. Servir
 * isso como frase ("confiança média · complexidade baixa") obriga o advogado a
 * ler para descobrir o que dava para ver. A prosa legítima é pouca e fica em
 * destaque: a síntese do caso, o `oQueFazer` do prazo e o `resumoIa` do ato.
 *
 * ## A casca é da PÁGINA, o conteúdo é daqui
 *
 * O painel (gutter, padding, título de seção e a régua) vem de `.panel` +
 * `.sectionHeader` da página do processo, como nas abas de Prazos e
 * Documentos. Aqui ficam só a medida de leitura e o ritmo entre os blocos.
 */

/** Chips de estado. Cor só onde ela significa risco — o resto é neutro. */
const RISCO: Record<string, { texto: string; tom: string }> = {
  preclusao: { texto: 'perde o prazo', tom: 'alerta' },
  perdaDeDireito: { texto: 'perde o direito', tom: 'alerta' },
  revelia: { texto: 'revelia', tom: 'alerta' },
  multa: { texto: 'multa', tom: 'atencao' },
  nenhum: { texto: 'sem risco direto', tom: 'quieto' },
};

const FASE: Record<string, string> = {
  conhecimento: 'em conhecimento',
  instrucao: 'em instrução',
  sentenciado: 'sentenciado',
  recursal: 'em fase recursal',
  execucao: 'em execução',
  arquivado: 'arquivado',
  indefinido: 'fase indefinida',
};

const COMPLEXIDADE: Record<string, string> = {
  baixa: 'trabalho baixo',
  media: 'trabalho médio',
  alta: 'trabalho alto',
};

/** `deQuem` é o campo que impede prazo alheio de virar alarme — merece cor. */
const DE_QUEM: Record<string, { texto: string; tom: string }> = {
  destinatario: { texto: 'prazo do cliente', tom: 'cliente' },
  parteContraria: { texto: 'prazo da outra parte', tom: 'quieto' },
  terceiro: { texto: 'prazo de terceiro', tom: 'quieto' },
  indefinido: { texto: 'dono do prazo a confirmar', tom: 'atencao' },
};

/**
 * Só o que NÃO é "alta" vira chip.
 *
 * Com a confiança sempre à mostra, praticamente toda linha dizia "confiança
 * alta" — e um selo presente em todas as linhas deixa de ser lido, inclusive
 * nas poucas em que ele avisa alguma coisa. O que o advogado precisa saber é
 * onde conferir primeiro, não onde o modelo se achou seguro.
 */
const CONFIRA: Record<string, string> = {
  media: 'confiança média — confira',
  baixa: 'confiança baixa — confira',
};

function texto(r: Record<string, unknown> | undefined, campo: string): string | null {
  const v = r?.[campo];
  return typeof v === 'string' && v.trim() ? v : null;
}

function lista(r: Record<string, unknown> | undefined, campo: string): string[] {
  const v = r?.[campo];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())) : [];
}

/**
 * `DD/MM/AAAA` da string ISO. `dataWallClock` lê em UTC — a convenção do
 * projeto, porque `ocorridoEm` é gravado como wall-clock de Brasília. Formatar
 * no fuso do navegador jogaria o ato das 21h para o dia seguinte.
 */
function dia(iso: string | null | undefined): string {
  return iso ? dataWallClock(new Date(iso)) : '—';
}

type PrazoDoDossie = DossieDeIa['prazos'][number];

/**
 * O título de uma linha de prazo — a PEÇA, que é o que o advogado vai escrever.
 *
 * `tipoDocumento` carrega o id do documento POR DESIGN — é a chave com que o
 * diário e o painel convergem no mesmo `Deadline` —, e cru ele chega à tela
 * como `Decisão (DJEN-574506405)`. `semCodigo` é a mesma limpeza que a aba de
 * Prazos já faz em `expedientePrazo`; sem ela, 76 dos 107 prazos do acervo
 * mostravam o id no lugar do nome do ato.
 *
 * `peca` vem do modelo e chega em caixa variável — "apelação" numa linha,
 * "Embargos de declaração" na seguinte. A primeira letra sobe aqui para a
 * lista não alternar entre as duas grafias linha a linha.
 */
function tituloDoPrazo(p: PrazoDoDossie): string {
  const bruto = p.peca?.trim() || semCodigo(p.tipoDocumento) || p.tipoDocumento;
  return bruto.charAt(0).toUpperCase() + bruto.slice(1);
}

/**
 * A faixa de urgência, com o mesmo vocabulário de `ProcessoPanorama` — o cartão
 * "Precisa de atenção" no alto desta mesma página. Duas escalas de cor para a
 * mesma pergunta ("quanto falta?") na mesma tela seria o advogado tendo que
 * aprender a ler prazo duas vezes.
 */
function faixaDoPrazo(p: PrazoDoDossie): { faixa: string; dias: number | null; quando: string } {
  const dias = p.dataLimite ? diasAteVencimento(p.dataLimite) : null;
  if (p.fechado) return { faixa: 'encerrados', dias, quando: 'Encerrado' };
  if (dias === null) return { faixa: 'semData', dias, quando: 'Sem data definida' };
  const faixa = dias < 0 ? 'vencidos' : dias <= 3 ? 'critico' : dias <= 14 ? 'proximos' : 'posteriores';
  return { faixa, dias, quando: quandoPrazo(dias) };
}

/**
 * Corre hoje: nem encerrado, nem vencido. Prazo SEM DATA fica junto de
 * propósito — ele não foi resolvido, e recolher o que não se sabe é o jeito
 * mais fácil de perder um prazo real.
 */
function estaCorrendo(p: PrazoDoDossie): boolean {
  if (p.fechado) return false;
  const { dias } = faixaDoPrazo(p);
  return dias === null || dias >= 0;
}

function Chip({ children, tom = 'neutro' }: { children: React.ReactNode; tom?: string }) {
  return <span className={styles.chip} data-tom={tom}>{children}</span>;
}

/** Uma linha de dado. `lista` empilha os itens com marcador próprio. */
function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <>
      <dt className={styles.rotulo}>{rotulo}</dt>
      <dd className={styles.valor}>{children}</dd>
    </>
  );
}

function Itens({ de }: { de: string[] }) {
  return (
    <ul className={styles.itens}>
      {de.map((i) => <li key={i}>{i}</li>)}
    </ul>
  );
}

export function AnalisesIa({ dossie }: { dossie: DossieDeIa | null }) {
  if (!dossie) {
    return <p className={styles.vazio}>Não foi possível carregar as análises agora. Recarregue a página.</p>;
  }

  const { caso, prazos, atos, cobertura } = dossie;
  const nada = !caso && atos.length === 0 && !prazos.some((p) => p.analise);

  const correndo = prazos.filter(estaCorrendo);
  const arquivados = prazos.filter((p) => !estaCorrendo(p));

  return (
    <div className={styles.wrap}>
      {nada && (
        <p className={styles.vazio}>
          A IA ainda não leu nada deste processo. <strong>Analisar processo</strong>, no topo da
          página, dispara a leitura dos atos, dos prazos e a síntese do caso — o resultado aparece
          aqui em alguns minutos.
        </p>
      )}

      {caso && <BlocoCaso caso={caso} />}
      {prazos.length > 0 && <BlocoPrazos correndo={correndo} arquivados={arquivados} />}
      {atos.length > 0 && <BlocoAtos atos={atos} />}

      <Procedencia cobertura={cobertura} caso={caso} temTexto={!nada} />
    </div>
  );
}

function BlocoCaso({ caso }: { caso: AnaliseEnvelope }) {
  const r = caso.resultado;
  const ultima = r.ultimaDecisao as { resumo?: string; data?: string } | null | undefined;
  const confira = CONFIRA[String(r.confianca ?? '')];

  return (
    <section className={styles.bloco} aria-labelledby="ia-caso">
      <div className={styles.blocoCabeca}>
        <h3 id="ia-caso" className={styles.blocoTitulo}>Onde o caso está</h3>
        <div className={styles.chips}>
          <Chip>{FASE[String(r.fase ?? '')] ?? 'fase indefinida'}</Chip>
          {confira && <Chip tom="atencao">{confira}</Chip>}
        </div>
      </div>

      {texto(r, 'sintese') && <p className={styles.destaque}>{texto(r, 'sintese')}</p>}

      <dl className={styles.dados}>
        {texto(r, 'situacao') && <Campo rotulo="Situação">{texto(r, 'situacao')}</Campo>}
        {texto(r, 'pedidoPrincipal') && <Campo rotulo="Pedido">{texto(r, 'pedidoPrincipal')}</Campo>}
        {ultima?.resumo && (
          <Campo rotulo="Última decisão">
            <span className={styles.data}>{dia(ultima.data)}</span> {ultima.resumo}
          </Campo>
        )}
        {lista(r, 'pendencias').length > 0 && (
          <Campo rotulo="Aguardando"><Itens de={lista(r, 'pendencias')} /></Campo>
        )}
        {lista(r, 'pontosDeAtencao').length > 0 && (
          <Campo rotulo="Atenção"><Itens de={lista(r, 'pontosDeAtencao')} /></Campo>
        )}
        {/* Peça + data + o que falta, por prazo em aberto com peça identificada
            — cruzado na síntese a partir da leitura fundida de cada ato, sem
            chamada extra (`ia/tipos/processo.ts`, 10/09/2026). Repete parte do
            que `BlocoPrazos` já mostra prazo a prazo; fica aqui também porque
            "onde o caso está" é a primeira coisa que se lê, e quem só bate o
            olho na síntese não quer perder de vista o que precisa fazer. */}
        {lista(r, 'proximasAcoes').length > 0 && (
          <Campo rotulo="Próximas ações"><Itens de={lista(r, 'proximasAcoes')} /></Campo>
        )}
        {texto(r, 'proximoPassoProvavel') && (
          <Campo rotulo="Próximo passo">{texto(r, 'proximoPassoProvavel')}</Campo>
        )}
        {/* Artigo de lei, nunca jurisprudência — a mesma régua de `fundamento`
            na movimentação: sem busca numa base real de acórdãos, citar
            decisão específica não tem como ser conferido. */}
        {lista(r, 'legislacaoAplicavel').length > 0 && (
          <Campo rotulo="Legislação aplicável"><Itens de={lista(r, 'legislacaoAplicavel')} /></Campo>
        )}
      </dl>
    </section>
  );
}

function BlocoPrazos({ correndo, arquivados }: { correndo: PrazoDoDossie[]; arquivados: PrazoDoDossie[] }) {
  const lidos = correndo.filter((p) => p.analise).length;

  return (
    <section className={styles.bloco} aria-labelledby="ia-prazos">
      <div className={styles.blocoCabeca}>
        <h3 id="ia-prazos" className={styles.blocoTitulo}>O que produzir</h3>
        {/* Sem a contagem, uma lista de linhas sem texto parece a aba quebrada.
            Ela diz que a lista está certa e o que falta é a leitura. */}
        {correndo.length > 0 && (
          <span className={styles.contagem}>{lidos} de {correndo.length} lidos</span>
        )}
      </div>

      {/* Não ter prazo correndo é uma resposta, e das boas — merece ser dita, e
          não deduzida de uma lista vazia. */}
      {correndo.length === 0 ? (
        <p className={styles.vazio}>Nenhum prazo em aberto neste processo.</p>
      ) : (
        <ul className={styles.linhas}>
          {correndo.map((p) => <LinhaPrazo key={p.id} p={p} />)}
        </ul>
      )}

      {arquivados.length > 0 && (
        <details className={styles.recolhido}>
          <summary>
            {arquivados.length} {arquivados.length === 1 ? 'prazo vencido ou encerrado' : 'prazos vencidos ou encerrados'}
          </summary>
          <ul className={styles.linhas}>
            {arquivados.map((p) => <LinhaPrazo key={p.id} p={p} />)}
          </ul>
        </details>
      )}
    </section>
  );
}

function LinhaPrazo({ p }: { p: PrazoDoDossie }) {
  const r = p.analise?.resultado;
  const { faixa, quando } = faixaDoPrazo(p);
  const risco = RISCO[String(r?.risco ?? '')] ?? null;
  // Fora do JSX porque `resultado` é `Record<string, unknown>`: um
  // `{r?.campo && ...}` inline devolve `unknown` no ramo falsy, que não é
  // `ReactNode`.
  const complexidade = COMPLEXIDADE[String(r?.complexidade ?? '')] ?? null;
  const precisaDosAutos = r?.precisaDosAutos === true;

  return (
    <li className={styles.linha}>
      {/* "Vence em 8 dias · 14/09/2026" antes do nome da peça: a data sozinha
          obriga o advogado a fazer a conta, e é a conta que decide se ele lê o
          resto agora. Mesma faixa de cor do cartão "Precisa de atenção". */}
      <p className={styles.vencimento} data-faixa={faixa}>
        <strong>{quando}</strong>
        {p.dataLimite && <time dateTime={p.dataLimite}>{dia(p.dataLimite)}</time>}
      </p>

      <div className={styles.linhaCabeca}>
        <span className={styles.linhaTitulo}>{tituloDoPrazo(p)}</span>
        <div className={styles.chips}>
          {/* `prazo` pode ser 0 — "Prazo: 0 sem prazo" é estado válido no PJe —,
              e `{p.prazo && …}` imprimiria um "0" solto na linha, que é o que o
              JSX faz com um número falsy. */}
          {p.prazo != null && p.prazo > 0 && <Chip>{p.prazo} dias</Chip>}
          {risco && <Chip tom={risco.tom}>{risco.texto}</Chip>}
          {complexidade && <Chip>{complexidade}</Chip>}
          {precisaDosAutos && <Chip tom="atencao">precisa dos autos</Chip>}
          {/* Prazo sem análise não some da lista: a ausência é dado. Mas é
              ESTADO, e cabe num chip ao lado dos outros — a frase que ficava
              aqui repetia o título da própria linha, palavra por palavra. */}
          {!p.analise && <Chip tom="ausente">não analisado</Chip>}
        </div>
      </div>

      {r && (
        <>
          <p className={styles.paragrafo}>{texto(r, 'oQueFazer')}</p>
          <dl className={styles.dados}>
            {lista(r, 'checklist').length > 0 && (
              <Campo rotulo="Passos"><Itens de={lista(r, 'checklist')} /></Campo>
            )}
            {lista(r, 'documentosNecessarios').length > 0 && (
              <Campo rotulo="Falta obter"><Itens de={lista(r, 'documentosNecessarios')} /></Campo>
            )}
            {/* Único ponto em que a leitura fala sobre a DATA — e ela nunca a
                muda: quem calcula é o backend, com o calendário forense.
                Rotulada como divergência para não ser lida como correção. */}
            {texto(r, 'observacao') && (
              <Campo rotulo="Divergência">
                <span className={styles.divergencia}>{texto(r, 'observacao')}</span>
              </Campo>
            )}
          </dl>
        </>
      )}
    </li>
  );
}

function BlocoAtos({ atos }: { atos: DossieDeIa['atos'] }) {
  return (
    <section className={styles.bloco} aria-labelledby="ia-atos">
      <div className={styles.blocoCabeca}>
        <h3 id="ia-atos" className={styles.blocoTitulo}>Ato por ato</h3>
        <span className={styles.contagem}>{atos.length}</span>
      </div>

      <ul className={styles.linhas}>
        {atos.map((a) => {
          const deQuem = a.deQuemIa ? DE_QUEM[a.deQuemIa] : null;
          const confira = a.confiancaIa ? CONFIRA[a.confiancaIa] : null;
          return (
            <li key={a.id} className={styles.linha}>
              <div className={styles.linhaCabeca}>
                <span className={styles.data}>{dia(a.ocorridoEm)}</span>
                {/* O ato tem página própria, e é lá que estão o inteiro teor e o
                    documento. Sem o link, o advogado que quer conferir a
                    conclusão da IA volta à aba de movimentações e caça a linha
                    pela data. */}
                <Link href={`/movimentacoes/${a.id}`} className={styles.linhaLink}>{a.descricao}</Link>
                <div className={styles.chips}>
                  {deQuem && <Chip tom={deQuem.tom}>{deQuem.texto}</Chip>}
                  {confira && <Chip tom="atencao">{confira}</Chip>}
                </div>
              </div>

              {a.resumoIa && <p className={styles.paragrafo}>{a.resumoIa}</p>}

              {/* A providência ("o que fazer") não repete aqui — desde a fusão
                  ato+prazo ela é sempre não-nula, e mostrá-la em toda linha
                  desta lista densa seria prosa demais (ver o cabeçalho deste
                  arquivo). Quem quer o detalhe abre a movimentação: o link
                  acima leva à página do ato, que tem o bloco completo. */}

              {/* O fundamento é a citação de artigo que sustenta a leitura: quem
                  vai conferir quer, quem está lendo a linha do tempo não. Mesmo
                  `<details>` de `ProcessoPanorama`, com o mesmo rótulo. */}
              {a.fundamentoIa && (
                <details className={styles.fundamento}>
                  <summary>Ver fundamento</summary>
                  <p>{a.fundamentoIa}</p>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * O rodapé de confiança.
 *
 * `movimentacoesLegiveis` é o denominador honesto: movimentação sem teor não
 * tem como ser lida, então "2 de 173" faria a tela parecer quebrada quando a
 * IA leu tudo o que era possível ler. Medido no `0011540-21.2007.4.01.3400`:
 * 173 movimentações, 2 com texto, 2 lidas.
 *
 * O aviso é uma frase só e nomeia o que erra caro — prazo e data. Repeti-lo por
 * linha treinaria o olho a pular, que é o oposto do que ele existe para fazer.
 */
function Procedencia(
  { cobertura, caso, temTexto }:
  { cobertura: DossieDeIa['cobertura']; caso: AnaliseEnvelope | null; temTexto: boolean },
) {
  const semTeor = cobertura.movimentacoes - cobertura.movimentacoesLegiveis;

  return (
    <footer className={styles.procedencia}>
      <dl className={styles.cobertura}>
        <div>
          <dt>Atos lidos</dt>
          <dd>
            <strong>{cobertura.movimentacoesLidas}</strong> de {cobertura.movimentacoesLegiveis} com texto
            {semTeor > 0 && (
              <span className={styles.coberturaNota}> · {semTeor} de {cobertura.movimentacoes} sem teor no acervo</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Prazos lidos</dt>
          <dd><strong>{cobertura.prazosLidos}</strong> de {cobertura.prazos}</dd>
        </div>
        <div>
          <dt>Síntese do caso</dt>
          <dd>{caso ? dia(caso.atualizadaEm) : 'pendente'}</dd>
        </div>
      </dl>

      {/* Só quando há texto gerado: avisar sobre a origem de um texto que não
          existe é ruído, e o vazio acima já explica o estado. */}
      {temTexto && (
        <p className={styles.aviso}>
          Texto gerado por inteligência artificial a partir do teor dos atos. Confira no processo
          antes de agir — sobretudo prazos e datas, que aqui são calculados e não vêm do tribunal.
        </p>
      )}
    </footer>
  );
}
