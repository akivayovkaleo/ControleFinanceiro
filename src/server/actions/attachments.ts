'use server';

/**
 * Anexos: subir e remover comprovantes.
 *
 * `parseForm` ignora `File` de propósito (FormData é `string | File`, e os
 * schemas trabalham com texto), então o arquivo é lido direto do FormData aqui
 * e validado à mão — sobre os bytes que realmente chegaram, não sobre o que o
 * navegador disse que ia mandar.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { requireSpace } from '@/lib/auth/guard';
import {
  extensionFor,
  formatBytes,
  MAX_ATTACHMENTS_PER_TRANSACTION,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_MB,
  ALLOWED_MIME_LABEL,
} from '@/lib/attachments';
import { deleteAttachment, storeAttachment } from '@/server/storage';
import { deleteAttachmentSchema } from '@/lib/validation/attachments';
import { KnownError, parseForm, runAction, success, type ActionState } from './result';

export async function uploadAttachmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const spaceId = String(formData.get('spaceId') ?? '');
    const transactionId = String(formData.get('transactionId') ?? '');
    if (!spaceId || !transactionId) throw new KnownError('Lançamento não informado.');

    const context = await requireSpace(spaceId);

    const transaction = await db.transaction.findFirst({
      where: { id: transactionId, spaceId },
      select: { id: true, description: true },
    });
    if (!transaction) throw new KnownError('Lançamento não encontrado.');

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      throw new KnownError('Escolha um arquivo.', { file: 'Nenhum arquivo' });
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new KnownError(
        `O arquivo tem ${formatBytes(file.size)}. O limite é ${MAX_ATTACHMENT_MB} MB.`,
        { file: 'Arquivo grande demais' },
      );
    }

    if (!extensionFor(file.type)) {
      throw new KnownError(`Formato não aceito. Use ${ALLOWED_MIME_LABEL}.`, {
        file: 'Formato não aceito',
      });
    }

    const existing = await db.attachment.count({ where: { transactionId, spaceId } });
    if (existing >= MAX_ATTACHMENTS_PER_TRANSACTION) {
      throw new KnownError(
        `Um lançamento aceita no máximo ${MAX_ATTACHMENTS_PER_TRANSACTION} anexos.`,
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // Confere o tamanho de novo, agora sobre os bytes que chegaram: `file.size`
    // é o que o cliente declarou, e o que importa é o que foi recebido.
    if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new KnownError(`O arquivo passa de ${MAX_ATTACHMENT_MB} MB.`, {
        file: 'Arquivo grande demais',
      });
    }

    const stored = await storeAttachment(bytes, file.type);

    try {
      await db.attachment.create({
        data: {
          spaceId,
          transactionId,
          // `.name` vem do dispositivo da pessoa: é dado exibido, nunca caminho.
          filename: file.name.slice(0, 200),
          mimeType: file.type,
          sizeBytes: stored.sizeBytes,
          storageKey: stored.storageKey,
          uploadedByMembershipId: context.membership.id,
        },
      });
    } catch (error) {
      // O arquivo já está em disco; sem a linha no banco ele seria lixo órfão
      // que ninguém mais consegue encontrar nem apagar.
      await deleteAttachment(stored.storageKey);
      throw error;
    }

    await audit({
      action: 'attachment.create',
      userId: context.user.id,
      spaceId,
      entity: 'attachment',
      entityId: transactionId,
      meta: { filename: file.name, sizeBytes: stored.sizeBytes },
    });

    revalidatePath(`/lancamentos/${transactionId}`);
    return success('Comprovante anexado.');
  });
}

export async function deleteAttachmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = parseForm(deleteAttachmentSchema, formData);
    if (!parsed.ok) return parsed.state;

    const data = parsed.data;
    const context = await requireSpace(data.spaceId);

    const attachment = await db.attachment.findFirst({
      where: { id: data.attachmentId, spaceId: data.spaceId },
      select: { id: true, filename: true, storageKey: true, transactionId: true },
    });
    if (!attachment) throw new KnownError('Anexo não encontrado.');

    // Primeiro o banco, depois o disco: se o disco falhar, sobra um arquivo
    // órfão (chato); na ordem inversa, sobraria uma linha apontando para um
    // arquivo que não existe (quebrado na tela).
    await db.attachment.deleteMany({ where: { id: data.attachmentId, spaceId: data.spaceId } });
    await deleteAttachment(attachment.storageKey);

    await audit({
      action: 'attachment.delete',
      userId: context.user.id,
      spaceId: data.spaceId,
      entity: 'attachment',
      entityId: attachment.transactionId,
      meta: { filename: attachment.filename },
    });

    revalidatePath(`/lancamentos/${attachment.transactionId}`);
    return success('Comprovante removido.');
  });
}
