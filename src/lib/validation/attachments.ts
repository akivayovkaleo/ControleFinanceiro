/**
 * Validação de anexos.
 *
 * O arquivo em si não passa por aqui: `parseForm` ignora `File`, e a checagem
 * de tamanho e tipo é feita na action, sobre os bytes recebidos. Ver
 * src/lib/attachments.ts para a política.
 */

import { z } from 'zod';
import { cuid } from './shared';

export const deleteAttachmentSchema = z.object({
  spaceId: cuid,
  attachmentId: cuid,
});
