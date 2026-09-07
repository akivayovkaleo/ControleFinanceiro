# Progresso da unificação — ControleFinanceiro

## Status atual

**Unificação concluída.** O app roda de ponta a ponta, com as funcionalidades
úteis do repositório `-drizzle` incorporadas à raiz.

- `npm run check` → typecheck limpo + **242 testes passando** (16 arquivos)
- `npm run build` → **26 rotas**, build de produção sem erro
- Todas as 14 telas autenticadas testadas via HTTP com sessão real: **200**
- Sem sessão, todas redirecionam para `/entrar` (307)

Não há nada bloqueado esperando decisão. O que ficou de fora está em
"Pendente", com o motivo.

---

## O achado que mudou o plano

O briefing descrevia o `-drizzle` como a versão "mais avançada", com espaços
compartilhados, convite por código, 4 modos de divisão, acerto de contas e PWA.

**Essas funcionalidades estavam na raiz, não no `-drizzle`.** Verificado no
código antes de mover qualquer coisa:

| Requisito inegociável | Raiz (Prisma) | `-drizzle` |
|---|---|---|
| Múltiplos usuários com contas próprias | ✅ | ✅ |
| **Dados isolados por padrão** | ✅ `Space` PERSONAL/SHARED | ⚠️ só por `userId` |
| **Espaços compartilhados** | ✅ `Space`, `Membership` | ❌ não existe |
| **Convite por código** | ✅ `Invite`, `lib/invite-code.ts` | ❌ não existe |
| **4 modos de divisão** | ✅ `SplitMode`, `TransactionShare` | ❌ não existe |
| **Acerto de contas** | ✅ `Settlement`, `/acerto` | ❌ não existe |
| **PWA** | ✅ `manifest.webmanifest` | ❌ `public/` só tinha `.gitkeep` |
| Testes | ✅ 148 passando | 5 scripts avulsos |

O schema do `-drizzle` tinha 17 tabelas, todas escopadas por `userId`, sem
nenhum conceito de espaço, divisão ou partilha. Migrar por cima da raiz teria
apagado exatamente os requisitos marcados como inegociáveis.

Você confirmou a inversão. **A raiz virou a base; o `-drizzle`, fonte de
funcionalidades.**

---

## Concluído

- [x] **Etapa 1 — comparação dos dois lados.** Commit `e77f3a8`.
- [x] **Etapa 2 — decisões colhidas** (direção, vila, prioridades, IA).
- [x] **Etapa 3 — cartão de crédito e parcelamento (lógica).** `d8732e1`
      `lib/credit-card.ts`, `lib/installments.ts`, schema e migration.
      44 testes novos.
- [x] **Etapa 4 — investimentos e patrimônio.** `24e07d3`, `83f6e7b`
      `lib/investments.ts`, `Holding`, `NetWorthSnapshot`, tela
      `/investimentos`. 25 testes novos.
- [x] **Etapa 5 — telas do cartão.** `ebaabf7` — `/cartoes` e `/cartoes/[id]`.
- [x] **Etapa 6 — compra parcelada (UI).** `c6d7e7a` — `/lancamentos/parcelado`
      com prévia das parcelas antes de salvar.
- [x] **Etapa 7 — relatórios.** `d5f2bd0` — `/relatorios` com evolução do
      patrimônio.
- [x] **Etapa 8 — etiquetas.** `e3d513a`, `1eb2e20` — modelo, gerenciador e
      seletor no formulário.
- [x] **Etapa 9 — anexos.** `2d0651e`, `25225af` — comprovante em disco, rota
      de entrega autorizada. 25 testes novos.
- [x] **Etapa 10 — documentação.** `c9c0927` — CLAUDE.md, DEPLOY.md,
      docker-compose.
- [x] **Etapa 11 — clone do `-drizzle` removido.** O repositório original
      continua no GitHub; nada se perdeu.

---

## O que foi migrado, e de onde

| Funcionalidade | Origem | O que mudou na adaptação |
|---|---|---|
| Ciclos de fatura e limite | `domain/credit-card.ts` | Datas viraram `Date` em meia-noite UTC (regra 3), não string ISO |
| Parcelamento | `domain/installments.ts` | Reusa `splitEvenly` em vez de reimplementar a distribuição do centavo |
| Carteira e patrimônio | `domain/networth.ts` | Cores saem da `PALETTE` validada (regra 5); escopado por space |
| Etiquetas | `db/schema.ts` (tags) | `spaceId` + chave estrangeira composta, no lugar de `userId` |
| Anexos | `domain/attachments.ts` | Mesma política; armazenamento e rota de entrega escritos do zero |
| Relatórios | `server/reports.ts` | **Quase nada portado** — ver abaixo |

