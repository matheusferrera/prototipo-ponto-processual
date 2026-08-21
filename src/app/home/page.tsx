import { permanentRedirect } from 'next/navigation';

/**
 * A landing mudou de `/home` para `/` — esta rota fica só para não quebrar o
 * que já foi compartilhado com o endereço antigo (link em anúncio, mensagem de
 * WhatsApp, aba salva). `permanentRedirect` devolve 308: o navegador e os
 * buscadores passam a tratar `/` como o endereço canônico.
 *
 * A pasta continua sendo a casa dos componentes da landing (`HeroSection`,
 * `CustoRonda`, …), que a página raiz importa daqui.
 */
export default function HomeLegado() {
  permanentRedirect('/');
}
