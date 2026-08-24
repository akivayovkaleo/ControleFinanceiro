# Roadmap

O que existe hoje cobre o uso diário de uma pessoa e de um casal. Isto aqui é o
que ficou de fora, com uma nota honesta sobre por quê.

## Provavelmente vale a pena

**Importar CSV do banco**
Lançar tudo à mão é o maior atrito para começar. Importar o extrato do banco
(CSV/OFX) com uma tela de conferência e sugestão de categoria resolveria isso.
Requer um mapeamento por banco, porque cada um exporta de um jeito.

**Exportar CSV**
Contrapartida do item acima: levar os dados embora. É rápido de fazer e evita
qualquer sensação de aprisionamento.

**Parcelamento de cartão**
"Comprei em 6x" hoje precisa de 6 lançamentos manuais ou de uma recorrência com
data de término. Um campo "parcelas" que gera tudo de uma vez, ligado por um
`installmentGroupId`, seria bem mais direto.

**Fatura do cartão como período**
O app já guarda `statementDay` e `dueDay`, mas ainda não agrupa os lançamentos
por fatura ("o que fecha dia 20"). É a forma como as pessoas realmente pensam em
cartão.

**Anexar comprovante**
Foto da nota fiscal no lançamento. Exige decidir onde guardar arquivo (disco
local versus objeto), o que muda a estratégia de backup.

## Talvez

**Notificações de vencimento**
Avisar que a fatura vence em 3 dias. Push web funciona sem SMTP, mas exige
service worker e chaves VAPID.

**Relatórios por período livre**
Hoje tudo é por competência mensal. Comparar trimestres ou um período arbitrário
seria útil na hora de decidir algo grande.

**Divisão com dívida acumulada entre acertos**
Hoje o acerto considera tudo desde o último registro. Um teto ("acerte quando
passar de R$ 500") evitaria acertos de valor irrisório.

**Mais de duas pessoas**
Já funciona — o algoritmo de acerto é genérico para N membros e há testes com
três e quatro. Mas a interface foi pensada para dois; com cinco pessoas o editor
de divisão ficaria apertado.

## Provavelmente não

**Open Finance / conexão com banco**
Exige homologação junto ao Banco Central, certificado e um servidor confiável.
Incompatível com um app self-hosted que qualquer um instala em casa.

**Multi-moeda por lançamento**
Cada espaço tem uma moeda. Conversão precisa de cotação com data, e cotação
histórica precisa de uma fonte externa — um projeto à parte.

**Investimentos com cotação**
Uma conta de investimento aqui é só uma conta com saldo. Acompanhar ativos,
rentabilidade e imposto é outro produto.

**App nativo**
A PWA instala na tela de início e funciona em tela cheia. Um app nativo custaria
duas plataformas a mais para manter e um ganho pequeno.

**Mudar de espaço para "tudo num lugar só"**
A separação por espaço é a decisão central do produto. Ver `docs/DECISOES.md`.

## Dívidas técnicas conhecidas

- **CSP com `script-src 'unsafe-inline'`.** O App Router injeta scripts inline
  de hidratação. Eliminar exigiria nonce por requisição, forçando toda página a
  ser dinâmica. Registrado em `docs/SEGURANCA.md`.
- **Busca do extrato é case-sensitive para acentos.** O SQLite no Prisma não
  suporta `mode: 'insensitive'`. Some ao migrar para Postgres.
- **Sem paginação no extrato.** Mostra até 200 lançamentos por competência. Um
  casal dificilmente passa disso num mês, mas o limite existe.
- **Sem testes de integração das Server Actions.** A lógica financeira pura tem
  cobertura boa; as actions são verificadas por um roteiro de navegador, não por
  testes automatizados no repositório.
