import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

// Support both DATABASE_URL and separate MYSQL_* environment variables (common in Domainesia cPanel)
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.MYSQL_USER && process.env.MYSQL_DATABASE) {
  const user = encodeURIComponent(process.env.MYSQL_USER);
  const pass = encodeURIComponent(process.env.MYSQL_PASSWORD || '');
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = process.env.MYSQL_PORT || '3306';
  const db = process.env.MYSQL_DATABASE;
  databaseUrl = `mysql://${user}:${pass}@${host}:${port}/${db}`;
  process.env.DATABASE_URL = databaseUrl;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

globalForPrisma.prisma = prisma;

export default prisma;
