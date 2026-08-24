#!/usr/bin/env node
/**
 * Preparação da instalação.
 *
 * Cria o `.env` com um AUTH_SECRET forte na primeira execução. É deliberado
 * que o segredo seja GERADO e não venha com um valor padrão: um valor padrão
 * versionado seria o mesmo em toda instalação do mundo, o que torna qualquer
 * sessão forjável.
 *
 * Rodar de novo com o .env existente não sobrescreve nada.
 */

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_PATH = resolve(process.cwd(), '.env');

function generateSecret() {
  return randomBytes(48).toString('base64url');
}

const TEMPLATE = `# Gerado por "npm run setup". NÃO versione este arquivo.

# Banco de dados (SQLite por padrão — um arquivo, zero configuração).
DATABASE_URL="file:./dev.db"

# Chave de assinatura das sessões. Trocar esta chave desloga todo mundo.
AUTH_SECRET="__SECRET__"

# Duração da sessão, em dias.
SESSION_DAYS=30

# Depois que você e quem mais for usar já tiverem conta, mude para "true"
# e sua instalação para de aceitar novos cadastros.
DISABLE_SIGNUP=false

# Opcional: só estes e-mails podem se cadastrar (separados por vírgula).
# ALLOWED_EMAILS="voce@exemplo.com,alguem@exemplo.com"

# Opcional: URL pública da instalação.
# APP_URL="https://financeiro.suacasa.dev"
`;

function main() {
  if (existsSync(ENV_PATH)) {
    const current = readFileSync(ENV_PATH, 'utf8');

    if (/^AUTH_SECRET="?.{32,}"?$/m.test(current)) {
      console.log('✓ .env já existe e tem AUTH_SECRET. Nada a fazer.');
      return;
    }

    const updated = current.includes('AUTH_SECRET')
      ? current.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${generateSecret()}"`)
      : `${current.trimEnd()}\nAUTH_SECRET="${generateSecret()}"\n`;

    writeFileSync(ENV_PATH, updated);
    console.log('✓ AUTH_SECRET gerado e gravado no .env existente.');
    return;
  }

  writeFileSync(ENV_PATH, TEMPLATE.replace('__SECRET__', generateSecret()));
  console.log('✓ .env criado com um AUTH_SECRET novo.');
  console.log('');
  console.log('Próximos passos:');
  console.log('  npm run db:deploy   # cria as tabelas');
  console.log('  npm run dev         # sobe o app em http://localhost:3000');
}

main();
