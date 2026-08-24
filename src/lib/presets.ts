/**
 * Dados iniciais de um space novo.
 *
 * Um app financeiro vazio é intimidante: sem categorias, o primeiro
 * lançamento exige três cadastros antes de conseguir registrar um café.
 * Estes presets fazem o app já começar utilizável — tudo editável depois.
 *
 * Os nomes são os que uma pessoa no Brasil usaria, não jargão contábil.
 */

export interface CategoryPreset {
  name: string;
  kind: 'INCOME' | 'EXPENSE';
  color: string;
  icon: string;
}

export const DEFAULT_CATEGORIES: CategoryPreset[] = [
  // Receitas
  { name: 'Salário', kind: 'INCOME', color: '#109c86', icon: 'briefcase' },
  { name: 'Freelance', kind: 'INCOME', color: '#3b6fd4', icon: 'laptop' },
  { name: 'Investimentos', kind: 'INCOME', color: '#4f9c1f', icon: 'trending-up' },
  { name: 'Presente', kind: 'INCOME', color: '#7c4dd0', icon: 'gift' },
  { name: 'Outras receitas', kind: 'INCOME', color: '#5b6478', icon: 'plus-circle' },

  // Despesas — moradia e contas fixas
  { name: 'Moradia', kind: 'EXPENSE', color: '#e2681f', icon: 'home' },
  { name: 'Contas de casa', kind: 'EXPENSE', color: '#bd8405', icon: 'zap' },
  { name: 'Internet e telefone', kind: 'EXPENSE', color: '#0e7490', icon: 'wifi' },

  // Despesas — dia a dia
  { name: 'Mercado', kind: 'EXPENSE', color: '#4f9c1f', icon: 'shopping-cart' },
  { name: 'Restaurante e delivery', kind: 'EXPENSE', color: '#d63c3c', icon: 'utensils' },
  { name: 'Transporte', kind: 'EXPENSE', color: '#3b6fd4', icon: 'car' },

  // Despesas — pessoal
  { name: 'Saúde', kind: 'EXPENSE', color: '#109c86', icon: 'heart-pulse' },
  { name: 'Educação', kind: 'EXPENSE', color: '#9a5b1e', icon: 'graduation-cap' },
  { name: 'Lazer', kind: 'EXPENSE', color: '#d9599b', icon: 'popcorn' },
  { name: 'Assinaturas', kind: 'EXPENSE', color: '#7c4dd0', icon: 'repeat' },
  { name: 'Compras', kind: 'EXPENSE', color: '#b8336a', icon: 'shopping-bag' },
  { name: 'Presentes', kind: 'EXPENSE', color: '#7c4dd0', icon: 'gift' },
  { name: 'Viagem', kind: 'EXPENSE', color: '#0e7490', icon: 'plane' },
  { name: 'Pets', kind: 'EXPENSE', color: '#4f9c1f', icon: 'paw-print' },
  { name: 'Taxas e impostos', kind: 'EXPENSE', color: '#5b6478', icon: 'landmark' },
  { name: 'Outras despesas', kind: 'EXPENSE', color: '#5b6478', icon: 'circle-ellipsis' },
];

export interface AccountPreset {
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'CASH' | 'CREDIT_CARD' | 'INVESTMENT';
  color: string;
  icon: string;
}

export const DEFAULT_ACCOUNTS: AccountPreset[] = [
  { name: 'Conta corrente', type: 'CHECKING', color: '#3b6fd4', icon: 'landmark' },
  { name: 'Dinheiro', type: 'CASH', color: '#4f9c1f', icon: 'banknote' },
  { name: 'Cartão de crédito', type: 'CREDIT_CARD', color: '#7c4dd0', icon: 'credit-card' },
];

/**
 * Paleta de cores para categorias, contas, metas e membros.
 *
 * As OITO PRIMEIRAS são um conjunto validado: nenhuma dupla vizinha fica
 * abaixo de ΔE 11,7 para daltonismo (protanopia/deuteranopia) nem de 19,2
 * para visão normal, e todas passam 3:1 de contraste — com os MESMOS valores
 * nos temas claro e escuro.
 *
 * Isso importa porque o gráfico do painel mostra as oito maiores categorias.
 * A paleta anterior tinha `#eab308` e `#f59e0b` lado a lado, que na prática
 * são a mesma cor (ΔE 5,3): duas fatias vizinhas ficavam indistinguíveis.
 *
 * As quatro últimas são extras para variedade na hora de escolher. Como o
 * gráfico nunca passa de oito fatias, elas raramente disputam espaço com as
 * validadas — mas se você for recolorir tudo à mão, prefira as oito primeiras.
 *
 * A ordem é fixa e os presets abaixo reservam as oito validadas para as
 * categorias de maior uso.
 */
export const PALETTE = [
  '#3b6fd4', // 1 azul
  '#e2681f', // 2 laranja
  '#109c86', // 3 verde-azulado
  '#bd8405', // 4 âmbar
  '#d9599b', // 5 rosa
  '#4f9c1f', // 6 verde
  '#7c4dd0', // 7 violeta
  '#d63c3c', // 8 vermelho
  '#0e7490', // 9 ciano
  '#9a5b1e', // 10 marrom
  '#b8336a', // 11 magenta
  '#5b6478', // 12 grafite
] as const;

export const ACCOUNT_TYPE_LABELS: Record<AccountPreset['type'], string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão de crédito',
  INVESTMENT: 'Investimento',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountPreset['type'], string> = {
  CHECKING: 'landmark',
  SAVINGS: 'piggy-bank',
  CASH: 'banknote',
  CREDIT_CARD: 'credit-card',
  INVESTMENT: 'trending-up',
};

export const CURRENCY_LABELS: Record<string, string> = {
  BRL: 'Real (R$)',
  USD: 'Dólar (US$)',
  EUR: 'Euro (€)',
};


/**
 * Cor inicial de avatar para uma pessoa.
 *
 * Derivada do e-mail em vez de fixa: num espaço de casal, duas pessoas com a
 * mesma cor tornariam o extrato ilegível justamente onde a cor é o sinal de
 * "de quem é isto". Determinística, então a mesma pessoa recebe sempre a
 * mesma cor — e continua editável nas configurações.
 */
export function defaultAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  // Só as oito primeiras: são as validadas para contraste e daltonismo.
  return PALETTE[Math.abs(hash) % 8]!;
}
