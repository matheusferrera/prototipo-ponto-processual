import Link from 'next/link';
import type { CartaoDoFio } from '@/lib/api.server';
import { comoTitulo, diaComSemana } from '@/lib/movimentacao';
import { nomeLegivel } from '@/lib/processo-apresentacao';
import { tomDosDias } from '@/lib/situacao-do-ato';
import styles from './ListaDeFios.module.css';

/**
 * OS PRAZOS EM CURSO — a aba "Com prazo".
 *
 * ## Por que esta aba existe ao lado das outras
 *
 * O acervo tem **18.485 movimentações** numa conta só (370 páginas a 50 por
 * página, medido em 15/09/2026); os prazos abertos da mesma conta são **11**.
 * Enquanto um prazo corre, a pergunta não é "o que chegou hoje" — é "o que
 * aconteceu neste caso desde que ele abriu", e ela se responde com 11 linhas.
 *
 * ## O número de dias é o maior elemento da linha
 *
 * Desde 17/09/2026 cada prazo abre por um bloco com os dias que faltam, na cor
 * da régua única da tela (`tomDosDias`): é o que se lê de relance ao descer a
 * lista, e a data vem logo ao lado para cruzar com a agenda. O mesmo DOM vira
 * cartão no celular e linha de tabela no desktop.
 *
 * ## "Nada novo" é resposta, e ocupa uma linha
 *
 * 5 dos 11 prazos medidos não tiveram movimentação depois da publicação. Uma
 * linha em branco nesse caso pareceria uma linha que não carregou.
 *
 * ## A ordem é a urgência, e vem do backend
 *
 * O que vence primeiro no topo; sem data-limite no fim. Reordenar aqui seria
 * uma segunda verdade sobre a mesma lista.
 */
export function ListaDeFios({ fios, total }: { fios: CartaoDoFio[]; total: number }) {
  if (!fios.length) {
    return (
      <div className={styles.vazio}>
        <p className={styles.vazioTitulo}>Nenhum prazo em curso</p>
        <p className={styles.vazioTexto}>
          Quando um ato abrir prazo em algum dos seus processos, ele aparece aqui
          com tudo que acontecer no caso enquanto ele corre.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.aba}>
      <div className={styles.intro}>
        <p className={styles.introTexto}>
          <strong>{total} {total === 1 ? 'prazo correndo.' : 'prazos correndo.'}</strong>{' '}
          Em cada um, o que aconteceu no processo desde que ele abriu.
        </p>
        <p className={styles.introNota}>≈ marca a data calculada por nós. Confira no tribunal.</p>
      </div>

      <div className={styles.tabela}>
        <div className={styles.colunas} aria-hidden="true">
          <span>Faltam</span>
          <span>Prazo e partes</span>
          <span>Tribunal</span>
          <span>Vence</span>
          <span>Andamento</span>
          <span>Desde que abriu</span>
        </div>
        <ol className={styles.lista}>
          {fios.map(fio => <Linha key={fio.prazo.id} fio={fio} />)}
        </ol>
        {total > fios.length && (
          <p className={styles.teto}>Mostrando os {fios.length} mais urgentes de {total}.</p>
        )}
      </div>
    </div>
  );
}

function Linha({ fio }: { fio: CartaoDoFio }) {
  const { prazo, regua, novas, ultimo } = fio;
  /* A distância vem pronta do backend — `regua.restam` é a conta com o relógio
     de Brasília. `diasRestantes` é a segunda via, para o prazo sem régua. */
  const restam = regua?.restam ?? prazo.diasRestantes;
  const tom = restam === null ? 'neutro' : restam < 0 ? 'tinto' : tomDosDias(restam);
  const peca = comoTitulo(prazo.ato?.ia?.peca?.trim() || prazo.tipo);
  const estimado = prazo.metodoPrazo !== undefined && prazo.metodoPrazo !== null && prazo.metodoPrazo !== 'textoExplicito';
  const data = diaComSemana(prazo.vencimentoISO);
  const partes = [
    (prazo.cliente?.length ? prazo.cliente.join(', ') : prazo.parte || prazo.cnj),
    prazo.parteContraria?.length ? prazo.parteContraria.join(', ') : null,
  ].filter(Boolean).map(nome => nomeLegivel(nome as string)).join(' × ');
  const fonte = !prazo.metodoPrazo ? 'informada pelo tribunal'
    : estimado ? 'calculada por nós'
    : 'dias escritos no ato';
  /* A RÉGUA, sem "dia N de M": `totalDias` é a janela de CALENDÁRIO, e o prazo
     declarado pode estar em dias úteis — contagens diferentes. */
  const fracao = regua ? Math.min(1, Math.max(0, regua.decorridos / Math.max(1, regua.totalDias))) : null;

  return (
    <li>
      <Link href={`/movimentacoes/fio/${prazo.id}`} className={styles.linha} data-tom={tom}>
        <span className={styles.dias}>
          {restam === null ? (
            <span className={styles.diasSem}>sem data</span>
          ) : restam < 0 ? (
            <>
              <span className={styles.diasNumero}>{Math.abs(restam)}</span>
              <span className={styles.diasUnidade}>{Math.abs(restam) === 1 ? 'dia atrás' : 'dias atrás'}</span>
            </>
          ) : restam === 0 ? (
            <span className={styles.diasHoje}>hoje</span>
          ) : (
            <>
              <span className={styles.diasNumero}>{restam}</span>
              <span className={styles.diasUnidade}>{restam === 1 ? 'dia' : 'dias'}</span>
            </>
          )}
        </span>

        <span className={styles.prazo}>
          <span className={styles.peca}>{peca}</span>
          <span className={styles.partes}>{partes}</span>
        </span>

        <span className={styles.trib}>{prazo.tribunal}</span>

        <span className={styles.vence}>
          {data ? (
            <>
              <span className={styles.venceData}>
                <span className={styles.venceVerbo}>vence </span>{data}{estimado ? ' ≈' : ''}
              </span>
              <span className={styles.venceFonte}>{fonte}</span>
            </>
          ) : (
            <span className={styles.venceData}>sem data-limite</span>
          )}
        </span>

        <span className={styles.regua} aria-hidden="true">
          {fracao !== null && <span style={{ width: `${Math.round(fracao * 100)}%` }} />}
        </span>

        <span className={styles.mudou}>
          {novas === 0 ? (
            <span className={styles.silencio}>
              {fio.prazo.publicadoEm && ehHoje(fio.prazo.publicadoEm) ? 'Prazo aberto hoje.' : 'Nada novo no processo desde que o prazo abriu.'}
            </span>
          ) : (
            <>
              <span className={styles.contagem}>
                {novas} {novas === 1 ? 'novidade' : 'novidades'}
              </span>
              {/* O último ato QUE IMPORTA — trâmite e publicação ficam de fora.
                  Quando as novas são todas de cartório, a contagem sozinha diz. */}
              {ultimo && <span className={styles.ultimo}>{ultimo.resumo?.trim() || ultimo.descricao}</span>}
            </>
          )}
        </span>
      </Link>
    </li>
  );
}

/** A publicação é de hoje, em wall-clock de Brasília. */
function ehHoje(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.getUTCFullYear() === agora.getUTCFullYear()
    && d.getUTCMonth() === agora.getUTCMonth()
    && d.getUTCDate() === agora.getUTCDate();
}
