# Controle Financeiro — contexto do projeto

> Este arquivo existe para que qualquer pessoa **ou agente de IA** consiga
> entender o projeto sem precisar ler todo o código. Se você vai mexer aqui,
> leia isto primeiro. Se você mudar algo estrutural, **atualize este arquivo**.

## O que é

Um app de controle financeiro **self-hosted** feito para dois cenários ao mesmo
tempo:

1. **Sozinho** — as finanças pessoais de uma pessoa, privadas.
2. **A dois** — as contas de um casal, com divisão de despesas e acerto de contas.

O que amarra os dois é o conceito de **espaço** (`Space`).

## A ideia central: espaços

Um **espaço** é um conjunto isolado de contas, categorias, lançamentos,
orçamentos e metas. Cada pessoa tem:

- um espaço **pessoal**, criado no cadastro, que ninguém mais vê;
- zero ou mais espaços **compartilhados**, criados por convite.

```
Kaleo ──┬── espaço "Meu dinheiro"   (PERSONAL, só ele)
        └── espaço "Nossa casa"     (SHARED)  ──┬── Kaleo
                                                └── Ana
Ana   ──┬── espaço "Meu dinheiro"   (PERSONAL, só ela)
        └── espaço "Nossa casa"     (SHARED)
```

Isso resolve o problema real de um casal: **nem tudo é de todo mundo**. O
presente de aniversário que você comprou para ela vai no seu espaço pessoal; o
aluguel vai no espaço compartilhado. Não é preciso escolher entre "tudo junto"
e "tudo separado".

> Quem participa de um espaço é uma **`Membership`**, não um `User`. Lançamentos
> apontam para `Membership`. Assim, se alguém sair do espaço, o histórico
> continua íntegro (a referência vira `null`, os números não mudam).

## O diferencial: divisão e acerto de contas

Toda despesa num espaço compartilhado responde a duas perguntas diferentes:

| Pergunta | Campo | Significado |
|---|---|---|
| Quem **pagou**? | `Transaction.paidByMembershipId` | de qual bolso o dinheiro saiu |
| Quem **devia**? | `TransactionShare[]` | de quem era aquela conta |

Quando as respostas diferem, nasce uma dívida. O **acerto de contas**
(`/acerto`) soma tudo e diz "Ana paga R$ 2.184,41 para Kaleo".

Modos de divisão (`SplitMode`):

- `OWNER` — 100% de quem pagou (gasto individual; padrão no espaço pessoal)
- `EQUAL` — meio a meio
- `INCOME_RATIO` — proporcional à renda declarada de cada um
- `CUSTOM` — valores definidos à mão

**Invariante que não pode quebrar:** a soma dos `TransactionShare` de uma
transação é SEMPRE exatamente `Transaction.amountCents`. Garantido por
`splitEvenly` / `splitByWeights` (método do maior resto) e verificado em runtime
por `assertSharesBalance`.

## Regras que valem para o projeto inteiro

### 1. Dinheiro é inteiro em centavos

Nunca `Float`, nunca `Decimal`, nunca `number` com casas decimais. Todo campo e
variável de dinheiro termina em `Cents`. Ver `src/lib/money.ts`.

Motivo: `0.1 + 0.2 !== 0.3` em ponto flutuante. Num app financeiro isso vira
centavo perdido no extrato.

### 2. Toda consulta é filtrada por `spaceId`

A autorização do app inteiro se resume a **"este usuário é membro deste
espaço?"**. Isso é respondido por `requireSpace(spaceId)` em
`src/lib/auth/guard.ts`.

```ts
// ✅ certo
await db.transaction.findFirst({ where: { id, spaceId } });

// ❌ ERRADO — vaza dados de outro espaço
await db.transaction.findFirst({ where: { id } });
```

Em updates e deletes, use `updateMany`/`deleteMany` com `spaceId` no `where`,
não `update`/`delete` por id — assim o filtro de autorização vai junto na query
em vez de depender de uma verificação separada.

### 3. Datas de competência não têm hora

São gravadas como **meia-noite UTC** do dia escolhido, e sempre lidas com
`getUTC*`. Ver `src/lib/date.ts` para o porquê (um lançamento de 31/01 no
Brasil apareceria como 30/01 se lido em hora local).

### 4. Nada chega ao banco sem passar por um schema Zod

`FormData` é sempre `string | File`. A validação em `src/lib/validation/` é o
único ponto onde isso vira um tipo confiável.

> ⚠️ **Armadilha do Zod 4:** incluir `z.undefined()` num `union` **NÃO** torna a
> chave opcional — uma chave ausente continua sendo erro. Quem marca a chave
> como dispensável é `.optional()` / `.nullish()`. Um formulário que não
> renderiza um campo simplesmente não o envia. Há testes fixando isso em
> `tests/validation.test.ts`.

### 5. Cor tem significado fixo

