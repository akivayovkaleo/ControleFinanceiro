/**
 * Armazenamento dos anexos em disco.
 *
 * Uma camada fina de propósito: o resto do app só conhece `storageKey`, uma
 * string opaca. Trocar disco por S3 um dia significa reescrever este arquivo e
 * mais nada.
 *
 * REGRA QUE ESTE ARQUIVO EXISTE PARA GARANTIR: nenhum caminho é montado a
 * partir de texto que veio do usuário. A chave é gerada aqui, validada contra
 * um formato estrito, e o caminho final é conferido para ter certeza de que
 * caiu mesmo dentro da pasta de anexos. Um nome de arquivo como
 * `../../.env` não tem como virar um caminho válido.
 */

import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { env } from '@/lib/env';
import { extensionFor, isSafeStorageKey } from '@/lib/attachments';

/** Raiz dos anexos, sempre absoluta. */
function root(): string {
  const configured = env().ATTACHMENTS_DIR;
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

/**
 * Caminho absoluto de uma chave, garantidamente dentro da pasta de anexos.
 *
 * A checagem final não é redundante com `isSafeStorageKey`: é a que continua
 * valendo se o formato da chave mudar um dia. Barato, e é a diferença entre
 * ler um comprovante e ler o `.env`.
 */
function pathFor(storageKey: string): string {
  if (!isSafeStorageKey(storageKey)) {
    throw new Error('Chave de anexo inválida.');
  }

  const base = root();
  const full = resolve(base, storageKey);

  if (full !== join(base, storageKey) || !full.startsWith(base + sep)) {
    throw new Error('Chave de anexo inválida.');
  }
  return full;
}

/** Chave nova e imprevisível. Aleatória, não derivada do nome original. */
function newStorageKey(mimeType: string): string {
  const extension = extensionFor(mimeType);
  if (!extension) throw new Error('Tipo de arquivo não aceito.');
  return `${randomBytes(24).toString('hex')}${extension}`;
}

export interface StoredFile {
  storageKey: string;
  sizeBytes: number;
  /** SHA-256 do conteúdo. Útil para detectar o mesmo comprovante subido duas vezes. */
  sha256: string;
}

export async function storeAttachment(bytes: Buffer, mimeType: string): Promise<StoredFile> {
  const storageKey = newStorageKey(mimeType);
  const base = root();

  await mkdir(base, { recursive: true });
  // `wx` falha se o arquivo já existir, em vez de sobrescrever em silêncio.
  await writeFile(pathFor(storageKey), bytes, { flag: 'wx' });

  return {
    storageKey,
    sizeBytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

export async function readAttachment(storageKey: string): Promise<Buffer> {
  return readFile(pathFor(storageKey));
}

/**
 * Apaga o arquivo. Um arquivo que já não existe não é erro: o objetivo é que
 * ele deixe de existir, e nesse caso já deixou.
 */
export async function deleteAttachment(storageKey: string): Promise<void> {
  try {
    await unlink(pathFor(storageKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