### O que foi descartado, e por quê

- **O SQL de relatórios (`server/reports.ts`, 262 linhas).** Saldos, fluxo
  mensal e quebra por categoria já existiam em `queries/dashboard.ts` e
  `queries/accounts.ts`, com Prisma e escopados por space. Portar seria
  duplicar código pior. Só a **evolução do patrimônio** era nova, e foi feita.
- **Planos de assinatura (`domain/plans.ts`).** O app é gratuito — a raiz já
  tinha removido a seção de preços no commit `781680e`.
- **next-auth + bcryptjs.** A raiz já tem Argon2id (recomendação OWASP) e
  sessão em cookie assinado **e** em tabela, revogável na hora. Trocar seria
  regressão.
- **O motor de vila em canvas (~3.950 linhas).** Decisão sua: manter a vila da
  raiz, que tem a regra anti-inflação testada. O motor do `-drizzle` cresce por
  valor gasto e é individual; adotá-lo exigiria reescrever o crescimento e
  adaptar a espaços compartilhados.
- **Assistente de IA (`server/ai/`, 548 linhas).** Adiado para depois do beta:
  precisa de chave da Anthropic e tem custo por uso.
- **O schema individual inteiro.** Ele não tem espaços; adotá-lo era o oposto
  do requisito.

---

## Como cada coisa foi verificada

Nada foi marcado como pronto só porque compilou. Além dos 242 testes:

- **Cartão** — banco real: a compra feita **no dia do fechamento** cai na fatura
  daquele mês e a do dia seguinte na próxima; um pagamento atrasado credita a
  fatura que ele quita, não a do mês em que foi feito; 3 parcelas caem em 3
  faturas distintas; nenhum lançamento aparece em duas faturas nem some de
  todas.
- **Parcelamento** — R$ 1.000,03 em 7x: a soma das parcelas bate com o total, os
  shares de cada parcela fecham com ela, a compra de 31/01 não prende as
  seguintes no dia 28, e apagar o plano leva as parcelas junto.
- **Investimentos** — a alocação fecha com o valor de mercado; o patrimônio soma
  a carteira; fotografar duas vezes no mesmo dia atualiza em vez de duplicar.
- **Etiquetas** — colar etiqueta de um espaço num lançamento de outro é
  **recusado pelo banco**, e continua recusado ao trocar o `spaceId` para tentar
  enganar as chaves.
- **Anexos** — travessia de caminho testada com um arquivo real plantado fora da
  pasta: recusada. Por HTTP: o anexo do espaço pessoal da Ana responde **404**
  para o Kaleo (404, e não 403, para não confirmar que existe); sem sessão,
  redireciona; as aspas do nome do arquivo são removidas do cabeçalho.
- **Requisitos de acesso** — 2 usuários, cada um com exatamente 1 espaço
  pessoal privado e o compartilhado em comum; senha em Argon2id; convite por
  código funciona com o código digitado torto, o código errado não entra, o
  convite usado não serve de novo, e quem entra **não vê o espaço pessoal de
  quem convidou**.
- **App rodando** — as 14 telas autenticadas responderam 200 com sessão real, e
  307 para `/entrar` sem sessão.

---

## Requisitos de acesso: onde cada um está atendido

| Requisito | Situação |
|---|---|
| É um site, acessível pelo navegador | ✅ Next.js, responsivo (sidebar no desktop, nav inferior no celular) |
| Funciona no celular e no computador | ✅ layout adaptativo em todas as telas novas |
| PWA continua funcionando | ✅ `manifest.webmanifest` intacto, `display: standalone` |
| Contas individuais (você, sua namorada, seu pai) | ✅ cadastro + login; `DISABLE_SIGNUP=true` fecha depois |
| Dados isolados por padrão | ✅ espaço pessoal criado no cadastro, com um membro só |
| Espaços compartilhados opcionais | ✅ criar espaço + convite por código |

---

## Decisões tomadas

- **A raiz é a base.** É a única que atende os requisitos inegociáveis, a única
  que compilava e tinha testes, e é o `.git` que você quer manter.
- **Pagamento de fatura continua sendo transferência**, não modelo próprio. O
  saldo negativo do cartão já é a dívida, e isso faz o limite disponível sair
  certo sem contar compras não faturadas e faturas em aberto duas vezes. Só foi
  preciso `statementCloseDate` para saber qual fatura um pagamento atrasado
  quita.
