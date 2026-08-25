# Monetização — o que existe e o que falta

> **Status: decidido não monetizar por enquanto.** O app é gratuito e de
> código aberto, e a seção de preços foi removida da página de vendas de
> propósito — anunciar plano pago sem ter cobrança é enganar quem chega.
>
> Este documento fica como o mapa do que precisaria existir *se* essa decisão
> mudar. Nada aqui está construído.

## O que já existe (e ajuda se um dia mudar de ideia)

- **Página de vendas** (`/`) com proposta, três passos, recursos e perguntas
  frequentes. Serve de porta de entrada mesmo sem cobrar nada.
- **Cadastro fechável** (`DISABLE_SIGNUP`, `ALLOWED_EMAILS`) — já serve para um
  beta fechado ou lista de espera, sem escrever uma linha a mais.
- **Multi-inquilino de verdade**: espaços são isolados por consulta, não por
  tela escondida. É a base necessária para um SaaS, e ela já está pronta.

> A seção de preços e o arquivo `src/lib/planos.ts` existiram no commit
> `b4a1722` e foram removidos no seguinte. Para trazê-los de volta, recupere
> os dois de lá — a estrutura estava pronta, só faltava a cobrança de verdade.

## O que falta

### 1. Cobrança (o bloqueador)

Não há integração de pagamento. É preciso escolher:

| Opção | A favor | Contra |
|---|---|---|
| **Stripe** | melhor API, assinatura pronta, portal do cliente | no Brasil cai em cartão internacional; sem Pix recorrente nativo |
| **Mercado Pago** | Pix, boleto, cartão nacional, assinatura | API mais áspera, documentação irregular |
| **Asaas / Iugu** | feitos para SaaS brasileiro, Pix recorrente | menos conhecidos, taxa maior |
| **Pix manual** | zero taxa, zero integração | conferência na mão; não escala |

Para um produto brasileiro cobrando mensalidade de casal, **Mercado Pago ou
Asaas** são o caminho realista. Stripe se o público for internacional.

### 2. Modelo de assinatura no banco

Nada disso existe no schema ainda:

```prisma
model Subscription {
  id                String   @id @default(cuid())
  spaceId           String   @unique   // a assinatura é do espaço, não da pessoa
  plano             String
  status            String              // ativa, atrasada, cancelada
  provedorId        String              // id no gateway
  periodoFimEm      DateTime
  canceladaEm       DateTime?
}
```

A decisão de modelagem que importa: **cobrar por espaço, não por usuário.** É o
que a página de preços promete ("um preço por casal") e o que faz sentido — as
duas pessoas usam o mesmo conjunto de dados.

### 3. Limites aplicados no servidor

Se houver plano grátis com limite, o limite tem que valer na Server Action, não
só escondendo botão na tela. Alguém que monte o `FormData` na mão contorna
qualquer bloqueio de interface.

O lugar certo é junto de `requireSpace()` — um `requirePlan(spaceId, recurso)`
que consulta a assinatura e recusa igual à autorização recusa.

### 4. Obrigações legais (não são opcionais)

Cobrando de terceiros e guardando dado financeiro deles:

- **Termos de Uso** e **Política de Privacidade** publicados e aceitos no
  cadastro, com registro de quando e qual versão.
- **LGPD**: base legal para o tratamento, canal para o titular pedir acesso,
  correção e exclusão dos dados, e prazo de resposta.
- **Exclusão de conta** que apague de verdade (hoje não existe tela para isso).
- **Exportação dos dados** — direito à portabilidade. Já está no roadmap como
  exportar CSV; vira obrigação quando se cobra.
- **Nota fiscal** e um CNPJ para emitir. Cobrar como pessoa física dá problema.

### 5. Operação

- **Backup testado** — restaurar, não só copiar.
- **Monitoramento**: se o app cair às 3h da manhã, alguém precisa saber.
- **Suporte**: o plano pago promete "suporte por e-mail". Precisa de um e-mail
  que alguém lê.
- **Migração para PostgreSQL.** SQLite é ótimo para uma instalação de casal;
  para muitos clientes num servidor só, o caminho está em `docs/DEPLOY.md`.

## Ordem sugerida, se a decisão mudar

1. Validar que alguém paga: página no ar + lista de espera (o cadastro fechado
   já serve). **Não construa cobrança antes de ter alguém querendo pagar.**
2. Termos, privacidade e exclusão de conta.
3. Gateway + modelo de assinatura + limites no servidor.
4. Postgres e operação.

## Alternativas a cobrar mensalidade

Vale considerar antes de virar SaaS, porque SaaS traz obrigação contínua:

- **Pagamento único pelo código** (licença vitalícia, atualizações por um ano).
  Zero obrigação de disponibilidade.
- **Doação / apoio recorrente** com o código aberto. Não paga contas, mas não
  cria obrigação legal nenhuma.
- **Serviço de instalação**: cobrar para configurar na infraestrutura do
  cliente. Sem assinatura, sem hospedar dado de ninguém.

O plano "a gente hospeda" é o de maior receita recorrente e o de **maior
responsabilidade**: a partir dele, o dado financeiro de outras pessoas está sob
sua guarda.
