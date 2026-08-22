/**
 * O contrato de "ligar o monitoramento de uma OAB", num lugar só.
 *
 * Existe porque três telas diferentes chamam a mesma rota — o botão de
 * `/oab/<slug>`, o onboarding e o retorno do Google — e a resposta que mais
 * importa é a que nenhuma delas tratava: `409 OAB_JA_MONITORADA`, a conta que
 * já monitora OUTRA OAB. Enquanto isso era um `catch(() => {})`, o servidor
 * trocava a OAB em silêncio e os dois acervos se misturavam.
 *
 * A troca é possível — só não é automática: quem quiser trocar repete a
 * chamada com `confirmarTroca`, e aí é uma decisão de alguém, tomada diante de
 * uma tela que diz qual OAB sai.
 */

export interface Oab {
  numero: string;
  uf: string;
}

export interface ConflitoOab {
  /** A OAB que a conta já monitora — a que sairia numa troca. */
  atual: Oab;
  /** A OAB que se tentou ligar agora. */
  pedida: Oab;
}

export type ResultadoMonitorar =
  | { status: 'ok'; trocou: boolean; arquivados: number }
  | { status: 'conflito'; conflito: ConflitoOab }
  | { status: 'nao-autenticado' }
  | { status: 'erro'; mensagem: string };

/**
 * @param confirmarTroca autoriza SUBSTITUIR a OAB que a conta já monitora.
 *   Só passe `true` a partir de uma tela que mostrou qual OAB sai — é o que
 *   separa "trocar" de "sobrescrever sem avisar".
 */
export async function ligarMonitoramento(
  oab: Oab,
  { confirmarTroca = false }: { confirmarTroca?: boolean } = {},
): Promise<ResultadoMonitorar> {
  let res: Response;
  try {
    res = await fetch('/api/scraper/monitorar-oab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oabNumero: oab.numero, oabUf: oab.uf, confirmarTroca }),
    });
  } catch {
    return { status: 'erro', mensagem: 'Não foi possível conectar ao servidor.' };
  }

  const dados = await res.json().catch(() => ({} as Record<string, unknown>));

  if (res.ok) {
    return {
      status: 'ok',
      trocou: Boolean((dados as { trocou?: boolean }).trocou),
      arquivados: Number((dados as { arquivados?: number }).arquivados ?? 0),
    };
  }

  if (res.status === 401) return { status: 'nao-autenticado' };

  const corpo = dados as {
    code?: string;
    error?: string;
    oabAtual?: Partial<Oab>;
    oabPedida?: Partial<Oab>;
  };

  if (res.status === 409 && corpo.code === 'OAB_JA_MONITORADA' && corpo.oabAtual?.numero && corpo.oabAtual.uf) {
    return {
      status: 'conflito',
      conflito: {
        atual: { numero: corpo.oabAtual.numero, uf: corpo.oabAtual.uf },
        pedida: {
          numero: corpo.oabPedida?.numero ?? oab.numero,
          uf: corpo.oabPedida?.uf ?? oab.uf,
        },
      },
    };
  }

  return { status: 'erro', mensagem: corpo.error ?? 'Não foi possível ligar o monitoramento agora.' };
}
