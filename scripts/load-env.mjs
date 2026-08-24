/**
 * Carrega o `.env` para scripts avulsos.
 *
 * O CLI do Prisma e o Next carregam `.env` sozinhos. Um script rodado direto
 * (`tsx prisma/seed.ts`, `node scripts/reset-password.mjs`) NÃO — e o sintoma é
 * um erro obscuro do Prisma dizendo "Environment variable not found:
 * DATABASE_URL" no meio da primeira query.
 *
 * Parser mínimo de propósito: só o que um `.env` deste projeto precisa
 * (`CHAVE=valor`, aspas opcionais, comentários). Sem dependência nova.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadEnv(file = '.env') {
  const path = resolve(process.cwd(), file);

  if (!existsSync(path)) {
    console.error(`\n✗ Não encontrei o arquivo ${file}.\n`);
    console.error('  Rode `npm run setup` para criá-lo com um AUTH_SECRET novo.\n');
    process.exit(1);
  }

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    // Remove aspas envolventes, se houver.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Uma variável já definida no ambiente tem precedência sobre o arquivo —
    // é assim que Docker e systemd sobrescrevem a configuração local.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
