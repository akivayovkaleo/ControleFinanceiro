# Modelo de dados

O schema comentado está em `prisma/schema.prisma`. Este documento explica as
relações e o raciocínio por trás delas.

## Diagrama

```
User ─┬─< Session
      ├─< AuditLog
      └─< Membership >─┬─ Space
                       │
Space ─┬─< Account ────┼──< Transaction >── Category
       ├─< Category    │         │
       ├─< Budget      │         ├──< TransactionShare >── Membership
       ├─< Goal ──< GoalContribution
       ├─< Recurrence  │
       ├─< Invite      │
       └─< Settlement ─┴──< SettlementLine >── Membership
```

## Identidade

### `User`
A conta de login: e-mail, nome, hash da senha. Guarda `lastSpaceId` só como
conveniência de UI (em qual espaço a pessoa estava).

### `Session`
Sessões persistidas para permitir **revogação**. Guarda o `tokenHash`
(SHA-256), nunca o token. `userAgent` alimenta a lista de "sessões ativas";
`ipHash` é só hash.

### `LoginAttempt`
Contador de tentativas por `sha256(email + ip)`. Fica no banco, não em memória,
porque o app pode rodar em mais de um processo e um contador em memória zeraria
a cada deploy — exatamente o que um atacante espera.

## Espaços

### `Space`
O contêiner de tudo. `type` é `PERSONAL` (criado no cadastro, um membro só) ou
`SHARED` (criado pelo usuário, compartilhável).

`monthStartDay` permite que o "mês financeiro" comece em outro dia — útil para
quem organiza as contas pela data do salário. Com `1` é o mês civil.

### `Membership`
A ligação usuário ↔ espaço, e a **unidade de autorização do app inteiro**.

Guarda dados que valem só naquele espaço:

- `displayName` — como a pessoa aparece ali (pode diferir do nome da conta)
- `color` — o principal sinal visual de "de quem é isto", repetido no extrato,
  no acerto e nos filtros
- `monthlyIncomeCents` — opcional, usado só na divisão proporcional
- `role` — `OWNER` gerencia membros e convites; `MEMBER` lança e edita

`@@unique([userId, spaceId])` garante que ninguém entra duas vezes no mesmo
espaço.

### `Invite`
Guarda o **SHA-256** do código; o código em claro aparece uma vez só. `codeHint`
são os 4 últimos caracteres, para o dono reconhecer o convite na lista.

Expira em 7 dias, serve uma vez, pode ser revogado.

## Catálogo

### `Account`
Onde o dinheiro fica. `openingBalanceCents` é quanto havia quando a conta passou
a ser controlada aqui — o saldo atual é derivado disso mais os lançamentos.

`ownerMembershipId` nulo significa **conta conjunta**; preenchido, é conta de uma
pessoa só. Isso é informativo (aparece na UI) e não afeta a divisão de despesas.

Campos de cartão (`creditLimitCents`, `statementDay`, `dueDay`) só valem quando
`type = CREDIT_CARD`; as actions zeram os outros casos.

### `Category`
`kind` separa receita de despesa — a mesma tela não deve oferecer "Salário" numa
despesa. `@@unique([spaceId, name, kind])` impede duplicatas.

`archived` é o que permite sumir da UI sem quebrar o histórico.

## Lançamentos

### `Transaction`
`amountCents` é **sempre positivo**; o sinal vem de `type`:

- `INCOME` — entra na conta
- `EXPENSE` — sai da conta
- `TRANSFER` — sai de `accountId` e entra em `toAccountId`. Não entra em
  receita/despesa nem em orçamentos: é dinheiro andando dentro do próprio casal.

`date` é a **competência**, gravada como meia-noite UTC (ver `src/lib/date.ts`).

`settlementId` preenchido significa que o lançamento já entrou num acerto
registrado — fica travado para edição e sai do saldo em aberto.

### `TransactionShare`
Quanto cada membro **deve** daquela despesa.

**Invariante:** as linhas somam exatamente `Transaction.amountCents`. A sobra de
arredondamento é distribuída de forma determinística (método do maior resto em
`splitByWeights`, primeiras posições em `splitEvenly`), com os membros ordenados
por id — mesma entrada, mesma saída, sempre.

Se essa ordenação não fosse estável, o centavo de resto mudaria de dono a cada
consulta e o total do acerto oscilaria.

Só despesas geram shares. Receita não é dívida de ninguém; transferência é
dinheiro do próprio casal mudando de lugar.

## Acerto

### `Settlement` e `SettlementLine`
O registro de uma quitação. `SettlementLine` guarda cada transferência
("Ana → Kaleo, R$ 2.184,41").

Registrar um acerto carimba `settlementId` nas despesas do período. Desfazer
solta o carimbo — as despesas voltam ao saldo em aberto.

Nada de dinheiro se move: o Pix acontece fora do app.

## Planejamento

### `Budget`
Limite por categoria por competência. A chave é
`@@unique([spaceId, categoryId, month])`, com `month` no formato `"YYYY-MM"`.

Guardar a competência como string em vez de data é deliberado: o limite é do
*mês*, não de um instante, e comparação de string é exata.

### `Goal` / `GoalContribution`
Objetivo de economia e os aportes. O quanto já foi juntado é a soma das
contribuições — de novo, derivado em vez de materializado.

Aportes são independentes do extrato: guardar dinheiro para uma meta não é uma
despesa.

### `Recurrence`
Modelo de lançamento que se repete. `nextRunAt` é o cursor: avança conforme as
ocorrências são materializadas, na mesma transação que as cria (o que torna a
operação idempotente).

Os lançamentos gerados guardam `recurrenceId`, então dá para ver quantos vieram
de cada recorrência — e apagar a recorrência não apaga o que já foi lançado.

## Auditoria

### `AuditLog`
Quem fez o quê, quando. Existe por causa do espaço compartilhado: quando alguém
pergunta "quem apagou o lançamento do aluguel?", a resposta precisa existir.

`meta` é um JSON com um resumo legível, limitado a 2000 caracteres. Registrar é
sempre melhor esforço — uma falha aqui nunca derruba a operação do usuário.

## Ao alterar o schema

```bash
npx prisma migrate dev --name descricao_curta
npm run check
```

Cuidados:

1. **Não troque um campo de dinheiro para Float.** Nunca.
2. **Toda tabela financeira nova precisa de `spaceId`** e do índice
   correspondente.
3. **Referências a pessoas apontam para `Membership`**, com `onDelete: SetNull`,
   para preservar o histórico.
4. Se mexer em shares ou divisão, rode `npm test` — o invariante da soma tem
   testes que pegam regressão.
