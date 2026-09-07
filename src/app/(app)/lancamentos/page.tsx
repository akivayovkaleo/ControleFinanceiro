import type { Metadata } from 'next';
import Link from 'next/link';
import { CreditCard, Plus, Receipt } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveSpace, firstParam, type SearchParams } from '@/lib/space-context';
import { currentMonthKey, monthRange, parseMonthKey } from '@/lib/date';
import { getSpaceCatalog } from '@/server/queries/catalog';
import { getCategoryIdsForBuilding } from '@/server/queries/village';
import { CATEGORY_LABELS } from '@/lib/village/catalog';
import { parseBuildingCategory, VILLAGE_PARAM } from '@/lib/village/layout';
import { PageHeader } from '@/components/app/page-header';
import { MonthPicker } from '@/components/app/month-picker';
import { FilterBar } from '@/components/transactions/filter-bar';
import { TransactionList } from '@/components/transactions/transaction-list';
import { Card, CardBody, EmptyState } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';

export const metadata: Metadata = { title: 'Lançamentos' };

/** Teto por página. Um casal raramente passa disso num mês. */
const PAGE_SIZE = 200;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { space, members, isShared } = context;

  const requestedMonth = firstParam(params, 'mes');
  const month = requestedMonth && parseMonthKey(requestedMonth) ? requestedMonth : currentMonthKey();
  const { start, end } = monthRange(month, space.monthStartDay);

  const type = firstParam(params, 'tipo');
  const categoryId = firstParam(params, 'categoria');
  const accountId = firstParam(params, 'conta');
  const membershipId = firstParam(params, 'pessoa');
  const search = firstParam(params, 'busca');

  // Filtro vindo do mapa da vila: um prédio agrupa várias categorias, então
  // `?vila=casa` vira uma lista de ids. Um `?categoria=` explícito continua
  // mandando — ele é mais específico que o prédio.
  const building = parseBuildingCategory(firstParam(params, VILLAGE_PARAM));
  const buildingCategoryIds =
    building && !categoryId ? await getCategoryIdsForBuilding(space.id, building) : null;

  const where: Prisma.TransactionWhereInput = {
    spaceId: space.id,
    date: { gte: start, lt: end },
    ...(type === 'INCOME' || type === 'EXPENSE' || type === 'TRANSFER' ? { type } : {}),
    ...(categoryId
      ? { categoryId }
      : buildingCategoryIds
        ? { categoryId: { in: buildingCategoryIds } }
        : {}),
    ...(accountId ? { OR: [{ accountId }, { toAccountId: accountId }] } : {}),
    ...(membershipId ? { paidByMembershipId: membershipId } : {}),
    // SQLite no Prisma não suporta `mode: 'insensitive'`; o collation padrão
    // do SQLite já é case-insensitive para ASCII, que cobre o uso real aqui.
    ...(search ? { description: { contains: search } } : {}),
  };

  const [transactions, totals, catalog] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: PAGE_SIZE,
      select: {
        id: true,
        type: true,
        amountCents: true,
        date: true,
        description: true,
        splitMode: true,
        settlementId: true,
        category: { select: { name: true, color: true } },
        account: { select: { name: true, color: true } },
        toAccount: { select: { name: true } },
        paidBy: { select: { displayName: true, color: true } },
        shares: { select: { membershipId: true, amountCents: true } },
        installmentNumber: true,
        installmentTotal: true,
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
      },
    }),
    db.transaction.groupBy({
      by: ['type'],
      where,
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    getSpaceCatalog(space.id),
  ]);

  // A tabela de ligação devolve { tag: {...} }; a linha do extrato quer a
  // etiqueta direta.
  const rows = transactions.map((transaction) => ({
    ...transaction,
    tags: transaction.tags.map((link) => link.tag),
  }));

  const incomeCents = totals.find((t) => t.type === 'INCOME')?._sum.amountCents ?? 0;
  const expenseCents = totals.find((t) => t.type === 'EXPENSE')?._sum.amountCents ?? 0;
  const totalCount = totals.reduce((acc, t) => acc + t._count._all, 0);

  return (
    <>
      <PageHeader
        title="Lançamentos"
        description={`${totalCount} ${totalCount === 1 ? 'registro' : 'registros'} nesta competência`}
        action={
          <div className="flex items-center gap-2">
            <MonthPicker month={month} />
            <Link href={{ pathname: '/lancamentos/parcelado', query: { space: space.id } }}>
              <Button variant="outline" size="icon" aria-label="Compra parcelada" className="lg:hidden">
                <CreditCard className="h-4 w-4" aria-hidden />
              </Button>
              <Button variant="outline" className="hidden lg:inline-flex">
                <CreditCard className="h-4 w-4" aria-hidden />
                Parcelar
              </Button>
            </Link>
            <Link href={{ pathname: '/lancamentos/novo', query: { space: space.id } }}>
              <Button size="icon" aria-label="Novo lançamento" className="lg:hidden">
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
              <Button className="hidden lg:inline-flex">
                <Plus className="h-4 w-4" aria-hidden />
                Novo
              </Button>
            </Link>
          </div>
        }
      />

      {building && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-border bg-brand-soft px-4 py-2.5 text-sm">
          <span className="text-fg">
            Mostrando só o prédio <strong className="font-semibold">{CATEGORY_LABELS[building]}</strong> da vila.
          </span>
          <Link
            href={{ pathname: '/lancamentos', query: { space: space.id, mes: month } }}
            className="font-medium text-brand hover:underline"
          >
            Ver tudo
          </Link>
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="card px-4 py-3">
          <p className="text-xs text-muted">Receitas</p>
          <Money cents={incomeCents} currency={space.currency} tone="income" size="sm" />
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs text-muted">Despesas</p>
          <Money cents={expenseCents} currency={space.currency} tone="expense" size="sm" />
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs text-muted">Resultado</p>
          <Money
            cents={incomeCents - expenseCents}
            currency={space.currency}
            tone="auto"
            size="sm"
          />
        </div>
      </div>

      <FilterBar
        categories={catalog.categories}
        accounts={catalog.accounts}
        members={members.map((m) => ({ id: m.id, displayName: m.displayName }))}
      />

      <Card>
        <CardBody>
          {transactions.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-6 w-6" aria-hidden />}
              title="Nada por aqui"
              description="Não há lançamentos nesta competência com os filtros escolhidos."
              action={
                <Link href={{ pathname: '/lancamentos/novo', query: { space: space.id } }}>
                  <Button>
                    <Plus className="h-4 w-4" aria-hidden />
                    Registrar lançamento
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              <TransactionList
                transactions={rows}
                currency={space.currency}
                spaceId={space.id}
                showSplit={isShared}
              />
              {transactions.length === PAGE_SIZE && (
                <p className="mt-5 text-center text-xs text-muted">
                  Mostrando os {PAGE_SIZE} lançamentos mais recentes desta competência.
                  Use os filtros para refinar.
                </p>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
}
