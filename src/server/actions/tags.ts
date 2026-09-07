'use server';

/**
 * Etiquetas.
 *
 * A categoria diz "que tipo de gasto é este"; a etiqueta diz "a que isso se
 * refere" — a viagem ao Chile, a obra do banheiro. São coisas diferentes, então
 * uma não substitui a outra.
 *
 * A ligação `TransactionTag` carrega `spaceId` e o banco exige que as duas
 * pontas concordem nele (chave estrangeira composta). Ainda assim as checagens
 * abaixo existem: a do banco evita a corrupção, estas dão a mensagem legível.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { requireSpace } from '@/lib/auth/guard';
import { deleteTagSchema, setTransactionTagsSchema, tagSchema } from '@/lib/validation/tags';
import { KnownError, parseForm, runAction, success, type ActionState } from './result';

export async function saveTagAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(tagSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    const duplicate = await db.tag.findFirst({
      where: { spaceId: data.spaceId, name: data.name, ...(data.tagId ? { NOT: { id: data.tagId } } : {}) },
      select: { id: true },
    });
    if (duplicate) {
      throw new KnownError('Já existe uma etiqueta com esse nome.', { name: 'Nome repetido' });
    }

    if (data.tagId) {
      const updated = await db.tag.updateMany({
        where: { id: data.tagId, spaceId: data.spaceId },
        data: { name: data.name, color: data.color },
      });
      if (updated.count === 0) throw new KnownError('Etiqueta não encontrada.');
    } else {
      await db.tag.create({
        data: { spaceId: data.spaceId, name: data.name, color: data.color },
      });
    }

    await audit({
      action: data.tagId ? 'tag.update' : 'tag.create',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'tag',
      entityId: data.tagId ?? undefined,
      meta: { name: data.name },
    });

    revalidatePath('/categorias');
    revalidatePath('/lancamentos');
    return success(data.tagId ? 'Etiqueta atualizada.' : `Etiqueta "${data.name}" criada.`);
  });
}

export async function deleteTagAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(deleteTagSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    const tag = await db.tag.findFirst({
      where: { id: data.tagId, spaceId: data.spaceId },
      select: { name: true },
    });
    if (!tag) throw new KnownError('Etiqueta não encontrada.');

    // Cascade tira a etiqueta dos lançamentos; os lançamentos ficam.
    await db.tag.deleteMany({ where: { id: data.tagId, spaceId: data.spaceId } });

    await audit({
      action: 'tag.delete',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'tag',
      entityId: data.tagId,
      meta: { name: tag.name },
    });

    revalidatePath('/categorias');
    revalidatePath('/lancamentos');
    return success(`Etiqueta "${tag.name}" removida.`);
  });
}

/** Substitui de uma vez as etiquetas de um lançamento. */
export async function setTransactionTagsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(setTransactionTagsSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    await requireSpace(data.spaceId);

    const transaction = await db.transaction.findFirst({
      where: { id: data.transactionId, spaceId: data.spaceId },
      select: { id: true },
    });
    if (!transaction) throw new KnownError('Lançamento não encontrado.');

    // Toda etiqueta pedida precisa ser deste space. Um id de fora não é
    // "ignorado em silêncio": é erro, porque significa que algo está errado.
    if (data.tagIds.length > 0) {
      const found = await db.tag.count({
        where: { id: { in: data.tagIds }, spaceId: data.spaceId },
      });
      if (found !== data.tagIds.length) {
        throw new KnownError('Alguma etiqueta não pertence a este espaço.');
      }
    }

    await db.$transaction([
      db.transactionTag.deleteMany({
        where: { transactionId: data.transactionId, spaceId: data.spaceId },
      }),
      db.transactionTag.createMany({
        data: data.tagIds.map((tagId) => ({
          spaceId: data.spaceId,
          transactionId: data.transactionId,
          tagId,
        })),
      }),
    ]);

    revalidatePath('/lancamentos');
    return success('Etiquetas atualizadas.');
  });
}
