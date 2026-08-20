import { getPrevia } from '@/lib/previa.server';
import { nomeProprio } from '@/lib/previa';
import styles from './PainelContexto.module.css';

/**
 * Painel de marca do /cadastro quando o visitante veio da busca por OAB.
 *
 * Repete, no instante da decisão, o que o convenceu na página anterior: o
 * nome dele, quantos processos encontramos e em que tribunais. Sem isso a
 * página de cadastro recomeça a conversa do zero, com um discurso genérico,
 * logo depois de a pessoa ter visto os próprios dados.
 */
export async function PainelContexto({ numero, uf }: { numero: string; uf: string }) {
  const r = await getPrevia(numero, uf);

  // Falha do DJEN não pode derrubar um cadastro: cai no esqueleto, que já é
  // uma mensagem completa por si.
  if (!r.ok || r.previa.totalProcessos === 0) return <PainelEsqueleto />;

  const { previa } = r;
  const nome = previa.advogado ? nomeProprio(previa.advogado) : null;

  return (
    <div className={styles.painel}>
      <p className={styles.oab}>
        OAB {numero}/{uf}
        {nome && <span className={styles.nome}>{nome}</span>}
      </p>

      <p className={styles.linha}>
        <strong className={styles.numero}>{previa.totalProcessos}</strong>
        <span>
          {previa.totalProcessos === 1 ? 'processo esperando' : 'processos esperando'} para entrar
          no seu painel
        </span>
      </p>

      <ul className={styles.tribunais}>
        {previa.tribunais.slice(0, 8).map(t => (
          <li key={t.sigla} className={styles.tribunal}>
            {t.sigla} <span className={styles.tribunalQtd}>{t.processos}</span>
          </li>
        ))}
        {previa.tribunais.length > 8 && (
          <li className={styles.tribunalMais}>+{previa.tribunais.length - 8}</li>
        )}
      </ul>

      <p className={styles.nota}>
        Conectando a credencial, o robô também busca o prazo direto no tribunal.
      </p>
    </div>
  );
}

/** Fallback do Suspense e rede de segurança quando o DJEN não responde. */
export function PainelEsqueleto() {
  return (
    <div className={styles.painel}>
      <p className={styles.nota}>
        Terminado o cadastro, importamos os processos da sua OAB e o painel já nasce cheio.
      </p>
    </div>
  );
}

/**
 * Versão compacta do contexto para o celular.
 *
 * O painel verde do `AuthShell` só existe a partir de 768px — sem isto, quem
 * chega pelo telefone (a maioria) perde justamente a informação que o trouxe
 * até aqui. Vai acima do formulário e some no desktop, onde o painel assume.
 */
export async function ResumoMobile({ numero, uf }: { numero: string; uf: string }) {
  const r = await getPrevia(numero, uf);
  if (!r.ok || r.previa.totalProcessos === 0) return null;

  const { previa } = r;

  return (
    <div className={styles.faixa}>
      <p className={styles.faixaLinha}>
        <strong className={styles.faixaNumero}>{previa.totalProcessos}</strong>
        <span>
          {previa.totalProcessos === 1 ? 'processo encontrado' : 'processos encontrados'} na OAB{' '}
          {numero}/{uf}
        </span>
      </p>
      <ul className={styles.faixaTribunais}>
        {previa.tribunais.slice(0, 4).map(t => (
          <li key={t.sigla} className={styles.faixaTribunal}>
            {t.sigla}
          </li>
        ))}
        {previa.tribunais.length > 4 && (
          <li className={styles.faixaTribunal}>+{previa.tribunais.length - 4}</li>
        )}
      </ul>
    </div>
  );
}