- **Cada parcela é uma `Transaction`.** Uma compra de R$ 1.200 em 12x não tirou
  R$ 1.200 do mês um. Com uma linha por parcela, saldo, orçamento e fatura veem
  o valor certo sem nenhum deles saber que parcelamento existe.
- **`Holding.quantity` é `Float`** — e é a única exceção à regra do centavo,
  porque quantidade de cotas não é dinheiro (cripto tem 8 casas). O dinheiro
  continua inteiro: o produto quantidade × preço é arredondado uma vez só.
- **`statementInclusive` é configurável por cartão.** Itaú e Bradesco incluem a
  compra do dia do fechamento; o Nubank empurra para a seguinte. A escolha muda
  o valor de duas faturas de uma vez sem dar erro nenhum, então é explícita.
- **Anexos em disco, não no banco.** Blob em SQLite incharia o arquivo e faria
  cada backup copiar tudo de novo.

---

## ⚠️ Mudança importante para você: o backup agora são DUAS coisas

Antes: backup = copiar o arquivo do banco.
**Agora: o arquivo do banco + a pasta de anexos (`ATTACHMENTS_DIR`).**

Restaurar só o banco devolve lançamentos apontando para comprovantes que não
existem mais. O app não quebra (a tela responde 410 no lugar do arquivo), mas o
comprovante se perdeu. O script pronto está em `docs/DEPLOY.md`; no Docker os
dois já ficam no mesmo volume, de propósito.

---

## Benchmark contra o mercado

Feito em 07/09/2026. Funcionalidades dos concorrentes levantadas por pesquisa
(fontes no fim da seção); as do nosso app foram **testadas**, não lidas.

### Antes de tudo: uma correção na lista de referência

**O GuiaBolso não existe mais.** Foi desligado em novembro de 2022 e absorvido
pelo PicPay. Não dá para comparar com ele — comparo com o PicPay onde faz
sentido.

**O Warren é outra categoria.** É corretora e gestora com wealth management
(taxa de 0,7% a 0,9% ao ano sobre patrimônio), não app de controle financeiro.
Ele mostra a carteira que ele mesmo custodia; não serve para acompanhar
dinheiro que está em outro lugar. Comparar as duas coisas seria injusto nos
dois sentidos.

### Comparação funcionalidade a funcionalidade

Legenda: ✅ tem · ⚠️ tem parcial · ❌ não tem · 💰 só pagando

| Funcionalidade | **Nosso** | Mobills | Organizze | Minhas Economias | LAPI | PicPay |
|---|---|---|---|---|---|---|
| **RENDA** ||||||
| Registrar receita com categoria | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Receita recorrente (salário) | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Recorrência entra **sozinha** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Renda variável (freelance) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Meta/planejamento de receita** | ❌ | ✅ | ⚠️ | ✅ | ⚠️ | ❌ |
| Importação automática (Open Finance) | ❌ | ✅ | 💰 | ✅ | ❌ | ✅ |
| **ORÇAMENTO** ||||||
| Orçamento mensal por categoria | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Alerta ao estourar | ⚠️ visual | ✅ | ✅ | ✅ | ✅ | ❌ |
| Notificação (push/e-mail) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Copiar orçamento do mês anterior | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| Subcategorias | ❌ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| Mês financeiro ≠ mês civil | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| **INVESTIMENTOS** ||||||
| Cadastrar posições | ✅ | ⚠️ | ❌ | ⚠️ | ❌ | ⚠️ |
| Tipos de ativo | ✅ 7 tipos | ⚠️ | ❌ | ⚠️ | ❌ | ⚠️ |
| Alocação por tipo | ✅ | ⚠️ | ❌ | ❌ | ❌ | ⚠️ |
| Rentabilidade (custo × mercado) | ✅ | ⚠️ | ❌ | ❌ | ❌ | ✅ |
| **Cotação automática** | ❌ manual | ⚠️ | ❌ | ❌ | ❌ | ✅ |
| **Proventos/dividendos** | ❌ | ⚠️ | ❌ | ❌ | ❌ | ⚠️ |
| Evolução do patrimônio no tempo | ✅ | ⚠️ | ❌ | ⚠️ | ❌ | ⚠️ |
| Patrimônio = contas + carteira − dívidas | ✅ | ⚠️ | ❌ | ❌ | ❌ | ⚠️ |
| **CARTÃO** ||||||
| Fatura com ciclo de fechamento | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Borda do fechamento configurável | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Compra parcelada | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Limite disponível | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| **FAMÍLIA / MULTIUSUÁRIO** ||||||
| Mais de uma conta de pessoa | ✅ | 💰 | 💰 | ⚠️ | ✅ | ❌ |
| Espaço compartilhado + espaço privado | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Divisão de despesa (4 modos)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Acerto de contas ("quem deve a quem")** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **OUTROS** ||||||
| Anexar comprovante | ✅ | 💰 | 💰 | ⚠️ | ✅ | ❌ |
| Etiquetas livres | ✅ ilimitadas | 💰 | ⚠️ | ⚠️ | ✅ | ❌ |
| Relatórios | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Gamificação | ✅ a vila | ❌ | ❌ | ❌ | ❌ | ❌ |
| Preço | **grátis, self-hosted** | 💰 | R$ 32,90/mês | grátis | grátis limitado | grátis |
| Dados ficam com você | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |

