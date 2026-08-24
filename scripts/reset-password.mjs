#!/usr/bin/env node
/**
 * Redefinição de senha pela linha de comando.
 *
 * Substitui o fluxo de "esqueci minha senha" por e-mail: numa instalação
 * caseira, depender de SMTP é depender de algo que quebra em silêncio. Aqui
 * quem tem acesso ao servidor consegue resolver em dez segundos.
 *
 * Uso: npm run senha -- pessoa@exemplo.com
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error('Uso: npm run senha -- pessoa@exemplo.com');
  process.exit(1);
}

const { PrismaClient } = await import('@prisma/client');
const { hash } = await import('@node-rs/argon2');

const db = new PrismaClient();

try {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    console.error(`Nenhuma conta com o e-mail "${email}".`);
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const password = await rl.question(`Nova senha para ${user.name} <${user.email}>: `);
  rl.close();

  if (password.trim().length < 10) {
    console.error('A senha precisa ter pelo menos 10 caracteres.');
    process.exit(1);
  }

  // Mesmos parâmetros de src/lib/auth/password.ts (OWASP: m=19MiB, t=2, p=1).
  const passwordHash = await hash(password, {
    algorithm: 2, // Argon2id
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    // Toda sessão aberta cai: se a senha foi redefinida, é porque algo
    // aconteceu e ninguém deveria continuar logado com a credencial antiga.
    db.session.deleteMany({ where: { userId: user.id } }),
    db.loginAttempt.deleteMany({}),
  ]);

  console.log('✓ Senha alterada. Todas as sessões dessa conta foram encerradas.');
} finally {
  await db.$disconnect();
}
