# Progresso da unificação — ControleFinanceiro

## Status atual

Decisões do Kaleo tomadas (ver "Decisões tomadas"). Migração em andamento com a
**raiz como base**.

Portando funcionalidades do `-drizzle` uma a uma. Cartão de crédito e parcelas
já entraram. Agora: investimentos e patrimônio líquido.

O app continua funcionando de ponta a ponta a cada commit — `npm run check`
passa (typecheck + 192 testes).

---

## Achado que muda o plano: os dois repositórios estão trocados no briefing

O briefing descreve `-drizzle` como a versão "mais recente e avançada", com
"espaços pessoais e compartilhados, convite por código, lançamentos com 4 modos
de divisão, acerto de contas, PWA".

**Essas funcionalidades estão na raiz, não no `-drizzle`.** Verificado no código:

| Requisito inegociável | Raiz (Prisma) | `-drizzle` |
|---|---|---|
| Múltiplos usuários com contas próprias | ✅ `model User` + sessão + Argon2id | ✅ `users` + next-auth |
| **Dados isolados por padrão** | ✅ `Space` PERSONAL/SHARED | ⚠️ só por `userId` — sem espaços |
| **Espaços compartilhados** | ✅ `Space`, `Membership`, `MemberRole` | ❌ não existe |
| **Convite por código** | ✅ `model Invite`, `lib/invite-code.ts` | ❌ não existe |
| **4 modos de divisão** | ✅ `enum SplitMode`, `TransactionShare` | ❌ não existe |
| **Acerto de contas** | ✅ `Settlement`, `SettlementLine`, `/acerto` | ❌ não existe |
| **PWA** | ✅ `public/manifest.webmanifest` | ❌ `public/` só tem `.gitkeep` |
| Testes | ✅ 148 passando (12 arquivos, vitest) | 5 scripts avulsos |
| Typecheck | ✅ limpo | ❌ não roda (deps não instaladas) |

O schema do `-drizzle` tem 17 tabelas, **todas escopadas por `userId`**, sem
nenhum conceito de espaço, divisão ou partilha. O próprio comentário do schema
diz que nenhuma consulta deve correr sem filtrar por utilizador.

Ou seja: migrar `-drizzle` por cima da raiz **apagaria** exatamente os
requisitos marcados como inegociáveis (namorada e pai com espaço compartilhado).

### O que o `-drizzle` tem de verdade, e que a raiz não tem

Ele não é a mesma app mais avançada — é uma app **individual** com outras
funcionalidades, várias delas valiosas:

| Funcionalidade | Onde | Linhas | Vale portar? |
|---|---|---|---|
| Cartão de crédito (fatura, ciclo) | `domain/credit-card.ts` | 324 | **sim** |
| Compras parceladas | `domain/installments.ts` | 88 | **sim** |
| Investimentos / patrimônio líquido | `domain/networth.ts` + `holdings` | 203 | **sim** (meta do Kaleo) |
| Relatórios | `server/reports.ts` | 262 | sim |
| Anexos e tags em lançamentos | `domain/attachments.ts`, `tags` | ~150 | talvez |
| Vila em canvas: 5 épocas, personagens, interiores, pathfinding | `engine/`, `render/`, `domain/catalog/` | ~3.950 | **decisão pendente** |
| Assistente de IA | `server/ai/` | 548 | **decisão pendente** (custo/chave) |
| Planos de assinatura | `domain/plans.ts` | — | **não** — o app é gratuito |
| Onboarding | `app/onboarding/` | — | sim, adaptado |

Comparação das vilas: raiz = 1.248 linhas (SVG, regra anti-inflação por
diversidade de categorias, fixada em 5 arquivos de teste).
`-drizzle` = 3.951 linhas (canvas isométrico, 5 épocas, personagem que anda,
interiores de prédio).

---

## Concluído

- [x] **Etapa 1 — comparação dos dois lados.** Estrutura, dependências,
      funcionalidades, schema e histórico de commits mapeados. Raiz validada:
      `npm test` = 148/148, `tsc --noEmit` = 0 erros no código próprio.
      (Os erros de typecheck que aparecem vêm do clone `ControleFinanceiro-drizzle/`
      aninhado, que o tsconfig da raiz está incluindo — some quando a pasta sair.)

- [x] **Etapa 2 — decisões do Kaleo colhidas.** Raiz é a base; vila da raiz
      mantida; portar cartão+parcelas, investimentos, relatórios, anexos+tags;
      IA fica para depois do beta.

- [x] **Etapa 3 — cartão de crédito e compras parceladas.** Commit `d8732e1`.
      - `src/lib/credit-card.ts` — ciclos de fatura, faturas, limite. Adaptado
        de string ISO para `Date` em meia-noite UTC (regra 3 do CLAUDE.md).
      - `src/lib/installments.ts` — parcelamento reusando `splitEvenly`, em vez
        de reimplementar a distribuição do centavo que sobra.
      - Schema: `Account.statementInclusive`, `model InstallmentPlan`,
        `Transaction.installmentPlanId/Number/Total/statementCloseDate`.
        Migration `20260907183204_cartao_de_credito_e_parcelas`.
      - 44 testes novos. Total: **192 passando**, typecheck limpo.

