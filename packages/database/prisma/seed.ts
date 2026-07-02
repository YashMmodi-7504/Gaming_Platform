/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

/**
 * Database seed script.
 *
 * No domain models exist yet, so this seed simply validates connectivity. As
 * models are introduced, add idempotent upserts here (roles, demo users,
 * game catalog, etc.).
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.info('🌱  Seeding database…');
  await prisma.$connect();
  console.info('✅  Connection verified. No models to seed yet.');
}

main()
  .catch((error) => {
    console.error('❌  Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
