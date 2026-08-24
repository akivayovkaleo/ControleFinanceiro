# Produto — o que o app faz e para quem

## O problema

Casais que dividem despesas caem em um de dois extremos:

1. **Planilha compartilhada** — flexível, mas ninguém mantém. Some depois de
   dois meses.
2. **App de finanças comum** — assume que ou tudo é seu, ou tudo é do casal.
   Não tem como dizer "esta despesa é nossa, aquela é só minha".

E há uma terceira dor, que quase nenhum app resolve: **quem pagou não é quem
deve**. Um paga o aluguel, o outro paga o mercado, e no fim do mês ninguém sabe
quanto um deve ao outro sem sentar com uma calculadora.

## A solução

### Espaços

Um **espaço** é um conjunto isolado de contas, categorias e lançamentos.

- **Espaço pessoal** — criado no cadastro, privado, nunca compartilhável.
- **Espaço compartilhado** — criado pelo usuário, com convite por código.

Uma pessoa pode ter vários. A troca é um clique no topo. O que separa é o
espaço, não a conta de usuário — então "usar sozinho" e "usar a dois" não são
modos diferentes do app, são espaços diferentes dentro dele.

### Divisão de despesas

Cada despesa num espaço compartilhado guarda duas informações independentes:

- **quem pagou** — de qual bolso saiu
- **quem devia** — de quem era a conta, em centavos por pessoa

Quatro modos de dividir:

| Modo | Quando usar |
|---|---|
| Meio a meio | O padrão para a maioria das contas de casa |
| Proporcional à renda | Quando as rendas são bem diferentes e vocês combinaram assim |
| Personalizado | "Esse jantar foi 70% meu porque eu chamei os amigos" |
| Só de quem pagou | Gasto individual lançado no espaço compartilhado (para o extrato ficar completo sem gerar dívida) |

### Acerto de contas

A tela `/acerto` responde à pergunta que motiva o app compartilhado:
**estamos quites?**

Ela mostra:

- quanto cada um **desembolsou** no período
- quanto **era de cada um**
- o **saldo** (o que sobra é o que a pessoa tem a receber)
- a **transferência** que zera tudo: "Ana paga R$ 2.184,41 para Kaleo"

Quando o Pix é feito (fora do app — ele não move dinheiro), você registra o
acerto. As despesas do período saem do saldo em aberto e ficam travadas para
edição, mas continuam no extrato.

Se errar a data, dá para desfazer.

## As telas

| Rota | O que é |
|---|---|
| `/painel` | Resumo do mês: receitas, despesas, sobra, saldo total, evolução de 6 meses, para onde o dinheiro foi, acerto em aberto, orçamentos e contas |
| `/lancamentos` | Extrato agrupado por dia, com busca e filtros (tipo, categoria, conta, pessoa) |
| `/lancamentos/novo` | Formulário de lançamento, com o editor de divisão quando o espaço é compartilhado |
| `/orcamentos` | Limite mensal por categoria, editável na própria linha, com cópia do mês anterior |
| `/acerto` | Quem deve quanto a quem, com a tabela do cálculo e o histórico de acertos |
| `/metas` | Objetivos de economia com aportes |
| `/contas` | Contas com saldo calculado, limite de cartão, dono (conjunta ou de alguém) |
| `/categorias` | Gerenciamento em lista, edição no lugar |
| `/recorrencias` | O que se repete todo mês |
| `/configuracoes` | Perfil, senha, sessões ativas, espaços, membros e convites |

## Princípios de interface

**Mobile primeiro.** Registrar um gasto acontece na fila do mercado, não sentado
no computador. A barra inferior tem quatro destinos e um botão central de
lançar, ao alcance do polegar.

**O espaço ativo é sempre visível.** É o controle mais importante da tela — ele
responde "de quem é o dinheiro que estou vendo?". Confundir espaço pessoal com
compartilhado seria o pior erro possível neste app, então o seletor mostra o
tipo explicitamente.

**Estados vazios explicam.** Um app financeiro novo é 90% tela vazia. Cada uma
diz o que aquilo significa e oferece a próxima ação.

**O número aparece na hora.** Os gráficos não têm animação de entrada: quem abre
o painel quer ver os valores, não esperar um segundo e meio de transição.

**Nada de jargão.** "Sobrou no mês", não "resultado líquido do período".
"Guardar dinheiro", não "aportar". "Quem pagou", não "responsável pelo
desembolso".

**Arquivar em vez de apagar.** Categoria ou conta com histórico é arquivada, não
excluída — assim o extrato antigo continua correto e os relatórios não mudam
retroativamente.

## O que ele deliberadamente NÃO faz

- **Não conecta com banco.** Open Finance exige homologação, certificado e um
  servidor confiável. Fora do escopo de um app self-hosted caseiro.
- **Não move dinheiro.** O Pix acontece no app do banco. Aqui é o registro.
- **Não manda e-mail.** Nem de recuperação de senha, nem de lembrete. Depender
  de SMTP numa instalação caseira é depender de algo que quebra em silêncio.
  A redefinição de senha é por linha de comando.
- **Não tem multi-moeda por lançamento.** Cada espaço tem uma moeda. Conversão
  de câmbio com data e cotação é um projeto à parte.
- **Não tem investimentos com cotação.** Uma conta de investimento é só uma
  conta com saldo; não há acompanhamento de ativos.

Ver `docs/ROADMAP.md` para o que pode entrar depois.
