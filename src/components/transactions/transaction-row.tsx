import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Lock } from 'lucide-react';
import { Money } from '@/components/ui/money';
import { Avatar } from '@/components/ui/avatar';
import { formatDateShort } from '@/lib/date';
import { SPLIT_MODE_LABELS, type SplitMode } from '@/lib/split';
import { cn } from '@/lib/utils';

export interface TransactionRowData {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amountCents: number;
  date: Date;
  description: string;
  splitMode: SplitMode;
  settlementId: string | null;
  category: { name: string; color: string } | null;
  account: { name: string; color: string };
  toAccount: { name: string } | null;
  paidBy: { displayName: string; color: string } | null;
  shares: Array<{ membershipId: string; amountCents: number }>;
}

const TYPE_CONFIG = {
  INCOME: { Icon: ArrowDownLeft, className: 'bg-income-soft text-income', tone: 'income' as const },
  EXPENSE: { Icon: ArrowUpRight, className: 'bg-expense-soft text-expense', tone: 'expense' as const },
  TRANSFER: { Icon: ArrowLeftRight, className: 'bg-transfer-soft text-transfer', tone: 'transfer' as const },
};

/**
 * Linha do extrato.
 *
 * O que aparece muda com o contexto: num espaço compartilhado, mostrar quem
 * pagou e como foi dividido é essencial; sozinho, isso é ruído. Por isso
 * `showSplit`.
 */
export function TransactionRow({
  transaction,
  currency,
  spaceId,
  showSplit,
  showDate = true,
}: {
  transaction: TransactionRowData;
  currency: string;
  spaceId: string;
  showSplit: boolean;
  showDate?: boolean;
}) {
  const { Icon, className, tone } = TYPE_CONFIG[transaction.type];
  const isSettled = Boolean(transaction.settlementId);

  const subtitle =
    transaction.type === 'TRANSFER'
      ? `${transaction.account.name} → ${transaction.toAccount?.name ?? '—'}`
      : [transaction.category?.name, transaction.account.name].filter(Boolean).join(' · ');

  return (
    <Link
      href={{ pathname: `/lancamentos/${transaction.id}`, query: { space: spaceId } }}
      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2"
    >
      <span
        className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', className)}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{transaction.description}</p>
        <p className="flex items-center gap-1.5 truncate text-xs text-muted">
          {showDate && <span className="tabular">{formatDateShort(transaction.date)}</span>}
          {showDate && subtitle && <span aria-hidden>·</span>}
          <span className="truncate">{subtitle}</span>
        </p>
      </div>

      {showSplit && transaction.paidBy && (
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <Avatar
            name={transaction.paidBy.displayName}
            color={transaction.paidBy.color}
            size="xs"
          />
          {transaction.type === 'EXPENSE' && transaction.splitMode !== 'OWNER' && (
            <span className="text-2xs text-muted">
              {SPLIT_MODE_LABELS[transaction.splitMode]}
            </span>
          )}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        {isSettled && (
          <Lock className="h-3 w-3 text-subtle" aria-label="Incluído num acerto de contas" />
        )}
        {/*
          O valor é gravado sempre positivo — o sinal vem do TIPO. Sem esta
          conversão, uma despesa apareceria como "+ R$ 101,49", que é o
          oposto do que aconteceu com o dinheiro.
        */}
        <Money
          cents={transaction.type === 'EXPENSE' ? -transaction.amountCents : transaction.amountCents}
          currency={currency}
          tone={tone}
          signed={transaction.type !== 'TRANSFER'}
          size="sm"
        />
      </div>
    </Link>
  );
}
