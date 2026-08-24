/**
 * Planos exibidos na página de vendas.
 *
 * ⚠️ OS VALORES AQUI SÃO PROVISÓRIOS. Este arquivo é o único lugar onde
 * mexer em preço, nome de plano e o que cada um inclui — a página de vendas
 * lê tudo daqui.
 *
 * Nada nesta lista cobra de ninguém: não há integração de pagamento no
 * projeto. O botão do plano pago leva para o cadastro. Antes de cobrar de
 * verdade é preciso, no mínimo:
 *
 *   1. escolher a forma de cobrança (Stripe, Mercado Pago, Pix recorrente…);
 *   2. modelar assinatura no banco (quem pagou, até quando, o que acontece
 *      quando vence);
 *   3. aplicar limites de plano no servidor, não só escondendo botão na tela;
 *   4. publicar Termos de Uso e Política de Privacidade — obrigatório pela
 *      LGPD quando se trata dado financeiro de terceiros.
 *
 * Ver docs/MONETIZACAO.md.
 */

export interface Plano {
  id: string;
  nome: string;
  resumo: string;
  preco: string;
  periodo?: string;
  selo?: string;
  destaque?: boolean;
  itens: string[];
  acao: string;
  destino: string;
}

export const PLANOS: Plano[] = [
  {
    id: 'self-hosted',
    nome: 'Você hospeda',
    resumo: 'O código é aberto. Rode na sua máquina ou no seu servidor.',
    preco: 'Grátis',
    itens: [
      'Todos os recursos, sem limite',
      'Espaços pessoais e compartilhados',
      'Acerto de contas, orçamentos, metas',
      'Seus dados num arquivo que é seu',
      'Suporte pela comunidade',
    ],
    acao: 'Ver no GitHub',
    destino: 'https://github.com/akivayovkaleo/ControleFinanceiro',
  },
  {
    id: 'hospedado',
    nome: 'A gente hospeda',
    resumo: 'Sem servidor, sem atualização, sem backup para lembrar.',
    preco: 'R$ 19',
    periodo: '/mês por casal',
    selo: 'Mais escolhido',
    destaque: true,
    itens: [
      'Tudo do plano acima',
      'Backup diário automático',
      'Atualizações sem você fazer nada',
      'Acesso de qualquer lugar, com HTTPS',
      'Suporte por e-mail',
    ],
    acao: 'Começar agora',
    destino: '/criar-conta',
  },
];
