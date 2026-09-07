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

## A camada opcional: a vila

Além das telas diretas, o mesmo ledger pode ser visto como um **vilarejo
isométrico** em `/vila`. Cada prédio é um *bucket* de categorias (casa,
locomoção, saúde, estudos, investimentos, personalizado) e o hub central soma
a vila inteira.

**A vila é projeção, nunca fonte.** Ela lê o ledger e desenha; não grava nada,
não tem tabela própria e não muda um centavo de lugar. Trocar a época
(medieval, futurista…) é 100% cosmético.

### A regra anti-inflação

O modo de crescimento padrão é **diversidade**: um prédio sobe de nível pela
quantidade de **categorias distintas com lançamento** nele, não pelo valor.

Isso é deliberado. Uma vila que cresce com o valor gasto ensina exatamente a
coisa errada — quanto mais você torra, mais bonita ela fica. Aqui, gastar
R$ 500 mil numa categoria só mantém o prédio no nível 1; organizar em três
categorias sobe para o nível 3. O que a vila premia é organizar as finanças.

Existe um modo alternativo por valor, com limiares **por categoria** (uma casa
não se compara a um gasto de saúde), mas ele não é o padrão. A propriedade
"no modo diversidade, o valor não altera o tier" está fixada em
`tests/village-growth.test.ts` — se esse teste cair, a gamificação virou um
incentivo a gastar.

## O resto do dia a dia

Três coisas que um app de controle financeiro brasileiro não pode não ter, e
uma que existe por causa do objetivo de longo prazo:

**Cartão de crédito** (`/cartoes`). A fatura de cada cartão, o limite já usado e
o vencimento. No ledger, compra é `EXPENSE` na conta do cartão, estorno é
`INCOME`, e **pagar a fatura é uma transferência para o cartão** — o pagamento
quita a fatura em vez de entrar nela. O saldo negativo do cartão *é* a dívida, e
é isso que faz o limite disponível sair certo sem contar compras não faturadas e
faturas em aberto duas vezes.

**Compra parcelada** (`/lancamentos/parcelado`). Cria um `InstallmentPlan` e
**uma `Transaction` por parcela**, não um lançamento com um campo "12x". A razão
é o extrato: R$ 1.200 em 12x não tiraram R$ 1.200 do mês um, tiraram R$ 100.
Com uma linha por parcela, saldo, orçamento e fatura veem o valor certo sem
nenhum deles precisar saber que parcelamento existe. No cartão, as parcelas
seguem o ciclo de fechamento; fora dele, o mês civil.

**Etiquetas e anexos.** A categoria diz *que tipo* de gasto é; a etiqueta diz *a
que ele se refere* (a viagem, a obra). O anexo é o comprovante. A tabela que liga
etiqueta a lançamento carrega `spaceId` e usa chave estrangeira composta: sem
isso, nada no banco impediria colar a etiqueta de um espaço num lançamento de
outro.

**Investimentos e patrimônio** (`/investimentos`, `/relatorios`). Posições,
alocação por tipo e a evolução do patrimônio no tempo. Duas armadilhas, ambas
tratadas:

- O patrimônio **soma a carteira** aos saldos. Sem isso, quem investe veria o
  próprio patrimônio encolher a cada aporte.
- O saldo de uma conta de investimento é o dinheiro **ainda não aplicado**; as
  posições são a parte **já aplicada**. Se a compra virou posição mas ninguém
  lançou a saída do dinheiro, o mesmo dinheiro conta duas vezes — a tela avisa
  quando esse padrão aparece.

A evolução no tempo precisa ser **registrada** (`NetWorthSnapshot`), não
calculada depois: a cotação que uma posição tinha em março some no instante em
que ela é atualizada em abril.

## Regras que valem para o projeto inteiro

### 1. Dinheiro é inteiro em centavos

Nunca `Float`, nunca `Decimal`, nunca `number` com casas decimais. Todo campo e
variável de dinheiro termina em `Cents`. Ver `src/lib/money.ts`.

Motivo: `0.1 + 0.2 !== 0.3` em ponto flutuante. Num app financeiro isso vira
centavo perdido no extrato.

