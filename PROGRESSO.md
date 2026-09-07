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

## Pendente

Nada disso bloqueia o uso diário.

- [ ] **Service worker (PWA offline).** Hoje existe o manifest — o app instala
      na tela inicial e abre em janela própria. Falta o service worker para
      funcionar sem rede. É a única parte de "PWA" que não está pronta.
- [ ] **Assistente de IA.** Adiado por decisão sua; precisa de chave da
      Anthropic e tem custo por uso.
- [ ] **Enriquecer a vila visualmente.** Decisão sua foi manter a atual e
      melhorar depois. A regra anti-inflação continua fixada em
      `tests/village-growth.test.ts`.
- [ ] **Cartão e investimentos no painel.** As telas existem, mas o `/painel`
      ainda não mostra fatura aberta nem patrimônio investido.
- [ ] **Editar uma compra parcelada.** Hoje dá para criar e apagar em bloco;
      editar exige apagar e refazer.
- [ ] **`docs/MODELO-DE-DADOS.md` e `docs/PRODUTO.md`** não descrevem as tabelas
      e telas novas. `CLAUDE.md` e `docs/DEPLOY.md` estão atualizados.
- [ ] **Cotação automática de investimentos.** O preço é atualizado à mão, na
      própria linha da posição.

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

Unificação concluída. 242 testes passando, typecheck limpo, build com 26 rotas,
14 telas verificadas por HTTP. Clone do `-drizzle` removido.
