'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createInstallmentPurchaseAction } from '@/server/actions/installments';
import { idleState } from '@/server/actions/types';
import { parseAmountToCents, formatCents } from '@/lib/money';
import { parseDateInput, formatDateShort, toDateInput } from '@/lib/date';
import { buildInstallments, monthlyInstallmentDates } from '@/lib/installments';
import { installmentDatesForCard, DEFAULT_STATEMENT_INCLUSIVE } from '@/lib/credit-card';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export interface InstallmentAccountOption {
  id: string;
  name: string;
  isCreditCard: boolean;
  statementDay: number | null;
  dueDay: number | null;
  statementInclusive: boolean;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface MemberOption {
  id: string;
  displayName: string;
}

export function InstallmentForm({
  spaceId,
  currency,
  accounts,
  categories,
  members,
}: {
  spaceId: string;
  currency: string;
  accounts: InstallmentAccountOption[];
  categories: CategoryOption[];
  members: MemberOption[];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(createInstallmentPurchaseAction, idleState);

  const [total, setTotal] = useState('');
  const [count, setCount] = useState('3');
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');

  useEffect(() => {
    if (state.ok) router.push('/lancamentos');
  }, [state.ok, router]);

  const account = accounts.find((a) => a.id === accountId);

  /**
   * Prévia das parcelas, calculada com as MESMAS funções que a action usa.
   *
   * É o que deixa visível, antes de salvar, que 100,00 em 3x dá 33,34 + 33,33
   * + 33,33 — e não três parcelas de 33,33 com um centavo sumido.
   */
  const preview = useMemo(() => {
    const totalCents = parseAmountToCents(total);
    const parsedCount = Number.parseInt(count, 10);
    const purchaseDate = parseDateInput(date);

    if (!totalCents || totalCents <= 0 || !Number.isFinite(parsedCount) || parsedCount < 2) {
      return null;
    }
    if (!purchaseDate) return null;

    try {
      const dates =
        account?.isCreditCard && account.statementDay
          ? installmentDatesForCard(purchaseDate, parsedCount, {
              closingDay: account.statementDay,
              dueDay: account.dueDay ?? 10,
              limitCents: null,
              statementInclusive: account.statementInclusive ?? DEFAULT_STATEMENT_INCLUSIVE,
            })
          : monthlyInstallmentDates(purchaseDate, parsedCount);

      return { parts: buildInstallments(totalCents, dates), error: null as string | null };
    } catch (error) {
      return { parts: [], error: error instanceof Error ? error.message : 'Valor inválido' };
    }
  }, [total, count, date, account]);

  return (
    <Card>
      <CardBody>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="spaceId" value={spaceId} />

          {state.error && <Alert tone="error">{state.error}</Alert>}

          <Field
            label="O que você comprou"
            htmlFor="inst-description"
            error={state.fieldErrors?.description}
            required
          >
            <Input
              id="inst-description"
              name="description"
              placeholder="Geladeira"
              maxLength={120}
              autoFocus
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Valor total"
              htmlFor="inst-total"
              error={state.fieldErrors?.totalCents}
              hint="O total da compra, não o da parcela"
              required
            >
              <Input
                id="inst-total"
                name="totalCents"
                inputMode="decimal"
                placeholder="1.200,00"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                required
              />
            </Field>

            <Field
              label="Parcelas"
              htmlFor="inst-count"
              error={state.fieldErrors?.count}
              required
            >
              <Input
                id="inst-count"
                name="count"
                type="number"
                min={2}
                max={360}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                required
              />
            </Field>

            <Field
              label="Data da compra"
              htmlFor="inst-date"
              error={state.fieldErrors?.purchaseDate}
              required
            >
              <Input
                id="inst-date"
                name="purchaseDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Onde foi pago"
              htmlFor="inst-account"
              error={state.fieldErrors?.accountId}
              hint={
                account?.isCreditCard && account.statementDay
                  ? `As parcelas seguem o fechamento do cartão (dia ${account.statementDay})`
                  : 'As parcelas caem mês a mês'
              }
              required
            >
              <Select
                id="inst-account"
                name="accountId"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Categoria" htmlFor="inst-category" error={state.fieldErrors?.categoryId}>
              <Select id="inst-category" name="categoryId" defaultValue="">
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {members.length > 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quem pagou" htmlFor="inst-paidby">
                <Select id="inst-paidby" name="paidByMembershipId" defaultValue="">
                  <option value="">Eu</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Como dividir"
                htmlFor="inst-split"
                hint="Vale para todas as parcelas"
              >
                <Select id="inst-split" name="splitMode" defaultValue="OWNER">
                  <option value="OWNER">Só de quem pagou</option>
                  <option value="EQUAL">Meio a meio</option>
                  <option value="INCOME_RATIO">Proporcional à renda</option>
                </Select>
              </Field>
            </div>
          )}

          <Field label="Observações" htmlFor="inst-notes" hint="Opcional">
            <Textarea id="inst-notes" name="notes" rows={2} maxLength={500} />
          </Field>

          {preview?.error && <Alert tone="warning">{preview.error}</Alert>}

          {preview && preview.parts.length > 0 && (
            <div className="rounded-xl border border-border bg-surface-2 p-3">
              <p className="mb-2 text-xs font-semibold text-muted">
                {preview.parts.length}x de{' '}
                {formatCents(preview.parts[0]!.amountCents, currency)}
                {preview.parts.some((p) => p.amountCents !== preview.parts[0]!.amountCents) &&
                  ' (a primeira leva o centavo que sobra)'}
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted">
                {preview.parts.map((part) => (
                  <li key={part.number} className="flex justify-between gap-3">
                    <span>
                      {part.number}/{part.total} · {formatDateShort(part.date)}
                    </span>
                    <span className="tabular-nums">
                      {formatCents(part.amountCents, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <SubmitButton className="w-full" pendingLabel="Lançando…">
            Lançar {preview?.parts.length ?? ''}
            {preview?.parts.length ? 'x' : ' parcelas'}
          </SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}
