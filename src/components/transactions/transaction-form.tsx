'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, TrendingDown, TrendingUp } from 'lucide-react';
import { saveTransactionAction } from '@/server/actions/transactions';
import { idleState } from '@/server/actions/types';
import { TagPicker, type TagOption } from './tag-picker';
import { parseAmountToCents } from '@/lib/money';
import { toDateInput, todayUtc } from '@/lib/date';
import type { SplitMode } from '@/lib/split';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { AmountInput } from './amount-input';
import { SplitEditor, type SplitMember } from './split-editor';
import { cn } from '@/lib/utils';

type TxType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface TransactionFormData {
  tagIds?: string[];
  id?: string;
  type: TxType;
  amount: string;
  date: string;
  description: string;
  notes: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  paidByMembershipId: string;
  splitMode: SplitMode;
  shares?: Record<string, number>;
}

const TYPE_TABS: Array<{ value: TxType; label: string; icon: typeof TrendingUp }> = [
  { value: 'EXPENSE', label: 'Despesa', icon: TrendingDown },
  { value: 'INCOME', label: 'Receita', icon: TrendingUp },
  { value: 'TRANSFER', label: 'Transferência', icon: ArrowLeftRight },
];

/**
 * Formulário de lançamento.
 *
 * O tipo (despesa / receita / transferência) é a primeira escolha porque muda
 * o resto do formulário: transferência troca "categoria" por "conta de
 * destino" e não divide nada; receita não divide. Deixar tudo sempre visível
 * geraria campos sem sentido na tela.
 */
