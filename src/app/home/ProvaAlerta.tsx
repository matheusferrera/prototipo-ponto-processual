import { Check, CheckCheck } from 'lucide-react';
import styles from './ProvaAlerta.module.css';

/**
 * Prova de produto no lugar de depoimento.
 *
 * Enquanto não há cliente disposto a aparecer com nome, OAB e rosto,
 * depoimento anônimo ("Camila R., advogada") não constrói confiança em
 * público jurídico — corrói. O que convence aqui é ver o formato exato do
 * alerta que vai chegar. Números e nomes abaixo são ilustrativos e estão
 * rotulados como tal.
 */
export function ProvaAlerta() {
  return (
    <div className={styles.wrap}>
      <div className={styles.conversa}>
        <div className={styles.conversaTopo}>
          <span className={styles.avatar} aria-hidden="true" />
          <div>
            <div className={styles.contato}>Ponto Processual</div>
            <div className={styles.contatoStatus}>online</div>
          </div>
        </div>

        <div className={styles.balao}>
          <div className={styles.balaoTitulo}>§ NOVA INTIMAÇÃO · TJSP</div>
          <div className={styles.balaoProc}>1023456-78.2025.8.26.0100</div>
          <p className={styles.balaoTexto}>
            Despacho publicado hoje. Abre prazo de <strong>15 dias úteis</strong> para manifestação.
          </p>
          <div className={styles.balaoPrazo}>Vence em 08/09 · terça</div>
          <div className={styles.balaoMeta}>
            09:12 <CheckCheck size={13} />
          </div>
        </div>

        <div className={styles.balao}>
          <div className={styles.balaoTitulo}>§ RESUMO DE HOJE</div>
          <p className={styles.balaoTexto}>
            4 movimentações em 3 processos. 1 abre prazo, 2 são de andamento, 1 é sentença.
          </p>
          <div className={styles.balaoMeta}>
            09:12 <Check size={13} />
          </div>
        </div>

        <p className={styles.legenda}>Exemplo ilustrativo do formato do alerta.</p>
      </div>

      <div className={styles.texto}>
        <h3 className={styles.textoTitulo}>O alerta já vem decidido</h3>
        <p className={styles.textoP}>
          A mensagem não diz apenas &ldquo;houve movimentação&rdquo;. Ela diz qual processo, o que saiu, se
          aquilo abre prazo, quantos dias e em que data vence — contado em dias úteis, com o feriado
          do tribunal já descontado.
        </p>
        <p className={styles.textoP}>
          É a diferença entre receber um aviso e receber uma decisão pronta para tomar. Você abre o
          sistema do tribunal quando escolher abrir, não para descobrir se precisa abrir.
        </p>
      </div>
    </div>
  );
}
