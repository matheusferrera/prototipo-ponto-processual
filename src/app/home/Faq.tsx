import styles from './Faq.module.css';

type Pergunta = { q: string; a: string };

const PERGUNTAS: Pergunta[] = [
  {
    q: 'Preciso entregar minha senha do PJe para começar?',
    a: 'Não. A busca inicial usa consulta pública — a mesma do diário nacional, que qualquer pessoa pode fazer. Senha de tribunal só entra se você quiser alcançar também o que não sai em base pública.',
  },
  {
    q: 'E os processos em segredo de justiça?',
    a: 'Esses não aparecem em consulta pública, por definição. Para acompanhá-los, cadastramos a credencial do tribunal e passamos a ler com o seu próprio acesso — do mesmo jeito que você leria.',
  },
  {
    q: 'Vocês peticionam ou movimentam alguma coisa em meu nome?',
    a: 'Nunca. O acesso é exclusivamente de leitura. Nada é protocolado, assinado, juntado ou respondido pela plataforma — a decisão e o ato continuam sendo seus.',
  },
  {
    q: 'Funciona no meu tribunal?',
    a: 'O diário nacional cobre o país inteiro. Além dele, sincronizamos direto nos sistemas dos tribunais, e essa lista cresce a cada mês. Faça a consulta pela sua OAB: mostramos exatamente quais dos seus tribunais já entram na sincronização direta.',
  },
  {
    q: 'Como chega o alerta?',
    a: 'No WhatsApp, no número que você indicar, com o processo, a movimentação e o prazo que aquilo abre. Também fica tudo no painel, com calendário de prazos e histórico por processo.',
  },
  {
    q: 'E se eu cancelar?',
    a: 'Você exporta seus processos e prazos e revoga as credenciais com um clique. Não retemos acesso a nada depois disso.',
  },
];

/** FAQ em formato de sumário — cada linha abre no lugar (details/summary),
 *  sem JS. É onde as objeções de compra morrem, então fica logo antes do
 *  último CTA. */
export function Faq() {
  return (
    <div className={styles.lista}>
      {PERGUNTAS.map(p => (
        <details key={p.q} className={styles.item}>
          <summary className={styles.pergunta}>
            <span>{p.q}</span>
            <span className={styles.marca} aria-hidden="true" />
          </summary>
          <p className={styles.resposta}>{p.a}</p>
        </details>
      ))}
    </div>
  );
}