export function TransactionForm({
  spaceId,
  currency,
  accounts,
  categories,
  members,
  tags,
  isShared,
  initial,
  locked,
}: {
  spaceId: string;
  currency: string;
  accounts: Array<{ id: string; name: string; type: string }>;
  categories: Array<{ id: string; name: string; kind: 'INCOME' | 'EXPENSE' }>;
  members: SplitMember[];
  tags: TagOption[];
  isShared: boolean;
  initial?: Partial<TransactionFormData>;
  /** Lançamento já incluído num acerto: só leitura. */
  locked?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveTransactionAction, idleState);

  const [type, setType] = useState<TxType>(initial?.type ?? 'EXPENSE');
  const [amountRaw, setAmountRaw] = useState(initial?.amount ?? '');
  const amountCents = parseAmountToCents(amountRaw) ?? 0;

  // Depois de salvar, volta para o extrato. `router.refresh()` garante que a
  // lista já venha com o lançamento novo.
  useEffect(() => {
    if (state.ok) {
      router.push(`/lancamentos?space=${spaceId}`);
      router.refresh();
    }
  }, [state.ok, router, spaceId]);

  const visibleCategories = categories.filter((c) =>
    type === 'INCOME' ? c.kind === 'INCOME' : c.kind === 'EXPENSE',
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="spaceId" value={spaceId} />
      {initial?.id && <input type="hidden" name="transactionId" value={initial.id} />}
      <input type="hidden" name="type" value={type} />

      {locked && (
        <Alert tone="warning">
          Este lançamento faz parte de um acerto de contas já registrado. Desfaça o
          acerto para poder editá-lo.
        </Alert>
      )}

      {state.error && <Alert tone="error">{state.error}</Alert>}

      {/* ------------------------------------------------------------- tipo */}
      <div role="radiogroup" aria-label="Tipo de lançamento" className="grid grid-cols-3 gap-2">
        {TYPE_TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            disabled={locked}
            onClick={() => setType(value)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors disabled:opacity-50',
              type === value
                ? value === 'INCOME'
                  ? 'border-income bg-income-soft text-income'
                  : value === 'EXPENSE'
                    ? 'border-expense bg-expense-soft text-expense'
                    : 'border-transfer bg-transfer-soft text-transfer'
                : 'border-border bg-surface text-muted hover:text-fg',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------ valor */}
      <div>
        <AmountInput
          name="amountCents"
          defaultValue={initial?.amount}
          currency={currency}
          tone={type === 'INCOME' ? 'income' : type === 'TRANSFER' ? 'transfer' : 'expense'}
          error={Boolean(state.fieldErrors?.amountCents)}
          autoFocus={!initial?.id}
          onValueChange={setAmountRaw}
        />
        {state.fieldErrors?.amountCents && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {state.fieldErrors.amountCents}
          </p>
        )}
      </div>

      {/* ------------------------------------------------------- descrição */}
      <Field
        label="Descrição"
        htmlFor="description"
        error={state.fieldErrors?.description}
        required
      >
        <Input
          id="description"
          name="description"
          defaultValue={initial?.description}
          placeholder={
            type === 'INCOME' ? 'Salário de março' : type === 'TRANSFER' ? 'Transferência' : 'Mercado do mês'
          }
          maxLength={120}
          required
          disabled={locked}
          error={Boolean(state.fieldErrors?.description)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data" htmlFor="date" error={state.fieldErrors?.date} required>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={initial?.date ?? toDateInput(todayUtc())}
            required
            disabled={locked}
            error={Boolean(state.fieldErrors?.date)}
          />
        </Field>

        <Field
          label={type === 'TRANSFER' ? 'Conta de origem' : 'Conta'}
          htmlFor="accountId"
          error={state.fieldErrors?.accountId}
          required
        >
          <Select
            id="accountId"
            name="accountId"
            defaultValue={initial?.accountId}
            required
            disabled={locked}
            error={Boolean(state.fieldErrors?.accountId)}
          >
            <option value="">Selecione…</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {type === 'TRANSFER' ? (
        <Field
          label="Conta de destino"
          htmlFor="toAccountId"
          error={state.fieldErrors?.toAccountId}
          hint="Transferências não entram em receitas, despesas nem orçamentos — só movem saldo."
          required
        >
          <Select
            id="toAccountId"
            name="toAccountId"
            defaultValue={initial?.toAccountId}
            required
            disabled={locked}
            error={Boolean(state.fieldErrors?.toAccountId)}
          >
            <option value="">Selecione…</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label="Categoria" htmlFor="categoryId" error={state.fieldErrors?.categoryId}>
          <Select
            id="categoryId"
            name="categoryId"
            defaultValue={initial?.categoryId}
            disabled={locked}
            error={Boolean(state.fieldErrors?.categoryId)}
          >
            <option value="">Sem categoria</option>
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {/* ------------------------------------------------ divisão do casal */}
      {isShared && type === 'EXPENSE' && !locked && (
        <SplitEditor
          members={members}
          amountCents={amountCents}
          currency={currency}
          defaultMode={initial?.splitMode ?? 'EQUAL'}
          defaultPaidBy={initial?.paidByMembershipId ?? members[0]?.id ?? ''}
          defaultShares={initial?.shares}
        />
      )}

      {/* Receita e transferência guardam quem lançou, sem divisão. */}
      {isShared && type !== 'EXPENSE' && (
        <Field label="Quem recebeu / movimentou" htmlFor="paidByMembershipId">
          <Select
            id="paidByMembershipId"
            name="paidByMembershipId"
            defaultValue={initial?.paidByMembershipId ?? members[0]?.id}
            disabled={locked}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <TagPicker
        tags={tags}
        defaultSelected={initial?.tagIds}
        disabled={locked}
        spaceId={spaceId}
      />

      <Field label="Observação" htmlFor="notes" hint="Opcional — um detalhe que você vai querer lembrar depois.">
        <Textarea
          id="notes"
          name="notes"
          defaultValue={initial?.notes}
          maxLength={500}
          rows={2}
          disabled={locked}
          placeholder="Ex.: parcela 2 de 6"
        />
      </Field>

      <div className="flex gap-3 pt-1">
        <Button variant="outline" onClick={() => router.back()} className="flex-1 sm:flex-none">
          Cancelar
        </Button>
        <SubmitButton
          className="flex-1"
          size="lg"
          disabled={locked}
          pendingLabel="Salvando…"
        >
          {initial?.id ? 'Salvar alterações' : 'Registrar'}
        </SubmitButton>
      </div>
    </form>
  );
}
