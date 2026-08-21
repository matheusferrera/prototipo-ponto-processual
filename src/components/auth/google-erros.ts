/**
 * Códigos que voltam em `?erro=` do fluxo do Google, já traduzidos.
 *
 * O redirect não tem como carregar um objeto de erro, e a página de origem não
 * tem como saber o que aconteceu do outro lado — então o callback manda um
 * código curto e a tradução mora aqui, num lugar só, usada por /login e
 * /cadastro.
 */
export interface AvisoGoogle {
  texto: string;
  /** `true` quando não é falha nossa nem da pessoa — cancelar não é erro. */
  neutro?: boolean;
}

const MENSAGENS: Record<string, AvisoGoogle> = {
  google_cancelado: {
    texto: 'Você fechou a janela do Google antes de terminar. Pode tentar de novo quando quiser.',
    neutro: true,
  },
  google_indisponivel: {
    texto: 'A entrada com o Google está indisponível agora. Use e-mail e senha para continuar.',
  },
  google_estado: {
    texto: 'A tentativa demorou demais e expirou por segurança. Clique de novo em entrar com o Google.',
  },
  google_email: {
    texto: 'Sua conta Google está com o e-mail sem verificação, e é ele que identifica você aqui. Verifique no Google e tente de novo — ou siga com e-mail e senha.',
  },
  google_inativo: {
    texto: 'Esta conta está desativada. Fale com o suporte para reativá-la.',
  },
  google_offline: {
    texto: 'Não conseguimos falar com o Google agora. Tente novamente em instantes.',
  },
  google_falhou: {
    texto: 'Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha.',
  },
};

export function avisoGoogle(codigo: string | undefined | null): AvisoGoogle | null {
  if (!codigo) return null;
  return MENSAGENS[codigo] ?? MENSAGENS.google_falhou!;
}
