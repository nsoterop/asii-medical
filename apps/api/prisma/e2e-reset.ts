import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { runSeed } from './seed';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

if (process.env.E2E_USER_PASSWORD && !process.env.SEED_USER_PASSWORD) {
  process.env.SEED_USER_PASSWORD = process.env.E2E_USER_PASSWORD;
}
if (process.env.E2E_USER_EMAIL && !process.env.SEED_USER_EMAIL) {
  process.env.SEED_USER_EMAIL = process.env.E2E_USER_EMAIL;
}

const prisma = new PrismaClient();

const resetDatabase = async () => {
  await prisma.orderStatusEvent.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.importRowError.deleteMany();
  await prisma.importRun.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.categoryPath.deleteMany();
  await prisma.manufacturer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.profile.deleteMany();
};

const run = async () => {
  try {
    await resetDatabase();
    await runSeed();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

void run();
