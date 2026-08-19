import styles from './Faq.module.css';

type Pergunta = { q: string; a: string };

const PERGUNTAS: Pergunta[] = [
  {
    q: 'Preciso entregar minha senha do PJe para começar?',
    a: 'Não. A busca inicial usa a consulta pública do diário nacional, que qualquer pessoa pode fazer. Senha de tribunal só entra se você quiser alcançar também o que não sai em base pública.',
  },
  {
    q: 'E os processos em segredo de justiça?',
    a: 'Esses não aparecem em consulta pública. Para acompanhá-los, você cadastra a credencial do tribunal e a leitura passa a ser feita com o seu próprio acesso, do mesmo jeito que você faria.',
  },
  {
    q: 'Vocês peticionam ou movimentam alguma coisa em meu nome?',
    a: 'Não. O acesso é exclusivamente de leitura: a plataforma consulta e registra, e nada mais. Peticionar continua sendo ato seu.',
  },
  {
    q: 'Funciona no meu tribunal?',
    a: 'O diário nacional cobre o país inteiro, então o acompanhamento começa em qualquer tribunal. A sincronização direta dentro dos sistemas vale para uma lista que cresce a cada mês, e a consulta pela sua OAB mostra quais dos seus já entram nela.',
  },
  {
    q: 'Como chega o alerta?',
    a: 'No WhatsApp, no número que você indicar, com o processo, a movimentação e o prazo que ela abre. O mesmo conteúdo fica no painel, com calendário de prazos e histórico por processo.',
  },
  {
    q: 'E se eu cancelar?',
    a: 'Você exporta seus processos e prazos e revoga as credenciais na mesma tela. Depois disso não fica acesso nenhum conosco.',
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
