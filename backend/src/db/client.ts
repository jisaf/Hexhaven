import { PrismaClient } from '@prisma/client';
// import { enablePerformanceMonitoring } from './performance';

// Prisma client singleton pattern
// Prevents multiple instances in development with hot reloading

declare global {
  // Allow global variable for development
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Enable performance monitoring
// TODO: Fix prisma.$use() compatibility with Prisma v6
// if (process.env.NODE_ENV === 'development') {
//   enablePerformanceMonitoring(prisma);
// }

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