> Sobre os investimentos do Mobills, as fontes divergem: uma diz que o app de
> controle de gastos não tem aba de carteira, outra diz que ele mostra
> aplicações e rentabilidade no mesmo painel. O que é certo é que o "Mobills
> Investimentos" é **produto separado** (corretora com robô de aporte). Por isso
> o ⚠️ em vez de ✅.

### O que eu testei de verdade no nosso app

Montei um cenário de 3 meses: salário de R$ 6.500 recorrente, dois freelances
variáveis (R$ 1.200 e R$ 2.450), aportes mensais para a corretora, e quatro
posições (Tesouro IPCA+, CDB, PETR4, HGLG11).

**O que funcionou:**

- Renda dos 3 meses: **R$ 23.150,00** — bate exatamente com o esperado.
- Saldos derivados corretos: conta corrente R$ 18.685,00, corretora R$ 200,00.
- Carteira: custo R$ 4.265,00, mercado R$ 4.577,50, resultado **+7,33%**.
- Alocação fecha ao centavo com o valor de mercado.
- Patrimônio = dinheiro + investido, conferido contra a soma manual.
- **Aportado (R$ 4.465) = aplicado (R$ 4.265) + parado (R$ 200).** Nada
  duplicou nem sumiu.
- O aviso de "dinheiro parado na corretora" disparou certo com os R$ 200.
- **A recorrência do salário entrou sozinha** ao abrir o app — `(app)/layout.tsx`
  materializa o que está vencido. (Eu ia registrar isto como falha e estava
  errado; conferi antes.)

**O que quebrou:**

🔴 **O patrimônio infla em silêncio.** Cadastrei uma posição de R$ 5.000 sem
lançar a saída do dinheiro — o erro que qualquer pessoa comete numa terça-feira
corrida. O patrimônio subiu de R$ 29.962,50 para **R$ 34.962,50**. Cinco mil
reais que nunca existiram, sem um aviso sequer.

O aviso que existe (`getUninvestedCash`) só olha saldo **positivo** parado na
conta de investimento. Ele não compara o **custo da carteira** com o dinheiro
que de fato entrou na corretora. São erros opostos, e só um é detectado.

Isso importa mais aqui do que importaria em outro app: o objetivo declarado é
acompanhar patrimônio **de forma confiável**. Um número que infla sozinho ensina
exatamente a coisa errada — é o mesmo problema que a regra anti-inflação da vila
existe para evitar, mas no lugar onde dói mais.

### Onde nós já somos melhores

1. **Divisão de despesa e acerto de contas.** Nenhum dos seis faz isso
   nativamente. O LAPI tem compartilhamento familiar com chat, mas não responde
   "a Ana me deve R$ 2.184,41". Para um casal, essa é *a* pergunta.
2. **Espaço pessoal + compartilhado ao mesmo tempo.** O presente de aniversário
   dela não aparece para ela. Os concorrentes são "tudo junto" ou "tudo
   separado".
3. **Patrimônio que soma contas + carteira − dívidas.** Nos outros, ou não
   existe, ou investimento e gasto vivem em telas que não se falam.
4. **A borda do dia de fechamento configurável.** Parece detalhe; é a diferença
   entre a fatura bater ou não com a do banco. Nenhum concorrente expõe isso.
5. **Preço e propriedade.** Organizze cobra R$ 32,90/mês; Mobills e LAPI cobram
   pelos recursos que aqui são padrão (anexo, etiqueta, multiusuário). Para três
   pessoas, isso é ~R$ 1.200/ano. E o dado fica no seu servidor.
