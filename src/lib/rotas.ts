/**
 * Endereços que o código precisa citar por nome.
 *
 * `/` é a landing pública desde que ela assumiu a raiz; o painel do usuário
 * autenticado mora em `/painel`. Como "para onde vai quem acabou de entrar" é
 * decidido em cinco lugares (middleware, login por senha, volta do Google,
 * onboarding e o menu), a resposta fica escrita uma vez só.
 */
export const ROTA_PAINEL = '/painel';
export const ROTA_LANDING = '/';