`--brand` (índigo) é da interface: botão, menu ativo, link. **Nunca entra num
gráfico.** `--income`, `--expense`, `--transfer` e `--warning` são reservadas e
só significam estado.

Antes a marca e a receita eram literalmente a mesma cor, e o botão primário
lia como "entrou dinheiro".

Categorias usam `--cat-1` … `--cat-8`, uma paleta validada para daltonismo e
contraste nos dois temas. **Mexeu nela, revalide** — ver `docs/DESIGN.md`.

Nunca escreva cor literal num componente; use um token.

### 6. Erros nunca vazam detalhe interno

`runAction` (em `src/server/actions/result.ts`) traduz exceções conhecidas e
esconde as desconhecidas atrás de uma mensagem genérica, logando o original no
servidor.

## Mapa do código

```
prisma/
  schema.prisma          modelo de dados, com comentários explicando cada escolha
  seed.ts                casal de exemplo com 6 meses de lançamentos
src/
  app/
    page.tsx             página de vendas (quem está logado vai para o painel)
    (app)/               telas autenticadas (painel, lançamentos, acerto…)
    entrar/ criar-conta/ autenticação
    layout.tsx           fonte + tema antes da primeira pintura
    globals.css          ⭐ tokens de cor, tipografia e superfícies
  components/
    ui/                  primitivas (Button, Field, Money, Avatar…)
    app/                 casca (sidebar, nav mobile, seletor de espaço)
    transactions/        formulário de lançamento e editor de divisão
    dashboard/ planning/ catalog/ settings/ settlement/ recurrences/
  lib/
    money.ts             ⭐ centavos, parsing pt-BR/en-US, divisão sem perda
    split.ts             ⭐ cálculo dos shares por modo de divisão
    settlement.ts        ⭐ saldos e transferências mínimas
    date.ts              ⭐ competências e meia-noite UTC
    auth/                senha (Argon2id), sessão, rate limit, guardas
    validation/          schemas Zod
    presets.ts           categorias, contas e paleta validada
  server/
    queries/             leitura (saldos, painel, acerto)
    actions/             escrita (Server Actions)
  middleware.ts          redirecionamento e checagem de origem (não é a
                         fronteira de segurança — ver docs/SEGURANCA.md)
tests/                   testes da lógica financeira (o que não pode errar)
```

Os quatro arquivos marcados com ⭐ concentram a lógica que não pode estar
errada. Todos têm testes. **Mexeu neles, rode `npm test`.**

## Comandos

```bash
npm run setup      # cria .env com AUTH_SECRET gerado (primeira vez)
npm run db:deploy  # aplica as migrations
npm run db:seed    # dados de demonstração (APAGA tudo antes)
npm run dev        # desenvolvimento em localhost:3000
npm run check      # typecheck + testes  ← rode antes de commitar
npm run build      # build de produção
npm run senha -- email@exemplo.com   # redefine a senha de alguém
```

## Stack e por quê

| Escolha | Motivo |
|---|---|
| Next.js 15 (App Router) | Server Components deixam a lógica financeira no servidor; Server Actions dispensam uma camada de API |
| Prisma + SQLite | um arquivo, zero configuração, backup = copiar o arquivo. Migrar para Postgres está documentado em `docs/DEPLOY.md` |
| Argon2id | recomendação atual do OWASP para hash de senha |
| Sessão em cookie **e** em tabela | o cookie prova a assinatura na borda; a tabela permite revogar na hora |
| Tailwind + tokens CSS | tema claro/escuro trocando variáveis, sem recompilar |
| Inter via `next/font` | números tabulares de verdade e zero cortado; servida do próprio domínio, sem chamar o Google |
| Vitest | testes rápidos da lógica pura, sem precisar subir banco |

## Onde ler mais

- `docs/PRODUTO.md` — o que o app faz e para quem, tela a tela
- `docs/DESIGN.md` — tipografia, cor, gráficos e as regras para mexer nisso
- `docs/MONETIZACAO.md` — por que o app é gratuito hoje, e o que faltaria para cobrar
- `docs/ARQUITETURA.md` — como as peças se encaixam
- `docs/MODELO-DE-DADOS.md` — cada tabela e por que ela existe
- `docs/SEGURANCA.md` — o modelo de ameaças e o que foi feito
- `docs/DECISOES.md` — decisões com trade-off, e o que foi descartado
- `docs/DEPLOY.md` — colocar no ar, backup, migrar para Postgres
- `docs/ROADMAP.md` — o que ficou de fora e por quê

## Convenções

- **Idioma:** interface, comentários, commits e documentação em **português**.
  Nomes de código (variáveis, funções, tipos) em **inglês**, seguindo o
  ecossistema. Rotas em português (`/lancamentos`, `/acerto`).
- **Comentários** explicam *por quê*, não *o quê*. Se o código não é óbvio, o
  comentário conta a decisão por trás dele.
- **Estados vazios** sempre explicam o que aquilo significa e oferecem a próxima
  ação. Um app financeiro novo é 90% tela vazia.
