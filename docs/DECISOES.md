# Decisões

Registro das escolhas com trade-off real, o que foi descartado e por quê. Se
você for mudar alguma destas, leia o motivo original antes.

---

## 1. Dinheiro é inteiro em centavos

**Decisão:** todo valor monetário é `Int` em centavos. Todo campo termina em
`Cents`.

**Por quê:** `0.1 + 0.2 !== 0.3` em ponto flutuante. Num app financeiro isso
vira centavo perdido no extrato e saldo que não fecha.

**Descartado:** `Decimal` do Prisma. Seria correto, mas no SQLite ele vira
string, e cada operação exige uma biblioteca de decimal. Inteiro é exato,
rápido e nativo em JS.

**Custo:** o valor máximo por lançamento é R$ 21.474.836,47 (limite do INTEGER
de 32 bits). Aceitável — quem movimenta mais que isso não usa este app.

---

## 2. Espaços em vez de "modo pessoal / modo casal"

**Decisão:** um espaço é um conjunto isolado de dados. A pessoa tem um pessoal e
quantos compartilhados quiser.

**Por quê:** a alternativa seria uma flag "esta despesa é compartilhada?" dentro
de um único conjunto de dados. Isso quebra em tudo: o saldo da conta mistura
dinheiro seu e do casal, os orçamentos ficam ambíguos, e não há como ter uma
conta bancária que só você vê.

**Consequência boa:** "sozinho" e "a dois" não são modos diferentes do app —
são espaços diferentes. O código é um só.

**Custo:** toda consulta precisa de `spaceId`. É verboso, mas é exatamente o que
torna a autorização trivial de auditar.

---

## 3. Transações apontam para `Membership`, não para `User`

**Decisão:** `paidByMembershipId` referencia `Membership`.

**Por quê:** se alguém sair do espaço, o histórico precisa continuar íntegro. Com
`onDelete: SetNull`, a referência vira nula e os valores não mudam. Apontar para
`User` significaria ou apagar lançamentos (reescrevendo o histórico do casal) ou
deixar um usuário sem acesso ainda referenciado.

---

## 4. Toda despesa gera `TransactionShare` — inclusive no espaço pessoal

**Decisão:** mesmo com um membro só, a despesa grava um share (100% dele).

**Por quê:** mantém **uma** regra ("o acerto lê shares") em vez de dois caminhos
que divergem com o tempo. Se o espaço pessoal não gerasse shares e um dia
virasse compartilhado, os dados antigos ficariam inconsistentes.

**Custo:** uma linha a mais por despesa. Irrelevante no volume de um casal.

---

## 5. Saldo é derivado, não materializado

**Decisão:** o saldo da conta é calculado a partir dos lançamentos, toda vez.

**Por quê:** um saldo materializado precisa ser mantido em toda criação, edição
e exclusão. Qualquer falha nesse caminho deixa um número errado na tela para
sempre — e o usuário não tem como saber que está errado.

**Custo:** três agregações por carregamento da tela de contas. Para milhares de
lançamentos, instantâneo. Se um dia virar problema, a solução é cache, não
desnormalizar.

---

## 6. SQLite, não PostgreSQL

**Decisão:** SQLite como padrão.

**Por quê:** o público é uma ou duas pessoas rodando na própria máquina ou num
VPS pequeno. SQLite é um arquivo: `npm install` e funciona, backup é `cp`, não
há serviço para subir nem senha de banco para gerenciar.

**Custo:** escrita concorrente é serializada (irrelevante para duas pessoas) e
não roda em plataformas serverless de filesystem efêmero.

**Saída:** migrar para Postgres é trocar o `provider` no schema e rodar as
migrations. Documentado em `docs/DEPLOY.md`.

---

## 7. Sem API REST — Server Components e Server Actions

**Decisão:** as telas leem direto do banco; a escrita é por Server Action.

**Por quê:** uma API HTTP entre a tela e o banco, num app usado por duas pessoas,
só adiciona latência, serialização e código para manter. Server Components
mantêm a lógica financeira no servidor, onde ela é auditável.