6. **A vila.** Nenhum concorrente gamifica, e o que temos premia *organizar*, não
   gastar.

### Onde eles são melhores, e quanto isso dói

| Gap | Dói quanto | Por quê |
|---|---|---|
| **Cotação manual** | 🔴 alto | Com 4 posições dá para atualizar à mão. Com 15, você para de atualizar — e aí o patrimônio vira ficção. É o gap que mata o uso a longo prazo. |
| **Sem proventos/dividendos** | 🟠 médio | Seu objetivo é *construir renda*. Renda passiva de FII/ação é exatamente isso, e hoje não dá para responder "quanto essa posição me pagou". |
| **Sem Open Finance** | 🟠 médio | Digitar tudo à mão é o motivo nº 1 de abandono de app financeiro. Mas é decisão consciente (o LAPI faz igual, por privacidade). |
| **Sem notificação** | 🟠 médio | Orçamento estourado que ninguém vê não muda comportamento. Para o seu pai, ver só quando abre o app é fraco. |
| **Sem meta de receita** | 🟡 baixo-médio | O orçamento é só de despesa (`kind: 'EXPENSE'`). Não dá para dizer "quero faturar R$ 9.000 este mês" e acompanhar. |
| **Sem subcategoria** | 🟡 baixo | Etiquetas cobrem boa parte do caso. |

### Veredito

**Para o beta de setembro com você, sua namorada e seu pai: está bom o
suficiente — com uma ressalva que eu corrigiria antes de convidar seu pai.**

O núcleo é sólido e, em alguns pontos, melhor que o mercado: os números batem, a
divisão e o acerto não existem em nenhum concorrente, o patrimônio consolida
contas e carteira, e não custa R$ 1.200/ano para três pessoas.

**A ressalva não é "falta feature", é "o número mente".** O patrimônio inflar em
silêncio quando você esquece de lançar a compra é o tipo de erro que corrói a
confiança devagar: você olha, acha estranho, não sabe explicar, e para de olhar.
Num app cujo propósito é tornar o progresso *tangível e mensurável*, um número em
que não dá para confiar é pior do que não ter o número.

**O que vai fazer alguém desistir, em ordem:**

1. **Cotação manual** — não é chato no primeiro mês; é insustentável no sexto.
   Sem isso, a curva de patrimônio para de significar alguma coisa.
2. **Patrimônio que infla sozinho** — corrói a confiança sem dar sinal.
3. **Digitação manual de tudo** — o risco clássico. Aqui é mitigado pelas
   recorrências (que já entram sozinhas) e pelo parcelamento, mas continua sendo
   o maior atrito para o seu pai.

Nada disso impede o beta. Os dois primeiros mudam a ordem do que falta fazer —
já reordenei a lista de pendências abaixo.

### Fontes

