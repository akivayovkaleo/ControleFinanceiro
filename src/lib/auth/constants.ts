/**
 * Constantes de autenticação seguras para qualquer runtime.
 *
 * O middleware roda no Edge, que não tem `node:crypto`. Importar
 * `session.ts` lá quebraria o build — então o que o Edge precisa saber
 * (o nome do cookie) mora aqui, sem nenhuma dependência de Node.
 */

export const SESSION_COOKIE = 'cf_session';
