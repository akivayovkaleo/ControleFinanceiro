'use client';

import { useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Money } from '@/components/ui/money';
import { formatCents, parseAmountToCents, splitEvenly } from '@/lib/money';
import { computeShares, SPLIT_MODE_HINTS, SPLIT_MODE_LABELS, type SplitMode } from '@/lib/split';
import { cn } from '@/lib/utils';

export interface SplitMember {
  id: string;
  displayName: string;
  color: string;
  monthlyIncomeCents: number | null;
}

/**
 * Editor de divisão — o que torna o app útil para um casal.
 *
 * A prévia mostra em centavos exatos quanto cabe a cada um, usando a MESMA
 * função (`computeShares`) que o servidor vai usar para gravar. Se a prévia e
 * o resultado divergissem, a confiança no acerto de contas iria embora.
 *
 * No modo personalizado, os valores viajam num campo hidden como JSON, porque
 * FormData não carrega objetos.
 */
export function SplitEditor({
  members,
  amountCents,
  defaultMode,
  defaultPaidBy,
  defaultShares,
  currency,
}: {
  members: SplitMember[];
  amountCents: number;
  defaultMode: SplitMode;
  defaultPaidBy: string;
  defaultShares?: Record<string, number>;
  currency: string;
}) {
  const [mode, setMode] = useState<SplitMode>(defaultMode);
  const [paidBy, setPaidBy] = useState(defaultPaidBy);
  const [customRaw, setCustomRaw] = useState<Record<string, string>>(() => {
    if (defaultShares) {
      return Object.fromEntries(
        Object.entries(defaultShares).map(([id, cents]) => [id, (cents / 100).toFixed(2).replace('.', ',')]),
      );
    }
    // Começa em partes iguais: é o ponto de partida que a maioria ajusta.
    const parts = splitEvenly(amountCents, members.length);
    return Object.fromEntries(
      members.map((m, i) => [m.id, ((parts[i] ?? 0) / 100).toFixed(2).replace('.', ',')]),
    );
  });

  const customCents = useMemo(
    () =>
      Object.fromEntries(
        members.map((m) => [m.id, parseAmountToCents(customRaw[m.id] ?? '') ?? 0]),
      ),
    [customRaw, members],
  );

  const preview = useMemo(
    () =>
      computeShares({
        amountCents,
        mode,
        members: members.map((m) => ({
          membershipId: m.id,
          monthlyIncomeCents: m.monthlyIncomeCents,
        })),
        paidByMembershipId: paidBy,
        customShares: customCents,
      }),
    [amountCents, mode, members, paidBy, customCents],
  );

  const previewById = new Map(preview.map((s) => [s.membershipId, s.amountCents]));
  const customTotal = Object.values(customCents).reduce((a, b) => a + b, 0);
  const customMismatch = mode === 'CUSTOM' && amountCents > 0 && customTotal !== amountCents;

  const incomeMissing =
    mode === 'INCOME_RATIO' && members.every((m) => !m.monthlyIncomeCents);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface-2/50 p-4">
      <input type="hidden" name="splitMode" value={mode} />
      <input type="hidden" name="paidByMembershipId" value={paidBy} />
      {mode === 'CUSTOM' && (
        <input type="hidden" name="customShares" value={JSON.stringify(customCents)} />
      )}

      {/* ------------------------------------------------------ quem pagou */}
      <div>
        <p className="label-base">Quem pagou</p>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setPaidBy(member.id)}
              aria-pressed={paidBy === member.id}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                paidBy === member.id
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-border bg-surface text-muted hover:text-fg',
              )}
            >
              <Avatar name={member.displayName} color={member.color} size="xs" />
              {member.displayName}
            </button>
          ))}
        </div>
      </div>

      {/* --------------------------------------------------- modo de divisão */}
      <div>
        <p className="label-base">Como dividir</p>
        <div className="grid grid-cols-2 gap-2">
          {(['OWNER', 'EQUAL', 'INCOME_RATIO', 'CUSTOM'] as SplitMode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              aria-pressed={mode === option}
              className={cn(
                'rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors',
                mode === option
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-border bg-surface text-muted hover:text-fg',
              )}
            >
              {SPLIT_MODE_LABELS[option]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{SPLIT_MODE_HINTS[mode]}</p>
        {incomeMissing && (
          <p className="mt-1.5 text-xs font-medium text-warning">
            Ninguém preencheu a renda ainda — por enquanto vai ser dividido meio a meio.
          </p>
        )}
      </div>

      {/* -------------------------------------------------------- prévia */}
      {mode !== 'OWNER' && (
        <div>
          <p className="label-base">
            {mode === 'CUSTOM' ? 'Quanto cabe a cada um' : 'Ficará assim'}
          </p>
          <ul className="space-y-2">
            {members.map((member) => {
              const share = previewById.get(member.id) ?? 0;
              const percent = amountCents > 0 ? (share / amountCents) * 100 : 0;

              return (
                <li key={member.id} className="flex items-center gap-2.5">
                  <Avatar name={member.displayName} color={member.color} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">
                    {member.displayName}
                  </span>

                  {mode === 'CUSTOM' ? (
                    <input
                      value={customRaw[member.id] ?? ''}
                      onChange={(e) =>
                        setCustomRaw((prev) => ({ ...prev, [member.id]: e.target.value }))
                      }
                      inputMode="decimal"
                      aria-label={`Valor de ${member.displayName}`}
                      className="tabular w-28 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-right text-sm outline-none focus:border-brand"
                    />
                  ) : (
                    <span className="flex items-baseline gap-2">
                      <span className="tabular text-2xs text-muted">{percent.toFixed(0)}%</span>
                      <Money cents={share} currency={currency} tone="neutral" size="sm" />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {customMismatch && (
            <p className="mt-2 text-xs font-medium text-warning">
              Os valores somam {formatCents(customTotal, currency)}, mas o lançamento é de{' '}
              {formatCents(amountCents, currency)}. Vamos ajustar proporcionalmente ao salvar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
