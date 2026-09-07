/**
 * Política de anexos.
 *
 * Vive aqui, e não junto das Server Actions, por duas razões: um arquivo
 * `'use server'` só pode exportar funções assíncronas — cada export vira um
 * endpoint —, e o cliente precisa dos mesmos limites para avisar antes de a
 * pessoa subir 30 MB à toa.
 *
 * A validação do cliente é cortesia. A que decide é a do servidor, que roda de
 * novo sobre os bytes que realmente chegaram.
 */

/** 8 MB. Um comprovante fotografado cabe folgado; um vídeo não passa. */
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export const MAX_ATTACHMENT_MB = Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024));

/** No máximo por lançamento. Comprovante e nota fiscal cobrem quase tudo. */
export const MAX_ATTACHMENTS_PER_TRANSACTION = 5;

/**
 * Tipos aceitos e a extensão com que ficam guardados.
 *
 * É uma lista de permissão, não de bloqueio: qualquer coisa fora dela é
 * recusada. Sem SVG de propósito — SVG é XML, executa script, e seria servido
 * do mesmo domínio da aplicação.
 */
export const ALLOWED_MIME_TYPES: Readonly<Record<string, string>> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'application/pdf': '.pdf',
};

export const ALLOWED_MIME_LABEL = 'JPG, PNG, WebP, HEIC ou PDF';

/** Para o atributo `accept` do input de arquivo. */
export const ACCEPT_ATTRIBUTE = [
  ...Object.keys(ALLOWED_MIME_TYPES),
  ...Object.values(ALLOWED_MIME_TYPES),
].join(',');

export function extensionFor(mimeType: string): string | null {
  return ALLOWED_MIME_TYPES[mimeType] ?? null;
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/**
 * Confere que a chave de armazenamento é só um nome de arquivo inofensivo.
 *
 * A chave é gerada pelo servidor e nunca vem do usuário, então isto é uma
 * segunda barreira — mas é a barreira que impede um `../../.env` de virar um
 * caminho válido se algum dia alguém passar a montá-la de outro jeito.
 */
export function isSafeStorageKey(key: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9]{1,8}$/.test(key);
}