- [TechTudo — 10 apps de controle financeiro para 2026](https://www.techtudo.com.br/listas/2026/01/10-apps-de-controle-financeiro-para-cuidar-melhor-do-dinheiro-em-2026-edapps.ghtml)
- [iDinheiro — 15 melhores apps de controle financeiro para 2026](https://www.idinheiro.com.br/financaspessoais/app-controle-financeiro-pessoal-gratis/)
- [Organizze — site oficial](https://financas.organizze.com.br/)
- [Organizze — controle de gastos com cartão](https://www.organizze.com.br/blog/controle-de-gastos/app-controle-de-gastos-cartao-de-credito)
- [Minhas Economias — como funciona](https://minhaseconomias.com.br/como-funciona)
- [LAPI — app de gestão financeira pessoal e familiar](https://lapiapp.com/en/)
- [Mobills — site oficial](https://www.mobills.com.br/)
- [Mobills Investimentos — plataforma separada com IA](https://www.mobills.com.br/noticias/mobills-investimentos-lanca-plataforma-com-inteligencia-artificial-para-aplicacoes-personalizadas/)
- [Warren — investimentos e gestão patrimonial](https://warren.com.br/)
- [PicPay — encerramento do Guiabolso](https://blog.picpay.com/picpay-desliga-guiabolso/)
- [Seu Dinheiro — app Guiabolso será encerrado](https://www.seudinheiro.com/2022/empresas/app-guiabolso-sera-encerrado-apos-conclusao-da-integracao-com-o-picpay-em-novembro-julw/)
- [Zapgastos — Mobills ou Organizze em 2026](https://zapgastos.com/blog/mobills-ou-organizze/)

---

## Pendente

Reordenado depois do benchmark. Os dois primeiros saíram do benchmark e passaram
na frente do que estava listado antes.

### Antes do beta (saíram do benchmark)

- [ ] 🔴 **Reconciliar a carteira com o dinheiro que entrou.** Comparar o custo
      das posições de uma conta com o que de fato foi transferido para ela, e
      avisar quando não bater. Hoje o patrimônio infla em silêncio se você
      esquecer de lançar a compra — testado: subiu R$ 5.000 sem aviso.
      É confiança no número, não funcionalidade.
- [ ] 🔴 **Atualizar cotação sem ser uma a uma.** Com 4 posições dá; com 15 você
      para de atualizar e a curva de patrimônio vira ficção. Não precisa ser
      integração de mercado no beta — uma tela "atualizar todas" já resolve o
      atrito imediato.

### Depois do beta

- [ ] 🟠 **Proventos e dividendos ligados à posição.** Seu objetivo é construir
      renda; renda passiva de FII/ação é exatamente isso, e hoje não dá para
      responder "quanto essa posição me pagou".
- [ ] 🟠 **Notificação de orçamento estourado.** Orçamento que só aparece quando
      alguém abre o app não muda comportamento — vale principalmente para o seu
      pai.
- [ ] 🟠 **Cartão e investimentos no painel.** As telas existem, mas o `/painel`
      não mostra fatura aberta nem patrimônio investido. O benchmark reforçou:
      é onde a pessoa olha primeiro.
- [ ] 🟡 **Meta de receita.** O orçamento é só de despesa (`kind: 'EXPENSE'`).
      Não dá para dizer "quero faturar R$ 9.000 este mês" e acompanhar.
- [ ] **Service worker (PWA offline).** Hoje existe o manifest — o app instala
      na tela inicial e abre em janela própria. Falta o service worker para
      funcionar sem rede.
- [ ] **Editar uma compra parcelada.** Hoje dá para criar e apagar em bloco;
      editar exige apagar e refazer.
- [ ] **`docs/MODELO-DE-DADOS.md` e `docs/PRODUTO.md`** não descrevem as tabelas
      e telas novas. `CLAUDE.md` e `docs/DEPLOY.md` estão atualizados.
- [ ] **Assistente de IA.** Adiado por decisão sua; precisa de chave da
      Anthropic e tem custo por uso.
- [ ] **Enriquecer a vila visualmente.** Decisão sua foi manter a atual e
      melhorar depois. A regra anti-inflação continua fixada em
      `tests/village-growth.test.ts`.

### Decisões conscientes, não pendências

- **Sem Open Finance.** Exigiria credencial bancária ou um agregador pago, e o
  app é self-hosted. O LAPI faz a mesma escolha pelo mesmo motivo. As
  recorrências (que entram sozinhas) e o parcelamento cobrem boa parte do que a
  importação automática resolveria.
- **Sem subcategoria.** As etiquetas cobrem o caso de uso sem criar uma segunda
  hierarquia para manter.

## Pontos que precisam da minha decisão (Kaleo)

Nenhum em aberto.

---

## Commits desta unificação

| # | Commit | O quê |
|---|---|---|
| 1 | `e77f3a8` | Mapeia os dois repositórios antes de unificar |
| 2 | `d8732e1` | Cartão de crédito e compras parceladas |
| 3 | `c0c548e` | Atualiza o progresso |
| 4 | `24e07d3` | Investimentos e patrimônio líquido |
| 5 | `83f6e7b` | Tela de investimentos |
| 6 | `ebaabf7` | Telas de cartão: fatura, limite, navegação |
| 7 | `0e2ccdb` | Atualiza o progresso |
| 8 | `c6d7e7a` | Compra parcelada: plano, parcelas e prévia |
| 9 | `d5f2bd0` | Relatórios e evolução do patrimônio |
| 10 | `e3d513a` | Etiquetas |
| 11 | `1eb2e20` | Etiquetas no lançamento |
| 12 | `2d0651e` | Anexos: comprovante no lançamento |
| 13 | `c9c0927` | Documentação alinhada |
| 14 | `25225af` | CSP mais apertado só para os anexos |

## Última atualização

07/09/2026 — Benchmark contra o mercado concluído. Núcleo aprovado para o beta,
com dois itens promovidos para "antes do beta": reconciliar a carteira com o
dinheiro que entrou, e atualizar cotações sem ser uma a uma.

Estado do código inalterado desde a unificação: 242 testes passando, typecheck
limpo, build com 26 rotas.
