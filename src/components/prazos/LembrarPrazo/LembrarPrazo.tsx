'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, LoaderCircle, X } from 'lucide-react';
import styles from './LembrarPrazo.module.css';

/**
 * "Lembrar" — o segundo verbo da pauta.
 *
 * ## O que ele resolve
 *
 * A data-limite responde "até quando", e só. O caso que ela não cobre é o
 * comum: o prazo vence em 15 dias, a peça leva três, e o documento que falta
 * está com o cliente. O advogado quer o assunto de volta na frente no dia 10 —
 * não no dia 14, quando já é tarde para pedir qualquer coisa a alguém.
 *
 * ## Opções relativas, não um calendário
 *
 * As escolhas são contadas a partir do VENCIMENTO, não de hoje: "três dias
 * antes", "uma semana antes", "na véspera". É como um advogado pensa o
 * lembrete — ele não quer uma data, quer uma folga. E resolve num toque, contra
 * os três a cinco de um seletor de calendário no celular.
 *
 * A opção que cairia no passado não é oferecida: um prazo que vence depois de
 * amanhã não pode ser lembrado "uma semana antes".
 *
 * ## Não promete notificação
 *
 * O rótulo é "Lembrar", não "Avisar", e o texto de confirmação diz onde o
 * lembrete aparece: **na pauta**. Não existe webhook da Meta no projeto e não
 * há cadência de saída para isto — prometer push seria repetir o defeito dos
 * botões inertes que saíram do login. O que acontece é real e é dentro do
 * produto.
 */

/** Dias ANTES do vencimento. Rótulo e valor juntos, para a ordem ser óbvia. */
/** `min-width` do `.menu` no CSS — a medição de onde ele cabe usa o mesmo número. */
const LARGURA_DO_MENU = 232;

const OPCOES: { dias: number; rotulo: string }[] = [
  { dias: 1, rotulo: 'Na véspera' },
  { dias: 3, rotulo: '3 dias antes' },
  { dias: 7, rotulo: '1 semana antes' },
];

/** `2026-09-20T00:00:00.000Z` → `20/09`. */
function diaMes(iso: string): string {
  const [, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}`;
}

/** A data do lembrete, em `YYYY-MM-DD`, a N dias do vencimento. */
function dataDoLembrete(vencimentoISO: string, diasAntes: number): string {
  const [ano, mes, dia] = vencimentoISO.split('-').map(Number);
  /* UTC, como todo o resto do produto: as datas chegam como wall-clock de
     Brasília gravado nos campos UTC, e construir com o fuso da máquina
     deslocaria o lembrete em um dia para quem abrisse fora de -03. */
  const d = new Date(Date.UTC(ano!, mes! - 1, dia! - diasAntes));
  return d.toISOString().slice(0, 10);
}

export function LembrarPrazo({
  prazoId,
  vencimentoISO,
  lembrarEm,
  toolbar = false,
}: {
  prazoId: string;
  /** `YYYY-MM-DD`. Sem data de vencimento não há de onde contar. */
  vencimentoISO: string | null;
  lembrarEm: string | null;
  /** Integra o controle à barra de ações do cartão de triagem. */
  toolbar?: boolean;
}) {
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciarRefresh] = useTransition();

  useEffect(() => {
    function fecharFora(evento: PointerEvent) {
      const atual = menu.current;
      if (atual?.open && evento.target instanceof Node && !atual.contains(evento.target)) {
        atual.open = false;
      }
    }
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && menu.current?.open) {
        menu.current.open = false;
        evento.preventDefault();
      }
    }
    document.addEventListener('pointerdown', fecharFora);
    document.addEventListener('keydown', fecharComEscape);
    return () => {
      document.removeEventListener('pointerdown', fecharFora);
      document.removeEventListener('keydown', fecharComEscape);
    };
  }, []);

  /* Sem vencimento não há como oferecer "três dias antes" — e um lembrete solto
     numa data absoluta seria outro produto. O expediente pendente de ciência
     (sem data calculada pelo tribunal) simplesmente não mostra o botão. */
  if (!vencimentoISO) return null;

  async function gravar(valor: string | null) {
    setErro(null);
    setSalvando(true);
    if (menu.current) menu.current.open = false;
    try {
      const res = await fetch(`/api/prazos/${encodeURIComponent(prazoId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lembrarEm: valor }),
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => ({}));
        throw new Error(dados?.error ?? 'Não foi possível salvar o lembrete.');
      }
      iniciarRefresh(() => router.refresh());
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar o lembrete.');
    } finally {
      setSalvando(false);
    }
  }

  // Já marcado: o botão vira o estado, com a saída ao lado.
  if (lembrarEm) {
    return (
      <span className={`${styles.marcado} ${toolbar ? styles.toolbar : ''}`}>
        <Clock3 size={14} aria-hidden="true" />
        Lembrar em {diaMes(lembrarEm)}
        <button
          type="button"
          className={styles.tirar}
          aria-label="Tirar o lembrete"
          disabled={salvando}
          onClick={e => { e.preventDefault(); e.stopPropagation(); void gravar(null); }}
        >
          <X size={13} aria-hidden="true" />
        </button>
      </span>
    );
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <details
      ref={menu}
      className={`${styles.raiz} ${toolbar ? styles.toolbar : ''}`}
      /* O menu vive na linha de prazo, que é clicável inteira. Nenhum
         ancestral deve reagir ao clique que abre o menu — ver
         `semAbrirOPainel` em `BaixarPrazo`, o mesmo motivo. */
      onClick={e => e.stopPropagation()}
      /* Ao abrir, decide de que lado o menu cabe — ver o comentário de
         `data-ancora` no CSS. Medir aqui, e não em CSS, porque só o gatilho
         sabe onde está na tela. */
      onToggle={e => {
        const raiz = e.currentTarget;
        if (!raiz.open) return;
        // A âncora natural é a direita (`right: 0`): o menu cresce para a
        // esquerda do gatilho. Só quando isso o tiraria da tela ele vira.
        const cabeCrescendoParaAEsquerda = raiz.getBoundingClientRect().right - LARGURA_DO_MENU >= 16;
        if (cabeCrescendoParaAEsquerda) raiz.removeAttribute('data-ancora');
        else raiz.setAttribute('data-ancora', 'esquerda');
      }}
    >
      <summary className={styles.botao}>
        {salvando
          ? <LoaderCircle size={14} aria-hidden="true" className={styles.girando} />
          : <Clock3 size={14} aria-hidden="true" />}
        Lembrar
      </summary>

      <div className={styles.menu}>
        {OPCOES.map(({ dias, rotulo }) => {
          const data = dataDoLembrete(vencimentoISO, dias);
          /* Opção no passado não é oferecida: um prazo que vence depois de
             amanhã não pode ser lembrado "uma semana antes". */
          if (data < hoje) return null;
          return (
            <button
              key={dias}
              type="button"
              className={styles.opcao}
              onClick={e => { e.preventDefault(); void gravar(data); }}
            >
              <span>{rotulo}</span>
              <span className={styles.quando}>{diaMes(data)}</span>
            </button>
          );
        })}
        <p className={styles.nota}>Aparece na sua pauta no dia — não é uma notificação.</p>
        {erro && <p className={styles.erro} role="alert">{erro}</p>}
      </div>
    </details>
  );
}