> **A única exceção é `Holding.quantity`**, e ela confirma a regra: quantidade
> de cotas **não é dinheiro**. Cripto tem 8 casas decimais e fundo tem cota
> quebrada; arredondar isso para centavo destruiria a posição. Por isso ela é
> `Float` e não termina em `Cents`. O dinheiro continua inteiro: o produto
> quantidade × preço é arredondado ao centavo **uma vez só**, em
> `valueHolding()`, e nunca acumulado.

Quando um total precisa ser repartido — shares de uma despesa, parcelas de uma
compra —, use `splitEvenly` / `splitByWeights`. Elas garantem que a soma das
partes é exatamente o total. Não reimplemente a distribuição do centavo que
sobra: `installments.ts` reusa `splitEvenly` justamente por isso.

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

### 6. O backup são DUAS coisas

O banco é um arquivo só, mas os comprovantes anexados **não ficam nele** — ficam
em disco, sob `ATTACHMENTS_DIR` (padrão `./data/anexos`). Blob em SQLite
incharia o arquivo e tornaria cada backup uma cópia de tudo de novo.

Então: **backup = o arquivo do banco + a pasta de anexos.** Restaurar só o banco
devolve lançamentos apontando para comprovantes que não existem mais (a tela
responde 410, em vez de quebrar). Ver `docs/DEPLOY.md`.

### 7. Erros nunca vazam detalhe interno

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
    (app)/               telas autenticadas (painel, lançamentos, acerto,
                         cartões, investimentos, relatórios, vila…)
    entrar/ criar-conta/ autenticação
    layout.tsx           fonte + tema antes da primeira pintura
    globals.css          ⭐ tokens de cor, tipografia e superfícies
    api/anexos/[id]/     entrega de comprovante (autoriza antes de ler)
  components/
    ui/                  primitivas (Button, Field, Money, Avatar…)
    app/                 casca (sidebar, nav mobile, seletor de espaço)
    transactions/        lançamento, divisão, parcelamento, etiquetas, anexos
    investments/         carteira e patrimônio
    dashboard/ planning/ catalog/ settings/ settlement/ recurrences/ reports/
    village/             mapa isométrico (só desenha; não calcula nada)
  lib/
    money.ts             ⭐ centavos, parsing pt-BR/en-US, divisão sem perda
    split.ts             ⭐ cálculo dos shares por modo de divisão
    settlement.ts        ⭐ saldos e transferências mínimas
    date.ts              ⭐ competências e meia-noite UTC
    credit-card.ts       ⭐ ciclos de fatura, faturas e limite
    installments.ts      ⭐ parcelas que somam exatamente o total
    investments.ts       ⭐ avaliação da carteira e patrimônio líquido
    attachments.ts       política de anexos (limites, tipos aceitos)
    auth/                senha (Argon2id), sessão, rate limit, guardas
    validation/          schemas Zod
    presets.ts           categorias, contas e paleta validada
    village/             ⭐ a vila: catálogo, crescimento, projeção do ledger
  server/
    queries/             leitura (saldos, painel, acerto, vila, fatura, carteira)
    actions/             escrita (Server Actions)
    storage.ts           anexos em disco (a única coisa fora do banco)
  middleware.ts          redirecionamento e checagem de origem (não é a
                         fronteira de segurança — ver docs/SEGURANCA.md)
tests/                   testes da lógica financeira (o que não pode errar)
```

Os arquivos marcados com ⭐ concentram a lógica que não pode estar errada.
Todos têm testes. **Mexeu neles, rode `npm test`.**

Em `lib/village/`, os dois que importam são `growth.ts` (a regra
anti-inflação) e `projection.ts` (em qual prédio cada categoria cai).

Em `credit-card.ts`, o que não pode errar é a **borda do dia de fechamento**
(`statementInclusive`): ela decide se a compra feita no dia em que a fatura
fecha entra nessa fatura ou na próxima. Errá-la move lançamentos inteiros de
uma fatura para outra sem dar erro nenhum.

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
| Prisma + SQLite | um arquivo, zero configuração. Migrar para Postgres está documentado em `docs/DEPLOY.md` |
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
