'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { deleteHoldingAction, updateHoldingPriceAction } from '@/server/actions/investments';
import { idleState } from '@/server/actions/types';
import { HOLDING_TYPE_COLORS, HOLDING_TYPE_LABELS, type HoldingType } from '@/lib/investments';
import { Money } from '@/components/ui/money';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/field';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { HoldingForm, type AccountOption } from './holding-form';

export interface HoldingRow {
  id: string;
  name: string;
  ticker: string | null;
  type: HoldingType;
  quantity: number;
  avgPriceCents: number;
  currentPriceCents: number;
  marketValueCents: number;
  costBasisCents: number;
  gainCents: number;
  gainPercent: number | null;
  accountId: string;
  accountName: string;
  notes: string | null;
}

const formatQuantity = (quantity: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 }).format(quantity);

const formatPercent = (percent: number) =>
  `${percent >= 0 ? '+' : ''}${percent.toFixed(2).replace('.', ',')}%`;

export function HoldingList({
  holdings,
  spaceId,
  currency,
  accounts,
}: {
  holdings: HoldingRow[];
  spaceId: string;
  currency: string;
  accounts: AccountOption[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {holdings.map((holding) =>
        editingId === holding.id ? (
          <HoldingForm
            key={holding.id}
            spaceId={spaceId}
            accounts={accounts}
            holding={holding}
            onDone={() => setEditingId(null)}
          />
        ) : (
          <HoldingRowCard
            key={holding.id}
            holding={holding}
            spaceId={spaceId}
            currency={currency}
            onEdit={() => setEditingId(holding.id)}
          />
        ),
      )}
    </div>
  );
}

function HoldingRowCard({
  holding,
  spaceId,
  currency,
  onEdit,
}: {
  holding: HoldingRow;
  spaceId: string;
  currency: string;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [priceState, priceAction] = useActionState(updateHoldingPriceAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteHoldingAction, idleState);

  useEffect(() => {
    if (priceState.ok) router.refresh();
  }, [priceState.ok, router]);

  useEffect(() => {
    if (deleteState.ok) {
      setConfirming(false);
      router.refresh();
    }
  }, [deleteState.ok, router]);

  // Lucro e prejuízo usam os tokens de receita/despesa, que já são os que o
  // app inteiro usa para "entrou" e "saiu" — cor nunca é escrita literal.
  const tone = holding.gainCents > 0 ? 'income' : holding.gainCents < 0 ? 'expense' : 'muted';

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: HOLDING_TYPE_COLORS[holding.type] }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">
              {holding.name}
              {holding.ticker && (
                <span className="ml-2 text-xs font-semibold text-muted">{holding.ticker}</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {HOLDING_TYPE_LABELS[holding.type]} · {formatQuantity(holding.quantity)}{' '}
              {holding.quantity === 1 ? 'unidade' : 'unidades'} · {holding.accountName}
            </p>
          </div>
        </div>

        <div className="text-right">
          <Money cents={holding.marketValueCents} currency={currency} size="md" />
          <p className="mt-0.5 text-xs">
            <span className={tone === 'income' ? 'text-income' : tone === 'expense' ? 'text-expense' : 'text-muted'}>
              <Money cents={holding.gainCents} currency={currency} size="xs" tone={tone} signed />
              {holding.gainPercent !== null && ` (${formatPercent(holding.gainPercent)})`}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
        <form action={priceAction} className="flex items-end gap-2">
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="holdingId" value={holding.id} />
          <div>
            <label
              htmlFor={`price-${holding.id}`}
              className="mb-1 block text-xs font-medium text-muted"
            >
              Cotação
            </label>
            <Input
              id={`price-${holding.id}`}
              name="currentPriceCents"
              inputMode="decimal"
              defaultValue={(holding.currentPriceCents / 100).toFixed(2).replace('.', ',')}
              error={Boolean(priceState.fieldErrors?.currentPriceCents)}
              className="h-9 w-28"
            />
          </div>
          <SubmitButton variant="outline" className="h-9" pendingLabel="…">
            Atualizar
          </SubmitButton>
        </form>

        <div className="flex gap-2">
          <Button variant="ghost" className="h-9" onClick={onEdit} aria-label={`Editar ${holding.name}`}>
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            className="h-9 text-danger"
            onClick={() => setConfirming(true)}
            aria-label={`Remover ${holding.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {priceState.error && <p className="mt-2 text-xs text-danger">{priceState.error}</p>}

      <ConfirmDialog
        open={confirming}
        title={`Remover ${holding.name}?`}
        description="A posição sai da carteira e do patrimônio. Os lançamentos de compra continuam no extrato."
        error={deleteState.error}
        onCancel={() => setConfirming(false)}
      >
        <form action={deleteAction}>
          <input type="hidden" name="spaceId" value={spaceId} />
          <input type="hidden" name="holdingId" value={holding.id} />
          <SubmitButton variant="danger" pendingLabel="Removendo…">
            Remover
          </SubmitButton>
        </form>
      </ConfirmDialog>
    </div>
  );
}
