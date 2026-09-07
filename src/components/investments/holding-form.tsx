'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { saveHoldingAction } from '@/server/actions/investments';
import { idleState } from '@/server/actions/types';
import { HOLDING_TYPES, HOLDING_TYPE_LABELS, type HoldingType } from '@/lib/investments';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export interface HoldingFormValues {
  id: string;
  name: string;
  ticker: string | null;
  type: HoldingType;
  quantity: number;
  avgPriceCents: number;
  currentPriceCents: number;
  accountId: string;
  notes: string | null;
}

export interface AccountOption {
  id: string;
  name: string;
}

/** Converte centavos para o texto que a pessoa espera ver dentro do input. */
function toInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Quantidade dentro do input.
 *
 * `toFixed` fixo daria "10,00000000" para dez cotas inteiras. Aqui o número sai
 * com as casas que realmente tem — inteiro fica inteiro, cripto mantém as oito.
 */
function quantityToInput(quantity: number): string {
  return String(quantity).replace('.', ',');
}

export function HoldingForm({
  spaceId,
  accounts,
  holding,
  onDone,
}: {
  spaceId: string;
  accounts: AccountOption[];
  /** Preenchido = edição. Ausente = nova posição. */
  holding?: HoldingFormValues;
  onDone?: () => void;
}) {
  const router = useRouter();
  const editing = Boolean(holding);
  const [open, setOpen] = useState(editing);
  const [state, formAction] = useActionState(saveHoldingAction, idleState);

  useEffect(() => {
    if (state.ok) {
      if (!editing) setOpen(false);
      onDone?.();
      router.refresh();
    }
  }, [state.ok, editing, onDone, router]);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Nova posição
      </Button>
    );
  }

  const close = () => {
    setOpen(false);
    onDone?.();
  };

  return (
    <Card className="mb-5">
      <CardBody>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="spaceId" value={spaceId} />
          {holding && <input type="hidden" name="holdingId" value={holding.id} />}

          {state.error && <Alert tone="error">{state.error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Nome"
              htmlFor="holding-name"
              error={state.fieldErrors?.name}
              className="sm:col-span-2"
              required
            >
              <Input
                id="holding-name"
                name="name"
                placeholder="Tesouro IPCA+ 2035"
                defaultValue={holding?.name}
                maxLength={80}
                autoFocus
                required
              />
            </Field>

            <Field
              label="Ticker"
              htmlFor="holding-ticker"
              error={state.fieldErrors?.ticker}
              hint="Opcional"
            >
              <Input
                id="holding-ticker"
                name="ticker"
                placeholder="PETR4"
                defaultValue={holding?.ticker ?? ''}
                maxLength={20}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo" htmlFor="holding-type" error={state.fieldErrors?.type} required>
              <Select id="holding-type" name="type" defaultValue={holding?.type ?? 'STOCK'} required>
                {HOLDING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {HOLDING_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Onde está guardado"
              htmlFor="holding-account"
              error={state.fieldErrors?.accountId}
              required
            >
              <Select
                id="holding-account"
                name="accountId"
                defaultValue={holding?.accountId ?? accounts[0]?.id}
                required
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Quantidade"
              htmlFor="holding-quantity"
              error={state.fieldErrors?.quantity}
              hint="Pode ter casas decimais"
              required
            >
              <Input
                id="holding-quantity"
                name="quantity"
                inputMode="decimal"
                placeholder="100"
                defaultValue={holding ? quantityToInput(holding.quantity) : ''}
                required
              />
            </Field>

            <Field
              label="Preço médio pago"
              htmlFor="holding-avg"
              error={state.fieldErrors?.avgPriceCents}
              hint="Por unidade"
              required
            >
              <Input
                id="holding-avg"
                name="avgPriceCents"
                inputMode="decimal"
                placeholder="32,50"
                defaultValue={holding ? toInput(holding.avgPriceCents) : ''}
                required
              />
            </Field>

            <Field
              label="Cotação de hoje"
              htmlFor="holding-current"
              error={state.fieldErrors?.currentPriceCents}
              hint="Por unidade"
              required
            >
              <Input
                id="holding-current"
                name="currentPriceCents"
                inputMode="decimal"
                placeholder="35,80"
                defaultValue={holding ? toInput(holding.currentPriceCents) : ''}
                required
              />
            </Field>
          </div>

          <Field label="Observações" htmlFor="holding-notes" hint="Opcional">
            <Textarea
              id="holding-notes"
              name="notes"
              rows={2}
              maxLength={300}
              defaultValue={holding?.notes ?? ''}
              placeholder="Vence em 2035. Aporte mensal de R$ 300."
            />
          </Field>

          <div className="flex gap-3">
            <Button variant="outline" onClick={close} className="flex-1">
              Cancelar
            </Button>
            <SubmitButton className="flex-1" pendingLabel="Salvando…">
              {editing ? 'Salvar posição' : 'Adicionar à carteira'}
            </SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
