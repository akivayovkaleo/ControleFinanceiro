/**
 * Entrega de um anexo.
 *
 * É o único lugar do app que devolve bytes que um usuário subiu, então é onde
 * mora o cuidado:
 *
 *  1. **Autorização primeiro.** O anexo só é lido depois de `requireSpace`
 *     confirmar que quem pede é membro do espaço dono dele. Sem isso, o id
 *     seria a senha — e um cuid é previsível demais para servir de segredo.
 *  2. **`nosniff` + Content-Type da lista de permissão.** Sem isso o navegador
 *     poderia interpretar um "PNG" como HTML e executá-lo no nosso domínio,
 *     com acesso ao cookie de sessão.
 *  3. **Nome de arquivo higienizado.** Ele vem do dispositivo da pessoa; solto
 *     no cabeçalho, permitiria injetar outros cabeçalhos.
 *  4. **PDF sempre baixa, imagem pode abrir.** PDF renderizado na página
 *     executa JavaScript em alguns leitores.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSpace } from '@/lib/auth/guard';
import { AuthorizationError } from '@/lib/errors';
import { isImage } from '@/lib/attachments';
import { readAttachment } from '@/server/storage';

/** Só o que a lista de permissão aceita volta como Content-Type. */
const SERVABLE = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

/**
 * Deixa no nome só o que é seguro dentro de um cabeçalho HTTP.
 *
 * Fora: caracteres de controle (CR e LF entre eles, que permitiriam injetar
 * outros cabeçalhos), aspas (que fechariam o valor mais cedo) e barras.
 *
 * Filtra por código do caractere em vez de regex: uma faixa de controle escrita
 * em regex é fácil de errar e difícil de revisar depois.
 */
function safeFilename(filename: string): string {
  const cleaned = Array.from(filename)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f) return false;
      return char !== '"' && char !== '\\' && char !== '/';
    })
    .join('')
    .trim();

  return cleaned.slice(0, 120) || 'anexo';
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const attachment = await db.attachment.findUnique({
    where: { id },
    select: {
      spaceId: true,
      filename: true,
      mimeType: true,
      storageKey: true,
    },
  });

  // Mesma resposta para "não existe" e "não é seu": distinguir as duas
  // confirmaria a existência de um anexo de outro espaço.
  if (!attachment) return new NextResponse('Não encontrado', { status: 404 });

  try {
    await requireSpace(attachment.spaceId);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return new NextResponse('Não encontrado', { status: 404 });
    }
    throw error;
  }

  if (!SERVABLE.has(attachment.mimeType)) {
    return new NextResponse('Tipo não suportado', { status: 415 });
  }

  let bytes: Buffer;
  try {
    bytes = await readAttachment(attachment.storageKey);
  } catch {
    // A linha existe mas o arquivo sumiu — um backup restaurado sem a pasta de
    // anexos, por exemplo. Melhor dizer isso do que estourar um 500 opaco.
    return new NextResponse('Arquivo não encontrado no armazenamento', { status: 410 });
  }

  const disposition = isImage(attachment.mimeType) ? 'inline' : 'attachment';

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': attachment.mimeType,
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': `${disposition}; filename="${safeFilename(attachment.filename)}"`,
      'X-Content-Type-Options': 'nosniff',
      // Conteúdo privado: não pode parar em cache compartilhado.
      'Cache-Control': 'private, max-age=0, must-revalidate',
      // Um anexo nunca deve rodar script nem ser embutido em outro site.
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
