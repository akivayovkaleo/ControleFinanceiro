import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  extensionFor,
  formatBytes,
  isImage,
  isSafeStorageKey,
  ALLOWED_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
} from '@/lib/attachments';

/**
 * O armazenamento lê `ATTACHMENTS_DIR` do ambiente validado, que exige
 * DATABASE_URL e AUTH_SECRET. Preenche-se tudo antes de importar o módulo,
 * apontando para uma pasta temporária: nenhum teste escreve na pasta real.
 */
let dir: string;
let storage: typeof import('@/server/storage');

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'anexos-teste-'));
  process.env.DATABASE_URL ??= 'file:./test.db';
  process.env.AUTH_SECRET ??= 'x'.repeat(48);
  process.env.ATTACHMENTS_DIR = dir;
  storage = await import('@/server/storage');
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('isSafeStorageKey — a barreira contra travessia de caminho', () => {
  const perigosas = [
    '../../.env',
    '..\\..\\.env',
    '/etc/passwd',
    'C:\\Windows\\System32\\config',
    'a/b.png',
    'sub/dir/arquivo.png',
    'sem-extensao',
    '.env',
    '..',
    '.',
    'arquivo.png/../../../etc/passwd',
    'arq uivo.png',
    'arquivo.png\u0000.txt',
  ];

  it.each(perigosas)('recusa %j', (key) => {
    expect(isSafeStorageKey(key)).toBe(false);
  });

  it('aceita a forma que o próprio servidor gera', () => {
    expect(isSafeStorageKey('a1b2c3d4e5f6.png')).toBe(true);
    expect(isSafeStorageKey('DEADBEEF-_1.pdf')).toBe(true);
  });
});

describe('extensionFor', () => {
  it('mapeia cada tipo aceito para uma extensão', () => {
    for (const [mime, ext] of Object.entries(ALLOWED_MIME_TYPES)) {
      expect(extensionFor(mime)).toBe(ext);
    }
  });

  it('recusa o que está fora da lista', () => {
    // SVG é XML e executa script — fica de fora de propósito.
    expect(extensionFor('image/svg+xml')).toBeNull();
    expect(extensionFor('text/html')).toBeNull();
    expect(extensionFor('application/octet-stream')).toBeNull();
    expect(extensionFor('')).toBeNull();
  });
});

describe('formatBytes', () => {
  it('escolhe a unidade que a pessoa consegue ler', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3,0 MB');
  });
});

describe('isImage', () => {
  it('separa imagem de PDF', () => {
    expect(isImage('image/png')).toBe(true);
    expect(isImage('application/pdf')).toBe(false);
  });
});

describe('armazenamento em disco', () => {
  it('guarda e devolve os mesmos bytes', async () => {
    const conteudo = Buffer.from('%PDF-1.4 comprovante');
    const stored = await storage.storeAttachment(conteudo, 'application/pdf');

    expect(isSafeStorageKey(stored.storageKey)).toBe(true);
    expect(stored.sizeBytes).toBe(conteudo.byteLength);

    const lido = await storage.readAttachment(stored.storageKey);
    expect(lido.equals(conteudo)).toBe(true);

    await storage.deleteAttachment(stored.storageKey);
  });

  it('gera chave diferente a cada gravação, mesmo para bytes iguais', async () => {
    const a = await storage.storeAttachment(Buffer.from('igual'), 'image/png');
    const b = await storage.storeAttachment(Buffer.from('igual'), 'image/png');

    expect(a.storageKey).not.toBe(b.storageKey);
    // Mesmo conteúdo, mesmo hash — é o que permitiria detectar duplicata.
    expect(a.sha256).toBe(b.sha256);

    await storage.deleteAttachment(a.storageKey);
    await storage.deleteAttachment(b.storageKey);
  });

  it('recusa tipo fora da lista de permissão', async () => {
    await expect(storage.storeAttachment(Buffer.from('<svg/>'), 'image/svg+xml')).rejects.toThrow();
  });

  it('não lê nada fora da pasta de anexos', async () => {
    // Um arquivo real logo acima da pasta, para o teste não passar só porque
    // o alvo não existia.
    const alvo = join(dir, '..', 'segredo-do-teste.txt');
    await writeFile(alvo, 'nao deveria vazar');

    for (const key of ['../segredo-do-teste.txt', '..\\segredo-do-teste.txt', '/etc/passwd']) {
      await expect(storage.readAttachment(key)).rejects.toThrow();
    }

    await rm(alvo, { force: true });
  });

  it('apagar duas vezes não é erro — o objetivo já foi atingido', async () => {
    const stored = await storage.storeAttachment(Buffer.from('x'), 'image/png');
    await storage.deleteAttachment(stored.storageKey);
    await expect(storage.deleteAttachment(stored.storageKey)).resolves.toBeUndefined();
    await expect(storage.readAttachment(stored.storageKey)).rejects.toThrow();
  });

  it('não deixa arquivo para trás depois de apagar', async () => {
    const antes = (await readdir(dir)).length;
    const stored = await storage.storeAttachment(Buffer.from('temporario'), 'image/webp');
    expect((await readdir(dir)).length).toBe(antes + 1);
    await storage.deleteAttachment(stored.storageKey);
    expect((await readdir(dir)).length).toBe(antes);
  });
});

describe('limites', () => {
  it('o teto é 8 MB — comprovante fotografado cabe, vídeo não', () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(8 * 1024 * 1024);
  });
});
