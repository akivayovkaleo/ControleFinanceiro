/**
 * Stub de `server-only` para os testes.
 *
 * O pacote real não é uma dependência do projeto: o Next o fornece durante o
 * build, e sua única função é quebrar o build se um módulo de servidor for
 * importado pelo cliente. Fora do Next ele não existe, então os testes que
 * exercitam código de servidor (o armazenamento de anexos, por exemplo)
 * precisam deste vazio no lugar.
 */
export {};
