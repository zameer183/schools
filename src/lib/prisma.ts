import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const enableSlowQueryLogs = process.env.LOG_SLOW_QUERIES === '1';
const slowQueryThresholdMs = Number(process.env.SLOW_QUERY_MS ?? 500);

const prismaLogs: Prisma.PrismaClientOptions['log'] = enableSlowQueryLogs
  ? [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' }
    ]
  : process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogs
  });

if (enableSlowQueryLogs) {
  type QueryLogEvent = {
    duration: number;
    query: string;
    params: string;
  };
  const prismaWithQueryEvents = prisma as unknown as {
    $on(event: 'query', callback: (event: QueryLogEvent) => void): void;
  };

  prismaWithQueryEvents.$on('query', (event) => {
    if (event.duration >= slowQueryThresholdMs) {
      console.warn('[prisma][slow-query]', {
        durationMs: event.duration,
        thresholdMs: slowQueryThresholdMs,
        query: event.query,
        params: event.params
      });
    }
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
