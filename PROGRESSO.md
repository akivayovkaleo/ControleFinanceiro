# Progresso da unificação — ControleFinanceiro

## Status atual

Etapa 1 (comparação dos dois lados) **concluída**. Aguardando decisão do Kaleo
sobre a direção da migração — ver "Pontos que precisam da minha decisão".

Nenhum código foi movido ainda. A raiz continua intacta e funcionando.

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

## Pendente

- [ ] Etapa 2 — plano de migração detalhado (depende da decisão abaixo)
- [ ] Etapa 3 — portar cartão de crédito + parcelas
- [ ] Etapa 4 — portar investimentos / patrimônio líquido
- [ ] Etapa 5 — portar relatórios
- [ ] Etapa 6 — decidir e executar a vila
- [ ] Etapa 7 — anexos e tags
- [ ] Etapa 8 — service worker (PWA offline de verdade; hoje só há manifest)
- [ ] Etapa 9 — remover `ControleFinanceiro-drizzle/`
- [ ] Etapa 10 — relatório final

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

## Pontos que precisam da minha decisão (Kaleo)

1. **Direção da migração** — confirmar que a raiz é a base e o `-drizzle` é só
   fonte de funcionalidades. O briefing pedia o contrário, mas o contrário
   apaga espaços compartilhados, divisão e acerto.
2. **A vila** — manter a da raiz (SVG, regra anti-inflação testada) e enriquecer
   aos poucos, ou portar o motor canvas do `-drizzle` (5 épocas, personagens,
   interiores)? O motor do `-drizzle` cresce por valor/individual; casar isso
   com a regra anti-inflação e com espaços compartilhados é trabalho real.
3. **Assistente de IA** — portar? Precisa de chave da Anthropic e tem custo por
   uso. Não é necessário para o beta.

## Última atualização

Etapa 1 — comparação concluída. Sem commits de código ainda.
