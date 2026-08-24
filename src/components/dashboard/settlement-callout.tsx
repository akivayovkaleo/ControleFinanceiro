import Link from 'next/link';
import { ArrowRight, Handshake } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Money } from '@/components/ui/money';
import type { SettlementView } from '@/server/queries/settlement';

/**
 * O destaque do modo casal no painel.
 *
 * Responde à pergunta que motiva o app compartilhado — "estamos quites?" —
 * em uma frase, sem obrigar a abrir outra tela. Quando estão quites, o cartão
 * comemora em vez de sumir: silêncio pareceria "não calculado".
 */
export function SettlementCallout({
  settlement,
  currency,
  spaceId,
}: {
  settlement: SettlementView;
  currency: string;
  spaceId: string;
}) {
  if (settlement.isSettled) {
    return (
      <div className="card flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-income-soft text-income">
          <Handshake className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">Vocês estão quites</p>
          <p className="text-xs text-muted">
            {settlement.transactionCount === 0
              ? 'Nenhuma despesa compartilhada em aberto.'
              : `${settlement.transactionCount} despesas compartilhadas, todas equilibradas.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={{ pathname: '/acerto', query: { space: spaceId } }}
      className="card group block p-4 transition-colors hover:bg-surface-2"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
          <Handshake className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">Acerto em aberto</p>
          <p className="text-xs text-muted">
            {settlement.transactionCount} despesa{settlement.transactionCount > 1 ? 's' : ''}{' '}
            compartilhada{settlement.transactionCount > 1 ? 's' : ''} desde o último acerto
          </p>
        </div>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>

      <ul className="mt-3 space-y-2 border-t border-border pt-3">
        {settlement.transfers.map((transfer, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            <Avatar name={transfer.from.displayName} color={transfer.from.color} size="xs" />
            <span className="font-medium text-fg">{transfer.from.displayName}</span>
            <span className="text-muted">paga para</span>
            <Avatar name={transfer.to.displayName} color={transfer.to.color} size="xs" />
            <span className="font-medium text-fg">{transfer.to.displayName}</span>
            <Money
              cents={transfer.amountCents}
              currency={currency}
              tone="neutral"
              size="sm"
              className="ml-auto"
            />
          </li>
        ))}
      </ul>
    </Link>
  );
}
