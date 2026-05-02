// Single source of truth for the Prisma client across the monorepo.
// Wraps the Next.js singleton pattern so dev hot-reload doesn't open
// new pools every reload.

export * from '../generated/client';
export { Prisma, PrismaClient } from '../generated/client';

import { PrismaClient } from '../generated/client';

type GlobalWithPrisma = typeof globalThis & { __veritrust_prisma__?: PrismaClient };
const globalForPrisma = globalThis as GlobalWithPrisma;

export const prisma: PrismaClient =
  globalForPrisma.__veritrust_prisma__ ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'production' ? ['error'] : ['error', 'warn'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.__veritrust_prisma__ = prisma;
}