- [x] **Etapa 4 (parcial) — clone do `-drizzle` tirado de dentro do repositório.**
      Estava em `ControleFinanceiro-drizzle/` dentro da raiz, e o `tsconfig` da
      raiz o incluía no typecheck. Movido para `C:\Users\kaleo\_drizzle-source`
      enquanto ainda serve de fonte; apagar no fim.

- [x] **Etapa 5 — investimentos e patrimônio líquido.** Commits `24e07d3`, `83f6e7b`.
      - `src/lib/investments.ts` — avaliação de posição, alocação por tipo,
        patrimônio. Cores saem da `PALETTE` validada (regra 5), não literais.
      - Schema: `enum HoldingType`, `model Holding`, `model NetWorthSnapshot`.
        Migration `20260907183604_investimentos_e_patrimonio`.
      - `getNetWorth` agora **soma a carteira** — sem isso, quem investe veria
        o patrimônio encolher a cada aporte.
      - Tela `/investimentos`: posições, alocação, cotação editável na linha,
        aviso de dinheiro parado na corretora, botão de fotografar o patrimônio.
      - 25 testes novos + verificação contra o banco real (alocação fecha com o
        valor de mercado; fotografar duas vezes no mesmo dia não duplica).

- [x] **Etapa 6 — telas do cartão.** Commit `ebaabf7`.
      - `src/server/queries/cards.ts` + `/cartoes` e `/cartoes/[id]`.
      - Verificado contra o banco real: a compra do dia do fechamento cai na
        fatura certa, a do dia seguinte na próxima, um pagamento atrasado
        credita a fatura que quita, e 3 parcelas caem em 3 faturas distintas
        sem duplicar nem sumir.

## Pendente

- [ ] Etapa 7 — parcelamento no formulário de lançamento (a lógica e o schema já
      existem; falta a UI para criar um `InstallmentPlan`)
- [ ] Etapa 8 — anexos e tags nos lançamentos
- [ ] Etapa 9 — `/relatorios` (só falta a evolução do patrimônio: resumo do mês,
      mês a mês e quebra por categoria **já existem** na raiz — ver decisões)
- [ ] Etapa 10 — service worker (PWA offline de verdade; hoje só há manifest)
- [ ] Etapa 11 — apagar `C:\Users\kaleo\_drizzle-source`
- [ ] Etapa 12 — relatório final

## Decisões tomadas

- **A raiz é a base, não o `-drizzle`.** Motivo: é a única que atende os
  requisitos inegociáveis (espaços compartilhados, convite, divisão, acerto,
  PWA), é a única que compila e tem testes, e é o `.git` que o Kaleo quer manter.
  O `-drizzle` vira **fonte de funcionalidades a portar**, não a base.
- **Planos de assinatura descartados.** O app é gratuito — a raiz inclusive já
  removeu a seção de preços no commit `781680e`.
- **next-auth + bcryptjs descartados.** A raiz já tem Argon2id (recomendação
  OWASP) + sessão em cookie assinado e em tabela (revogável na hora), que é
  mais forte. Não há motivo para trocar.

- **A vila da raiz fica.** Kaleo escolheu manter a vila SVG com a regra
  anti-inflação (prédio sobe por diversidade de categorias, não por valor) e
  enriquecer o visual depois. O motor canvas do `-drizzle` cresce por valor e é
  individual — adotá-lo agora significaria reescrever crescimento e adaptar a
  espaços compartilhados, com o app parado no meio.
- **Assistente de IA fica para depois do beta.** Precisa de chave da Anthropic e
  tem custo por uso; não é necessário para o app ser usado todo dia.
- **Pagamento de fatura continua sendo uma transferência**, não um modelo
  próprio. O saldo negativo do cartão já é a dívida, e isso faz o limite
  disponível sair certo sem contar compras não faturadas e faturas em aberto
  duas vezes. Só foi preciso `statementCloseDate` para saber qual fatura um
  pagamento atrasado quita.

## Pontos que precisam da minha decisão (Kaleo)

Nenhum aberto no momento. (Os três anteriores foram respondidos: raiz como base,
vila da raiz mantida, IA adiada.)

- **Relatórios: quase tudo já existia.** O `reports.ts` do `-drizzle` é SQL
  bruto para saldos, fluxo mensal e quebra por categoria — as três coisas que
  `queries/dashboard.ts` e `queries/accounts.ts` já fazem aqui, com Prisma e
  escopadas por space. Portar seria duplicar. O único pedaço genuinamente novo
  da tela dele é a **evolução do patrimônio**, que depende do
  `NetWorthSnapshot` criado na etapa 5.

## Última atualização

Etapa 6 concluída — commit `ebaabf7`. Testes: 214 passando, typecheck limpo,
`npm run build` gera 24 rotas.
