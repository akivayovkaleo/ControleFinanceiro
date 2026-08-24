import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Handshake, Users } from 'lucide-react';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { getOpenSettlement, getSettlementHistory } from '@/server/queries/settlement';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardBody, CardHeader, EmptyState } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Money } from '@/components/ui/money';
import { Button } from '@/components/ui/button';
import { SettleForm } from '@/components/settlement/settle-form';
import { UndoSettlement } from '@/components/settlement/undo-settlement';
import { formatDate, formatDateShort } from '@/lib/date';

export const metadata: Metadata = { title: 'Acerto de contas' };

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { space, members, isShared } = context;
  const currency = space.currency;

  if (!isShared) {
    return (
      <>
        <PageHeader title="Acerto de contas" />
        <Card>
          <EmptyState
            icon={<Users className="h-6 w-6" aria-hidden />}
            title="O acerto é para quando vocês são dois"
            description="Num espaço compartilhado, o app calcula quem pagou o quê e quanto uma pessoa deve à outra. Convide alguém para começar."
            action={
              <Link href={{ pathname: '/configuracoes/espacos', query: { space: space.id } }}>
                <Button>Criar um espaço compartilhado</Button>
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  const memberInfo = members.map((m) => ({
    id: m.id,
    displayName: m.displayName,
    color: m.color,
  }));

  const [settlement, history] = await Promise.all([
    getOpenSettlement(space.id, memberInfo),
    getSettlementHistory(space.id),
  ]);

  return (
    <>
      <PageHeader
        title="Acerto de contas"
        description="Quem pagou o quê, e quanto falta acertar entre vocês."
      />

      {settlement.driftCents !== 0 && (
        <Alert tone="warning" className="mb-4">
          Encontramos uma diferença de{' '}
          <Money cents={settlement.driftCents} currency={currency} tone="neutral" size="sm" /> nos
          lançamentos. Revise as despesas compartilhadas antes de registrar o acerto.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* ------------------------------------------------- em aberto */}
          <Card>
            <CardHeader
              title={settlement.isSettled ? 'Vocês estão quites' : 'Para ficar quites'}
              description={
                settlement.transactionCount === 0
                  ? 'Nenhuma despesa compartilhada em aberto.'
                  : `${settlement.transactionCount} despesa${settlement.transactionCount > 1 ? 's' : ''} compartilhada${settlement.transactionCount > 1 ? 's' : ''}${
                      settlement.periodStart
                        ? ` desde ${formatDate(settlement.periodStart)}`
                        : ''
                    }`
              }
            />
            <CardBody className="pt-3">
              {settlement.isSettled ? (
                <div className="flex items-center gap-3 rounded-xl bg-income-soft px-4 py-3.5">
                  <Handshake className="h-5 w-5 shrink-0 text-income" aria-hidden />
                  <p className="text-sm font-medium text-income">
                    Ninguém deve nada a ninguém neste momento.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {settlement.transfers.map((transfer, index) => (
                    <li
                      key={index}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2/50 px-4 py-3.5"
                    >
                      <Avatar
                        name={transfer.from.displayName}
                        color={transfer.from.color}
                        size="sm"
                      />
                      <span className="text-sm font-semibold text-fg">
                        {transfer.from.displayName}
                      </span>
                      <ArrowRight className="h-4 w-4 text-subtle" aria-hidden />
                      <Avatar name={transfer.to.displayName} color={transfer.to.color} size="sm" />
                      <span className="text-sm font-semibold text-fg">
                        {transfer.to.displayName}
                      </span>
                      <Money
                        cents={transfer.amountCents}
                        currency={currency}
                        tone="neutral"
                        size="md"
                        className="ml-auto"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* ------------------------------------------------ como chegamos */}
          <Card>
            <CardHeader
              title="Como chegamos nesse número"
              description="O que cada pessoa desembolsou e o que de fato era dela."
            />
            <CardBody className="pt-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted">Pessoa</th>
                      <th className="pb-2 text-right font-medium text-muted">Pagou</th>
                      <th className="pb-2 text-right font-medium text-muted">Era dela</th>
                      <th className="pb-2 text-right font-medium text-muted">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlement.balances.map((balance) => (
                      <tr key={balance.membershipId} className="border-b border-border last:border-0">
                        <td className="py-3">
                          <span className="flex items-center gap-2">
                            <Avatar
                              name={balance.displayName}
                              color={balance.color}
                              size="xs"
                            />
                            <span className="font-medium text-fg">{balance.displayName}</span>
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Money
                            cents={balance.paidCents}
                            currency={currency}
                            tone="muted"
                            size="sm"
                          />
                        </td>
                        <td className="py-3 text-right">
                          <Money
                            cents={balance.owedCents}
                            currency={currency}
                            tone="muted"
                            size="sm"
                          />
                        </td>
                        <td className="py-3 text-right">
                          <Money
                            cents={balance.netCents}
                            currency={currency}
                            tone="auto"
                            signed
                            size="sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-muted">
                Saldo positivo significa que a pessoa bancou mais do que lhe cabia e tem a
                receber. Transferências entre contas de vocês não entram nesta conta — elas
                não criam dívida.
              </p>
            </CardBody>
          </Card>

          {/* --------------------------------------------------- histórico */}
          {history.length > 0 && (
            <Card>
              <CardHeader title="Acertos anteriores" />
              <CardBody className="pt-3">
                <ul className="space-y-3">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-fg">
                          {entry.lines
                            .map(
                              (line) =>
                                `${line.from.displayName} → ${line.to.displayName}`,
                            )
                            .join(', ')}
                        </p>
                        <p className="text-xs text-muted">
                          até {formatDateShort(entry.periodEnd)} ·{' '}
                          {entry._count.transactions} lançamento
                          {entry._count.transactions > 1 ? 's' : ''}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </p>
                      </div>
                      <Money
                        cents={entry.lines.reduce((acc, l) => acc + l.amountCents, 0)}
                        currency={currency}
                        tone="neutral"
                        size="sm"
                      />
                      <UndoSettlement spaceId={space.id} settlementId={entry.id} />
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        {/* ----------------------------------------------------- ação lateral */}
        <div>
          <Card className="lg:sticky lg:top-8">
            <CardBody className="space-y-4">
              <div>
                <p className="text-sm font-medium text-fg">Já se acertaram?</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  O Pix acontece fora daqui. Registrar o acerto marca as despesas
                  como pagas e zera o saldo em aberto.
                </p>
              </div>

              <SettleForm
                spaceId={space.id}
                periodStart={settlement.periodStart}
                disabled={settlement.isSettled || settlement.driftCents !== 0}
              />

              {settlement.isSettled && (
                <p className="text-center text-xs text-muted">
                  Não há nada a acertar agora.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
