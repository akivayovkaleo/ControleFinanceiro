import 'server-only';
import { db } from '@/lib/db';

/** Contas e categorias ativas — o que os formulários precisam oferecer. */
export async function getSpaceCatalog(spaceId: string) {
  const [accounts, categories] = await Promise.all([
    db.account.findMany({
      where: { spaceId, archived: false },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, type: true, color: true },
    }),
    db.category.findMany({
      where: { spaceId, archived: false },
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, kind: true, color: true },
    }),
  ]);

  return { accounts, categories };
}
