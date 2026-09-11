import { NextRequest, NextResponse } from 'next/server';
import {
  COOKIE_ESTADO,
  destinoSeguro,
  estadoConfere,
  googleAtivo,
  redirectUri,
  trocarCodePorIdToken,
  type EstadoOauth,
} from '@/lib/google-oauth.server';
import { gravarSessao } from '@/lib/auth-cookies';
import { ROTA_PAINEL } from '@/lib/rotas';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

/**
 * Passo 2: o Google devolve o navegador para cá com um `code`.
 *
 * Daqui saem sempre redirects — nunca JSON: quem está do outro lado é uma
 * janela de navegador, não um `fetch`. Erro vira `?erro=<código>` na página de
 * origem, que sabe traduzi-lo para uma frase e manter o formulário no lugar.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const cru = req.cookies.get(COOKIE_ESTADO)?.value;

  let estado: EstadoOauth | null = null;
  try {
    estado = cru ? (JSON.parse(cru) as EstadoOauth) : null;
  } catch {
    estado = null;
  }

  // Sem cookie não dá nem para saber de qual página a pessoa saiu: /login é o
  // destino honesto. Acontece de verdade quando o fluxo demora mais que os 10
  // minutos de validade, ou quando a volta cai noutro navegador.
  if (!estado?.state || !estado.verifier) {
    return volta(req, '/login', 'google_estado', null);
  }

  const erroDoGoogle = sp.get('error');
  if (erroDoGoogle) {
    // `access_denied` = a pessoa clicou "cancelar" na tela do Google. Não é
    // falha nossa e não merece texto de erro vermelho.
    return volta(req, estado.origem, erroDoGoogle === 'access_denied' ? 'google_cancelado' : 'google_falhou', estado);
  }

  const code = sp.get('code');
  if (!code || !estadoConfere(sp.get('state'), estado.state)) {
    return volta(req, estado.origem, 'google_estado', estado);
  }

  if (!googleAtivo()) {
    return volta(req, estado.origem, 'google_indisponivel', estado);
  }

  let idToken: string | null;
  try {
    idToken = await trocarCodePorIdToken(code, estado, redirectUri(req));
  } catch {
    idToken = null;
  }
  if (!idToken) {
    return volta(req, estado.origem, 'google_falhou', estado);
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${BACKEND}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      cache: 'no-store',
    });
  } catch {
    return volta(req, estado.origem, 'google_offline', estado);
  }

  const dados = (await resposta.json().catch(() => ({}))) as {
    accessToken?: string;
    refreshToken?: string;
    criado?: boolean;
    code?: string;
  };

  if (!resposta.ok || !dados.accessToken || !dados.refreshToken) {
    return volta(req, estado.origem, codigoDeErro(resposta.status, dados.code), estado);
  }

  /* A OAB que veio de `/oab` é gravada aqui, com o token recém-emitido, e não
     numa tela seguinte: o front só tem esta passagem pelo servidor antes de o
     navegador seguir para o destino. Falhar aqui não pode custar o login — o
     painel recebe a conta com "falta a sua OAB" e o campo para informá-la. */
  const resultadoOab = estado.oab && estado.uf
    ? await monitorarOab(dados.accessToken, estado.oab, estado.uf)
    : null;

  /* Para onde vai quem acabou de entrar:
     — com OAB, ao painel: os processos dela já foram vistos em `/oab` e o
       monitoramento acabou de ser ligado; o painel abre em "sincronizando";
     — com OAB que CONFLITA com a que a conta já monitora, ao onboarding com a
       OAB na URL: aqui não existe tela para perguntar (quem está do outro lado
       é um redirect), e trocar por conta própria é exatamente o bug que este
       fluxo tinha — entrar pelo Google com um e-mail já cadastrado trocava a
       OAB da conta sem nada na tela. O onboarding faz a pergunta;
     — com OAB que NÃO foi gravada (o backend recusou ou não respondeu), ao
       onboarding com a OAB na URL também: mandar ao painel seria prometer um
       monitoramento que não existe, e foi assim que uma conta chegou ao painel
       vazio sem nada explicando. O onboarding refaz a busca e tenta de novo;
     — conta recém-criada sem OAB (o botão do /login), ao onboarding, que
       pergunta a OAB uma vez — o painel não teria o que mostrar;
     — o resto volta para onde tentava ir. */
  const destino = estado.oab && estado.uf
    ? resultadoOab === 'ok'
      ? ROTA_PAINEL
      : `/onboarding?${new URLSearchParams({ oab: estado.oab, uf: estado.uf })}`
    : dados.criado
      ? '/onboarding'
      : destinoSeguro(estado.next, ROTA_PAINEL);

  const res = NextResponse.redirect(new URL(destino, req.nextUrl.origin));
  gravarSessao(res, { accessToken: dados.accessToken, refreshToken: dados.refreshToken });
  limparEstado(res);
  return res;
}

