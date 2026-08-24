# Arquitetura

## Visão geral

```
┌─────────────────────────────────────────────────────────────┐
│  Navegador                                                  │
│  ├── Server Components (HTML pronto, sem JS de dados)       │
│  └── Client Components (formulários, gráficos, seletores)   │
└───────────────┬─────────────────────────────────────────────┘
                │ Server Actions (POST) / navegação
┌───────────────▼─────────────────────────────────────────────┐
│  middleware.ts        redireciona + checa origem (Edge)     │
├─────────────────────────────────────────────────────────────┤
│  src/server/actions/  ESCRITA   valida → autoriza → grava   │
│  src/server/queries/  LEITURA   agrega para as telas        │
├─────────────────────────────────────────────────────────────┤
│  src/lib/             regras puras (dinheiro, divisão,      │
│                       acerto, datas) + auth                 │
├─────────────────────────────────────────────────────────────┤
│  Prisma → SQLite (arquivo único)                            │
└─────────────────────────────────────────────────────────────┘
```

Não há camada de API REST. As telas leem direto do banco em Server Components, e
escrevem por Server Actions. Um app usado por duas pessoas não ganha nada com
uma API HTTP no meio — ganha latência e código para manter.

## As três camadas de código

### `src/lib/` — regras puras

Funções sem banco, sem rede, sem React. É onde mora a lógica que não pode estar
errada:

| Arquivo | Responsabilidade |
|---|---|
| `money.ts` | centavos, parsing de entrada, divisão sem perder centavo |
| `split.ts` | quanto cabe a cada membro, por modo de divisão |
| `settlement.ts` | saldos líquidos e transferências mínimas |
| `date.ts` | competências, meia-noite UTC, recorrência |
| `recurrence.ts` | quais ocorrências estão vencidas |

Todas testadas em `tests/`. São puras de propósito: dá para testar cada caso de
borda sem subir banco nenhum.

`src/lib/auth/` fica aqui também, mas toca banco — é a exceção justificada:
sessão e rate limit precisam de persistência.

### `src/server/queries/` — leitura

Funções `async` marcadas com `import 'server-only'`, que agregam dados para as
telas. Sempre recebem `spaceId` e sempre filtram por ele.

Uma decisão importante: **saldo de conta não é um campo no banco**. É derivado
dos lançamentos toda vez:

```
saldo = saldo inicial + receitas − despesas + transferências recebidas − enviadas
```

Guardar um saldo materializado exigiria mantê-lo sincronizado em toda criação,
edição e exclusão — e qualquer falha nesse caminho deixaria um número errado na
tela para sempre. Derivar é mais lento e sempre correto. Para o volume de um
casal (milhares de lançamentos), é instantâneo.

### `src/server/actions/` — escrita

Server Actions. Toda uma segue a mesma sequência:

```ts
export async function algumaAction(_prev, formData) {
  return runAction(async () => {
    const parsed = parseForm(schema, formData);   // 1. valida
    if (!parsed.ok) return parsed.state;

    const context = await requireSpace(spaceId);  // 2. autoriza

    await db.$transaction(...);                   // 3. grava

    await audit({ ... });                         // 4. registra
    revalidatePath('/painel');                    // 5. invalida cache
    return success('Pronto.');
  });
}
```

`runAction` centraliza o tratamento de erro: traduz `AuthorizationError` e
`KnownError` em mensagem para o usuário, esconde o resto atrás de "algo deu
errado" e loga o original. Ele reconhece e **repassa** as exceções de controle
de fluxo do Next (`redirect`, `notFound`) — sem isso, um redirect viraria "erro
inesperado".

## Autenticação e autorização

Duas perguntas diferentes, respondidas em lugares diferentes:

**Quem é você?** → `getCurrentSession()` lê o cookie e valida contra a tabela
`Session`. `getCurrentUser()` envolve isso em `cache()` do React, então o
layout, a página e cada componente podem chamar sem multiplicar consultas.

**Você pode ver isto?** → `requireSpace(spaceId)` confirma que existe uma
`Membership` ligando o usuário ao espaço, e devolve o contexto (espaço, seu
papel, todos os membros).

O middleware **não** é a fronteira de segurança. Ele roda no Edge, sem acesso ao
banco, e só sabe se existe um cookie com assinatura válida. Serve para evitar
carregar uma página inteira antes de redirecionar. Ver `docs/SEGURANCA.md`.

## Espaço ativo

O espaço vive na query string (`?space=…`) e cai para o último usado
(`User.lastSpaceId`) quando ausente.

Foi escolhido assim em vez de `/e/[spaceId]/lancamentos` porque mantém as URLs
curtas e legíveis, e porque trocar de espaço é raro — quase sempre a pessoa
quer continuar onde estava.

`getActiveSpace(searchParams)` resolve isso. Se o `?space=` apontar para um
espaço que não é do usuário, cai para o padrão em vez de estourar — assim um
link antigo não vira tela de erro.

> Layouts no App Router não recebem `searchParams`. Por isso o layout de
> `(app)/` resolve o espaço só para montar os links, e cada página resolve o seu
> de novo via `getActiveSpace`. A duplicação é barata (`cache()` deduplica a
> consulta dentro da mesma requisição).

## Recorrências sem cron

Recorrências não são geradas por um agendador. O layout de `(app)/` verifica, a
cada carregamento, se há alguma vencida e materializa as ocorrências pendentes.

O motivo: num app self-hosted, depender de cron externo é depender de algo que
quebra em silêncio quando o servidor reinicia. Gerar sob demanda dá o mesmo
resultado sem infraestrutura para manter.

É idempotente: o cursor `nextRunAt` avança dentro da mesma transação que cria os
lançamentos, então rodar duas vezes seguidas não duplica nada. Há um teto de 60
ocorrências por execução, para o caso de uma recorrência antiga esquecida.

## Fronteira cliente/servidor

Alguns módulos precisam de cuidado porque são importados dos dois lados:

| Módulo | Por quê |
|---|---|
| `lib/errors.ts` | classes de erro sem nenhum import de servidor |
| `server/actions/types.ts` | `ActionState` e `idleState` para `useActionState` |
| `lib/auth/constants.ts` | nome do cookie, que o middleware (Edge) precisa |
| `lib/auth/password-policy.ts` | medidor de força de senha, usado na tela de cadastro |

Sem essa separação, importar `idleState` num formulário arrastaria Prisma e o
binário do Argon2 para o bundle do navegador — e o build falha.

**Regra:** se um componente `'use client'` precisa de algo, esse algo não pode
importar `next/headers`, Prisma ou módulo nativo.

## Tema

O tema vive no `localStorage`, não no banco, porque é uma preferência do
**dispositivo**: a mesma pessoa pode querer escuro no celular à noite e claro no
notebook.

Um script síncrono no `<head>` do layout raiz lê a chave antes da primeira
pintura. Sem ele, a página apareceria clara por um instante e piscaria para o
escuro.

## Cache

O App Router cacheia agressivamente. Toda Server Action que muda números chama
`revalidatePath` nas telas afetadas. As páginas com dados do usuário são
dinâmicas (`ƒ` no output do build), porque leem cookies.
