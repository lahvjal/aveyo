// MySQL Prisma Client Instance
// This file creates a singleton Prisma Client instance to be used across the application

import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit during hot reloading in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('✅ MySQL database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database:', error);
    return false;
  }
}

// Gracefully disconnect on application shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