/**
 * Grava a OAB na conta que acabou de entrar.
 *
 * O `accessToken` é o da sessão recém-aberta — este handler o tem em mãos antes
 * de gravá-lo no cookie, então a chamada vai direto ao backend em vez de passar
 * pelo proxy `/api/*`, que leria um cookie que ainda não existe.
 *
 * NUNCA manda `confirmarTroca`: este caminho não tem tela, e trocar a OAB de
 * uma conta é decisão que precisa de uma. O `409` vira `conflito`, e o destino
 * passa a ser a tela que pergunta.
 *
 * **Ia para `POST /scraper/monitorar-oab` até 11/09/2026 — rota que o backend
 * removeu em 04/09.** O destino certo é `POST /consulta-publica/geral`, o
 * mesmo que o proxy `/api/consulta-publica/geral` usa.
 *
 * **E o retorno era booleano, o que tornava a falha invisível.** `res.status
 * === 409` lia QUALQUER outra resposta — inclusive o 404 da rota morta — como
 * "gravou", e o destino virava o painel. O sintoma foi este: conta criada pelo
 * Google com OAB digitada, nenhuma `OabMonitorada` no banco, nenhum job, painel
 * vazio — e nada na tela que dissesse o que faltou. Por isso agora são três
 * estados, e falhar não manda para o painel: manda para o onboarding, que
 * pergunta de novo.
 */
type ResultadoOab = 'ok' | 'conflito' | 'falhou';

async function monitorarOab(accessToken: string, oab: string, uf: string): Promise<ResultadoOab> {
  try {
    const res = await fetch(`${BACKEND}/consulta-publica/geral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ oabNumero: oab, oabUf: uf }),
      cache: 'no-store',
    });

    if (res.status === 409) return 'conflito';
    if (res.ok) return 'ok';

    console.error(`[google/callback] ${BACKEND}/consulta-publica/geral devolveu HTTP ${res.status} ao gravar a OAB ${oab}/${uf}`);
    return 'falhou';
  } catch (err) {
    // Sem rede para o backend: o login continua valendo, e a OAB é perguntada
    // de novo no onboarding em vez de a conta cair num painel vazio.
    console.error('[google/callback] sem resposta do backend ao gravar a OAB:', err);
    return 'falhou';
  }
}

/** Traduz a resposta do backend no código curto que a página de origem exibe. */
function codigoDeErro(status: number, code?: string): string {
  if (code === 'GOOGLE_DESLIGADO' || status === 503) return 'google_indisponivel';
  if (code === 'email_nao_verificado') return 'google_email';
  if (status === 403) return 'google_inativo';
  if (status === 502) return 'google_offline';
  return 'google_falhou';
}

/**
 * Volta para a página de origem com o erro — e com a OAB, quando havia uma:
 * quem digitou OAB no cadastro não pode reencontrar o campo vazio só porque o
 * Google recusou o login.
 */
function volta(req: NextRequest, origem: string, erro: string, estado: EstadoOauth | null) {
  const params = new URLSearchParams({ erro });
  if (estado?.oab && estado.uf) {
    params.set('oab', estado.oab);
    params.set('uf', estado.uf);
  }
  if (origem === '/login' && estado?.next) params.set('next', estado.next);

  const res = NextResponse.redirect(new URL(`${origem}?${params}`, req.nextUrl.origin));
  limparEstado(res);
  return res;
}

/** O estado vale para uma tentativa só — inclusive quando ela falha. */
function limparEstado(res: NextResponse) {
  res.cookies.set(COOKIE_ESTADO, '', { maxAge: 0, path: '/api/auth/google' });
}
