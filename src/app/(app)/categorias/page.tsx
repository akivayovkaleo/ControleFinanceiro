import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getActiveSpace, type SearchParams } from '@/lib/space-context';
import { PageHeader } from '@/components/app/page-header';
import { CategoryManager, type CategoryItem } from '@/components/catalog/category-manager';
import { TagManager, type TagView } from '@/components/catalog/tag-manager';
import { Card, CardBody, CardHeader } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Categorias' };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getActiveSpace(params);
  const { space } = context;

  const [categories, tags] = await Promise.all([
    db.category.findMany({
      where: { spaceId: space.id },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { transactions: true } } },
    }),
    db.tag.findMany({
      where: { spaceId: space.id },
      orderBy: { name: 'asc' },
      include: { _count: { select: { transactions: true } } },
    }),
  ]);

  const items: CategoryItem[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    color: c.color,
    archived: c.archived,
    transactionCount: c._count.transactions,
  }));

  const tagViews: TagView[] = tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    transactionCount: tag._count.transactions,
  }));

  return (
    <>
      <PageHeader
        title="Categorias"
        description="A linguagem do seu dinheiro. Clique numa categoria para renomear ou trocar a cor."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Despesas"
            description="Para onde o dinheiro vai"
          />
          <CardBody className="pt-3">
            <CategoryManager
              spaceId={space.id}
              kind="EXPENSE"
              categories={items.filter((c) => c.kind === 'EXPENSE')}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Receitas" description="De onde o dinheiro vem" />
          <CardBody className="pt-3">
            <CategoryManager
              spaceId={space.id}
              kind="INCOME"
              categories={items.filter((c) => c.kind === 'INCOME')}
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-5">
        <TagManager spaceId={space.id} tags={tagViews} />
      </div>

      <p className="mt-5 text-xs leading-relaxed text-muted">
        Categorias que já têm lançamentos são arquivadas em vez de excluídas — assim o
        histórico continua correto e os relatórios antigos não mudam.
      </p>
    </>
  );
}