**Custo:** não há API para um app móvel nativo. Se um dia precisar, é uma camada
nova — as funções de `server/queries` já são o núcleo dela.

---

## 8. Sessão em cookie **e** em tabela

**Decisão:** o cookie carrega um JWT assinado + token opaco; a tabela `Session`
é a fonte de verdade.

**Por quê:** JWT puro não é revogável — continuaria válido até expirar, mesmo
depois de "sair de todos os dispositivos" ou de trocar a senha. Só banco
custaria uma consulta para toda requisição, inclusive cookies lixo.

Com os dois: o middleware descarta lixo na borda sem tocar no banco, e a
revogação é imediata.

---

## 9. Sem recuperação de senha por e-mail

**Decisão:** redefinição por linha de comando (`npm run senha -- email`).

**Por quê:** e-mail exige SMTP configurado. Numa instalação caseira essa
dependência costuma estar quebrada justo no dia em que se precisa dela — e um
botão "enviar link de recuperação" que não funciona é pior que a ausência dele.

**Custo:** perder a senha exige acesso ao servidor. Para o público-alvo (quem
instalou o app, ou o parceiro dessa pessoa), é aceitável — e está explicado na
tela `/ajuda/senha`.

---

## 10. Recorrências sem cron

**Decisão:** as ocorrências vencidas são materializadas quando alguém abre o app.

**Por quê:** cron externo num app self-hosted quebra em silêncio quando o
servidor reinicia, e a pessoa só descobre meses depois que o aluguel parou de
ser lançado.

**Como é seguro:** o cursor `nextRunAt` avança na mesma transação que cria os
lançamentos, então é idempotente. Teto de 60 ocorrências por execução, para
recorrência antiga esquecida.

**Custo:** se ninguém abrir o app por dois meses, os lançamentos aparecem todos
de uma vez no próximo acesso — com as datas corretas.

---

## 11. Divisão personalizada é reescalada, não recusada

**Decisão:** se o usuário digitar valores que não somam o total, reescalamos
proporcionalmente em vez de bloquear o salvamento.

**Por quê:** gravar shares que não somam o valor quebraria o acerto de contas —
o invariante mais importante do app. Entre recusar o formulário (frustrante,
principalmente no celular) e ajustar avisando, ajustar é melhor. A UI mostra a
diferença antes de salvar.

---

## 12. Interface em português, código em inglês

**Decisão:** rotas, textos, comentários e documentação em português. Nomes de
variáveis, funções e tipos em inglês.

**Por quê:** o app é para brasileiros; `/lancamentos` é mais claro que
`/transactions` para quem usa. Mas o código convive com bibliotecas em inglês, e
misturar `const saldoTotal = await db.transaction.findMany()` fica pior que
qualquer uma das duas opções puras.

---

## 13. Gráficos sem animação de entrada

**Decisão:** `isAnimationActive={false}` em todos os gráficos.

**Por quê:** a animação padrão do Recharts leva ~1,5s partindo do zero, deixando
o gráfico visualmente vazio no primeiro segundo. Num painel financeiro isso é o
oposto do que se quer — os números precisam estar lá quando a tela aparece.

---

## 14. Tema no `localStorage`, não no banco

**Decisão:** claro/escuro é preferência do dispositivo.

**Por quê:** a mesma pessoa pode querer escuro no celular à noite e claro no
notebook. Guardar no banco forçaria uma escolha só para os dois.

**Custo:** um script síncrono no `<head>` para aplicar antes da primeira
pintura, evitando o flash de tela clara.

---

## 15. Arquivar em vez de excluir

**Decisão:** categoria ou conta com lançamentos é arquivada, não excluída.

**Por quê:** excluir deixaria lançamentos órfãos e mudaria relatórios antigos
retroativamente. "Quanto gastei com transporte em março?" precisa dar a mesma
resposta hoje e daqui a um ano.

Só o que nunca foi usado pode ser removido de verdade.
