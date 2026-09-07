import 'server-only';
import { db } from '@/lib/db';

/** Contas, categorias e etiquetas ativas — o que os formulários precisam oferecer. */
export async function getSpaceCatalog(spaceId: string) {
  const [accounts, categories, tags] = await Promise.all([
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
    db.tag.findMany({
      where: { spaceId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return { accounts, categories, tags };
}
