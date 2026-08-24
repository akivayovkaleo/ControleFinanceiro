# Controle Financeiro

Controle financeiro **pessoal e para casais**. Cada pessoa tem um espaço
privado; quando quiserem, criam um espaço compartilhado só para as contas de
vocês dois — com divisão de despesas e acerto de contas calculado, não
estimado.

Roda na sua máquina ou no seu servidor. Sem nuvem de terceiros, sem
rastreadores, sem anúncios.

---

## Por que existe

Aplicativos de finanças costumam assumir uma coisa ou outra: ou tudo é seu, ou
tudo é do casal. Na vida real não é assim — o presente que você comprou para ela
não é uma despesa compartilhada, mas o aluguel é.

Aqui isso é resolvido por **espaços**:

- **Meu dinheiro** — seu espaço pessoal, invisível para qualquer outra pessoa.
- **Nossa casa** — o espaço compartilhado, com as contas de vocês dois.

Você escolhe em qual espaço lançar cada coisa. Os dois convivem, e a troca é um
clique no topo da tela.

## O que ele faz

**Para você, sozinho**

- Lançamentos de receita, despesa e transferência entre contas
- Contas (corrente, dinheiro, cartão de crédito, poupança, investimento) com
  saldo calculado a partir do extrato
- Categorias com cor, editáveis, já vindo preenchidas
- Orçamento mensal por categoria, com aviso quando aperta
- Metas de economia com aportes
- Recorrências (aluguel, salário, assinaturas) lançadas sozinhas
- Painel com evolução de 6 meses e para onde o dinheiro foi

**Para vocês dois**

- Convite por código: a pessoa cria a conta dela e entra no seu espaço
- Em cada despesa: **quem pagou** e **como dividir**
  - meio a meio
  - proporcional à renda de cada um
  - personalizado
  - só de quem pagou (gasto individual dentro do espaço compartilhado)
- **Acerto de contas**: "Ana paga R$ 2.184,41 para Kaleo", com a tabela de como
  se chegou nesse número
- Registro do acerto quando o Pix é feito, para zerar e recomeçar

## Instalação

Você precisa do [Node.js 20+](https://nodejs.org).

```bash
git clone https://github.com/akivayovkaleo/ControleFinanceiro.git
cd ControleFinanceiro

npm install
npm run setup      # cria o .env com uma chave de segurança gerada na hora
npm run db:deploy  # cria as tabelas
npm run dev
```

Abra <http://localhost:3000>, crie sua conta e pronto.

### Quer ver funcionando antes?

```bash
npm run db:seed
```

Cria um casal de exemplo com três meses de lançamentos, orçamentos, metas e um
acerto em aberto.

> ⚠️ O seed **apaga todos os dados** antes de popular. Use só numa instalação
> nova.

Entre com `kaleo@exemplo.com` ou `ana@exemplo.com`, senha `demo-financeiro-2026`.

## Usando a dois

1. Em **Configurações → Todos os espaços**, crie um espaço compartilhado
   (ex.: "Nossa casa").
2. Em **Configurações → Nossa casa → Convidar alguém**, gere um convite.
3. Mande o código de 12 caracteres para a pessoa (WhatsApp, em voz alta, tanto
   faz). Ele vale 7 dias e serve uma vez só.
4. Ela cria a conta dela no mesmo endereço e cola o código em
   **Configurações → Todos os espaços → Entrar com um convite**.

Cada um continua com o seu espaço pessoal, separado e privado.

> Se quiserem usar a divisão **proporcional à renda**, cada pessoa preenche a
> própria renda em **Configurações → Nossa casa → Pessoas**. É opcional e não
> aparece em relatório nenhum — serve só para calcular a proporção.

## Fechando a instalação

Depois que todo mundo que vai usar já tiver conta, edite o `.env`:

```env
DISABLE_SIGNUP=true
```

A partir daí ninguém mais consegue se cadastrar, mesmo sabendo o endereço.

## Backup

Todos os dados estão num arquivo só:

```bash
cp prisma/dev.db ~/backup-financeiro-$(date +%F).db
```

Guarde em outro lugar (nuvem, pendrive). Restaurar é copiar de volta.

## Esqueceu a senha?

Não há e-mail de recuperação — seria preciso configurar um servidor SMTP, e uma
dependência dessas costuma falhar justo quando se precisa dela. Quem tem acesso
ao servidor resolve por linha de comando:

```bash
npm run senha -- pessoa@exemplo.com
```

O comando pede a nova senha e encerra todas as sessões abertas daquela conta.

## Colocar no ar

Para usar do celular fora de casa, o app precisa estar num servidor acessível.
Veja **[docs/DEPLOY.md](docs/DEPLOY.md)** — tem Docker, VPS e como migrar para
PostgreSQL se um dia quiser.

## Segurança

- Senhas com **Argon2id** (parâmetros do OWASP)
- Sessões em cookie `httpOnly` + `SameSite=Lax`, assinadas, com revogação
  imediata pelo banco
- Limite de tentativas de login (8 em 15 minutos, depois bloqueio)
- Toda consulta filtrada por espaço — não há como ver dado de espaço alheio
- Cabeçalhos de segurança (CSP, X-Frame-Options, etc.) em toda resposta
- Trilha de auditoria: quem fez o quê num espaço compartilhado

Detalhes e o modelo de ameaças em **[docs/SEGURANCA.md](docs/SEGURANCA.md)**.

## Para desenvolver

```bash
npm run check   # typecheck + testes
npm test        # só os testes
npm run dev     # servidor de desenvolvimento
```

A lógica financeira (centavos, divisão, acerto, datas) tem testes e **não deve
ser alterada sem rodá-los**.

Contexto completo do projeto — incluindo as regras que valem para o código
inteiro — em **[CLAUDE.md](CLAUDE.md)**.

## Licença

MIT. Use, modifique e hospede à vontade.
