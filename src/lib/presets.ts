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
  { name: 'Salário', kind: 'INCOME', color: '#10b981', icon: 'briefcase' },
  { name: 'Freelance', kind: 'INCOME', color: '#14b8a6', icon: 'laptop' },
  { name: 'Investimentos', kind: 'INCOME', color: '#06b6d4', icon: 'trending-up' },
  { name: 'Presente', kind: 'INCOME', color: '#8b5cf6', icon: 'gift' },
  { name: 'Outras receitas', kind: 'INCOME', color: '#64748b', icon: 'plus-circle' },

  // Despesas — moradia e contas fixas
  { name: 'Moradia', kind: 'EXPENSE', color: '#f97316', icon: 'home' },
  { name: 'Contas de casa', kind: 'EXPENSE', color: '#f59e0b', icon: 'zap' },
  { name: 'Internet e telefone', kind: 'EXPENSE', color: '#0ea5e9', icon: 'wifi' },

  // Despesas — dia a dia
  { name: 'Mercado', kind: 'EXPENSE', color: '#22c55e', icon: 'shopping-cart' },
  { name: 'Restaurante e delivery', kind: 'EXPENSE', color: '#ef4444', icon: 'utensils' },
  { name: 'Transporte', kind: 'EXPENSE', color: '#6366f1', icon: 'car' },

  // Despesas — pessoal
  { name: 'Saúde', kind: 'EXPENSE', color: '#ec4899', icon: 'heart-pulse' },
  { name: 'Educação', kind: 'EXPENSE', color: '#a855f7', icon: 'graduation-cap' },
  { name: 'Lazer', kind: 'EXPENSE', color: '#eab308', icon: 'popcorn' },
  { name: 'Assinaturas', kind: 'EXPENSE', color: '#d946ef', icon: 'repeat' },
  { name: 'Compras', kind: 'EXPENSE', color: '#f43f5e', icon: 'shopping-bag' },
  { name: 'Presentes', kind: 'EXPENSE', color: '#8b5cf6', icon: 'gift' },
  { name: 'Viagem', kind: 'EXPENSE', color: '#0891b2', icon: 'plane' },
  { name: 'Pets', kind: 'EXPENSE', color: '#84cc16', icon: 'paw-print' },
  { name: 'Taxas e impostos', kind: 'EXPENSE', color: '#78716c', icon: 'landmark' },
  { name: 'Outras despesas', kind: 'EXPENSE', color: '#64748b', icon: 'circle-ellipsis' },
];

export interface AccountPreset {
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'CASH' | 'CREDIT_CARD' | 'INVESTMENT';
  color: string;
  icon: string;
}

export const DEFAULT_ACCOUNTS: AccountPreset[] = [
  { name: 'Conta corrente', type: 'CHECKING', color: '#0ea5e9', icon: 'landmark' },
  { name: 'Dinheiro', type: 'CASH', color: '#22c55e', icon: 'banknote' },
  { name: 'Cartão de crédito', type: 'CREDIT_CARD', color: '#8b5cf6', icon: 'credit-card' },
];

/** Paleta oferecida ao usuário para membros, contas, categorias e metas. */
export const PALETTE = [
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#64748b', '#78716c',
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
