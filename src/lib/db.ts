/**
 * Cliente Prisma compartilhado.
 *
 * Em desenvolvimento o Next recarrega os módulos a cada mudança; sem o cache
 * global, cada reload abriria uma nova pool de conexões até estourar.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
