/**
 * Erros de domínio.
 *
 * Vivem num módulo próprio, SEM importar nada de `next/headers`, Prisma ou
 * qualquer coisa de servidor: componentes de cliente precisam conseguir
 * importar daqui sem arrastar o servidor junto para o bundle.
 */

/** Usuário autenticado, mas sem permissão para o recurso pedido. */
export class AuthorizationError extends Error {
  constructor(message = 'Você não tem acesso a este recurso.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Erro cuja mensagem PODE ser mostrada ao usuário — ao contrário de uma
 * exceção qualquer, que pode vazar caminho de arquivo ou SQL.
 */
export class KnownError extends Error {
  fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'KnownError';
    this.fieldErrors = fieldErrors;
  }
}
